<script lang="ts">
  import { DEFAULT_FORMATS_PER_GRANULARITY } from "@/constants";
  import {
    ensureFolderExists,
    notesWithFormatIn,
    type IGranularity,
  } from "@/io";
  import { validateFormat } from "@/io/validation";
  import { settingsStore, type TFormat, type PeriodSettings } from "@/settings";
  import { Button } from "@/ui/components/core";
  import { createConfirmationDialog } from "@/ui/modals/confirmation";
  import { type INotesContext } from "@/ui/types";
  import { cn, genNoticeFragment } from "@/ui/utils";
  import { Notice, debounce, normalizePath, setIcon, TFile } from "obsidian";
  import { renameForFormat } from "@/periods";
  import { weekSchemeFor } from "@/weeks";
  import { getContext, onMount } from "svelte";
  import { type Writable } from "svelte/store";
  import DeleteFormatText from "./DeleteFormatText.svelte";
  import DeleteFormatNote from "./DeleteFormatNote.svelte";
  import FilepathsCount from "./FilepathsCount.svelte";
  import ReplaceAllTitle from "./ReplaceAllTitle.svelte";
  import ReplaceAllText from "./ReplaceAllText.svelte";
  import ReplaceAllNote from "./ReplaceAllNote.svelte";
  import { v4 as uuidv4 } from "uuid";
  import { PluginService } from "@/app-service";

  interface Props {
    settings: Writable<PeriodSettings>;
    format?: PeriodSettings["formats"][number];
    granularity?: IGranularity;
    type?: "default" | "skeleton";
  }

  let {
    settings,
    format = {
      id: "",
      value: "",
      error: "",
      loading: false,
    },
    granularity = "day",
    type = "default",
  }: Props = $props();

  const defaultFormat = $derived(DEFAULT_FORMATS_PER_GRANULARITY[granularity]);
  let removeBttnEl: HTMLElement;
  let replaceBttnEl: HTMLElement;
  let labelEl: HTMLLabelElement;

  // the input edits its own copy, seeded once from the saved format (the list is keyed by format id)
  // svelte-ignore state_referenced_locally
  let value = $state(format.value || "");
  // svelte-ignore state_referenced_locally
  let error = $state(format.error || "");
  // Calendared: follow the saved format when it changes from elsewhere (e.g. the weekly "Use GGGG-[W]WW" button),
  // except while this field is being edited, so typing is never overwritten
  let textInputEl: HTMLInputElement | undefined = $state();
  // svelte-ignore state_referenced_locally
  let lastSavedValue = format.value;
  $effect.pre(() => {
    if (format.value === lastSavedValue) return;
    lastSavedValue = format.value;
    if (textInputEl && document.activeElement === textInputEl) return;
    value = format.value;
    error = format.error;
  });
  let selected = $state(false);
  $effect.pre(() => {
    selected =
      type === "skeleton" ? false : format.id === $settings.selectedFormat.id;
  });
  let { triggerRerender } = getContext<INotesContext>("notesContext");
  const formatId = $derived(format.id);

  // Calendared: counted from the vault while shown (docs/state.md, ADR-S2); upstream kept the list in data.json
  let filesCount = $derived(notesWithFormatIn(granularity, format.value, $settingsStore).length);

  // Calendared: weekly names come from the week scheme (the row's Monday), not from today's date
  const previewName = (formatValue: string) => {
    if (granularity !== "week") return window.moment().format(formatValue);
    const weeks = weekSchemeFor($settingsStore.localeSettings);
    return weeks.format(weeks.weekOf(window.moment()), formatValue);
  };
  // Calendared: say what each format is for. The selected one names new notes; the others only let notes named with
  // them be recognized, and clicking one makes it the format for new notes
  let formatRole = $derived(
    type === "skeleton" || !value.trim()
      ? ""
      : selected
        ? "used for new notes"
        : "also recognized · click to use for new notes",
  );

  function setLoading(loading: boolean, all: boolean = false) {
    if (all) {
      settings.update((s) => {
        for (const f of Object.values(s.formats)) {
          s.formats[f.id].loading = loading;
        }
        return s;
      });
    } else {
      settings.update((s) => {
        const crrFormat = s.formats[format.id] as TFormat | null;
        if (crrFormat) {
          crrFormat.loading = loading;
        }

        return s;
      });
    }
  }
  function handleUpdate() {
    debounce(() => {
      error = validateFormat(value, granularity, format.id);
      triggerRerender?.update((n) => n + 1);

      settings.update((s) => {
        // Calendared: the row may have been removed meanwhile (an empty row is removed on blur)
        if (!s.formats[format.id]) return s;
        const updatedFormat = {
          ...s.formats[format.id],
          value,
          error,
        };
        s.formats[format.id] = updatedFormat;
        if (selected) {
          s.selectedFormat = updatedFormat;
        }

        return s;
      });
    }, 500)();
  }

  function handleSelect() {
    settings.update((s) => {
      if (type === "skeleton") {
        const id = uuidv4();
        s.formats[id] = {
          id,
          value: "",
          error: "",
          loading: false,
        };
      } else if (!value.trim()) {
        // Calendared: an empty format can't name new notes (it would write a timestamp as the file name)
        return s;
      } else {
        // revalidate format on select since on:input debounce validation may not be triggered yet
        error = validateFormat(value, granularity, format.id);

        const newSelectedFormat = {
          ...$settings.formats[format.id],
          value,
          error,
        };
        s.selectedFormat = newSelectedFormat;
        s.formats[format.id] = newSelectedFormat;
      }
      return s;
    });
  }

  function handleReplaceAll(e: Event) {
    e.preventDefault();

    const replaceAll = () => {
      const oldFormats = $settings.formats;
      settings.update((s) => {
        // 1. select format
        s.selectedFormat = s.formats[format.id];
        return s;
      });

      // 2. rename all files
      let oldFormatsParsedCount = 0;
      Object.values(oldFormats).forEach(async (oldFormat) => {
        if (oldFormat.id === format.id) return;

        oldFormatsParsedCount += 1;

        const oldFilepaths = notesWithFormatIn(granularity, oldFormat.value, $settingsStore);
        const oldFilesCount = oldFilepaths.length;

        if (!oldFilesCount) return;

        setLoading(true, true);

        oldFilepaths.forEach(
          async (oldFilepath, oldFilepathIndex) => {
            const abstractFile =
              PluginService.getPlugin()?.app.vault.getAbstractFileByPath(
                oldFilepath,
              );
            if (abstractFile && !(abstractFile instanceof TFile)) {
              return;
            }
            const oldFile = abstractFile;
            if (!oldFile) return;

            // Calendared: read the old name as a period through the week scheme (moment alone reads a week name as the
            // language's week, one week off in a Monday-first calendar), and rename with the file manager so links to
            // the note are updated too (upstream used vault.rename, which leaves links pointing to the old name)
            const weeks = weekSchemeFor($settingsStore.localeSettings);
            const newBasename = renameForFormat(oldFile.basename, granularity, oldFormat.value, format.value, weeks);
            if (!newBasename) return;
            const newNormalizedPath = normalizePath(`${oldFile.parent?.path ?? ""}/${newBasename}.md`);

            await ensureFolderExists(newNormalizedPath);

            try {
              await PluginService.getPlugin()?.app.fileManager.renameFile(
                oldFile,
                newNormalizedPath,
              );

              // set loading to false when reaching the last filepath of the last parsable format,
              // call here and not after the loop to ensure loading is updated after the last rename op is completed
              if (
                oldFormatsParsedCount === Object.keys(oldFormats).length - 1 &&
                oldFilepathIndex === oldFilesCount - 1
              ) {
                setLoading(false, true);
              }
            } catch (error) {
              new Notice(
                genNoticeFragment([
                  [`Failed to rename ${oldFilepath} to ${newNormalizedPath}: `],
                  [error.message, "u-pop"],
                ]),
                8000,
              );

              // set loading to false when reaching the last filepath of the last parsable format,
              // call here and not after the loop to ensure loading is updated after the last rename op is completed
              if (
                oldFormatsParsedCount === Object.keys(oldFormats).length - 1 &&
                oldFilepathIndex === oldFilesCount - 1
              ) {
                setLoading(false, true);
              }
            }
          },
        );
      });
    };

    const shouldConfirm = $settingsStore.shouldConfirmBeforeReplaceAllFormats;
    if (shouldConfirm) {
      createConfirmationDialog({
        title: {
          Component: ReplaceAllTitle,
          props: {
            replacingFormat: format.value,
          },
        },
        text: {
          Component: ReplaceAllText,
          props: {
            replacingFormat: format.value,
            granularity,
          },
        },
        note: {
          Component: ReplaceAllNote,
        },
        cta: "Replace",
        onAccept: (dontAskAgain) => {
          replaceAll();

          if (dontAskAgain) {
            settingsStore.update((settings) => ({
              ...settings,
              shouldConfirmBeforeReplaceAllFormats: false,
            }));
          }
        },
      });
    } else {
      replaceAll();
    }
  }

  function handleRemove(e: Event) {
    e.preventDefault();

    const remove = () => {
      settings.update((s) => {
        delete s.formats[format.id];

        // helps ensure at least one format is selected at all times
        if (selected && Object.keys(s.formats).length > 0) {
          s.selectedFormat = Object.values(s.formats)[0];
        }
        // helps ensure at least one non-empty valid format exists at all times
        const lastFormatEmpty =
          Object.keys(s.formats).length === 1 &&
          Object.values(s.formats)[0].value.trim() === "";
        if (Object.keys(s.formats).length === 0 || lastFormatEmpty) {
          const id = uuidv4();
          const newSelectedFormat = {
            id,
            value: defaultFormat,
            error: "",
            loading: false,
          };
          s.selectedFormat = newSelectedFormat;
          s.formats[id] = newSelectedFormat;
        }

        return s;
      });

      trySelectLastOnlyFormat();

      triggerRerender?.update((n) => n + 1);
    };

    if (filesCount) {
      const shouldConfirm = $settingsStore.shouldConfirmBeforeDeleteFormat;
      if (shouldConfirm) {
        createConfirmationDialog({
          title: `Delete format`,
          text: {
            Component: DeleteFormatText,
            props: { settings, granularity, format },
          },
          note: {
            Component: DeleteFormatNote,
            props: { granularity },
          },
          cta: "Delete",
          onAccept: (dontAskAgain) => {
            remove();

            if (dontAskAgain) {
              settingsStore.update((settings) => ({
                ...settings,
                shouldConfirmBeforeDeleteFormat: false,
              }));
            }
          },
        });
      } else {
        remove();
      }
    } else {
      remove();
    }
  }

  onMount(() => {
    if (type === "skeleton") return;

    // Calendared: a row just added with "+" is empty; focus it so typing can start, and so leaving it removes it
    if (!value.trim()) textInputEl?.focus();

    error = validateFormat(value, granularity, format.id);
    trySelectLastOnlyFormat();

    // set icons
    setIcon(replaceBttnEl, "replace-all");
    setIcon(removeBttnEl, "x");
  });

  function trySelectLastOnlyFormat() {
    if (Object.keys($settings.formats).length === 1) {
      const lastFormat = Object.values($settings.formats)[0];
      error = validateFormat(lastFormat.value, granularity, lastFormat.id);
      const newSelectedFormat = {
        ...lastFormat,
        error,
      };
      settings.update((s) => {
        s.selectedFormat = newSelectedFormat;
        s.formats[newSelectedFormat.id] = newSelectedFormat;

        return s;
      });
    }
  }

  $effect(() => {
    if (type === "skeleton") return;

    if ($triggerRerender) {
      error = validateFormat(value, granularity, format.id);
    }
  });

  $effect(() => {
    if (type === "skeleton") return;

    settings.update((s) => {
      if (formatId === s.selectedFormat.id) {
        s.selectedFormat.error = error;
      }
      s.formats[formatId].error = error;

      return s;
    });
  });

  $effect(() => {
    if (type === "skeleton" || !labelEl) return;

    labelEl.tabIndex = 0;
    labelEl.onkeydown = (event) => {
      if (
        event.target === event.currentTarget &&
        (event.key === "Enter" || event.key === " ")
      ) {
        selected = true;
        handleSelect();
      }
    };
  });
</script>

<!-- Format Option -->
<label
  bind:this={labelEl}
  class={cn(
    "w-full cursor-[var(--cursor)] block rounded-lg p-3 mb-4 last:mb-0 border border-solid focus-visible:shadow-[0_0_0_3px_var(--background-modifier-border-focus)] outline-none",
    type === "skeleton" &&
      "hover:bg-[var(--background-modifier-hover)] relative border-dashed hover:border-solid bg-transparent",
    error
      ? "border-[var(--background-modifier-error)]"
      : selected
        ? "bg-[var(--interactive-accent)] text-[var(--text-on-accent)] border-transparent"
        : "hover:bg-[var(--background-modifier-hover)] border-[var(--background-modifier-border)] focus-visible:bg-[var(--background-modifier-hover)] focus-visible:border-[var(--background-modifier-border)]",
  )}
>
  {#if type === "skeleton"}
    <Button
      tabindex="-1"
      class="!opacity-0 hidden"
      onclick={handleSelect}
      aria-label="new format"
    ></Button>
  {:else}
    <input
      type="radio"
      name="format"
      checked={selected}
      onclick={handleSelect}
      class="hidden"
    />
  {/if}

  <div
    class={cn(
      "w-full transition-all duration-200",
      type === "skeleton" && "!opacity-0 -z-50",
    )}
  >
    <div class="flex items-center mb-2">
      <input
        type="text"
        bind:this={textInputEl}
        onblur={(e) => {
          // Calendared: an empty format means nothing (it recognizes no note), so it only lives while being typed in
          if (!value.trim()) handleRemove(e);
        }}
        bind:value
        spellcheck={false}
        placeholder={defaultFormat}
        aria-invalid={!!error}
        aria-describedby={error ? "format-error" : undefined}
        class={cn(
          "flex-1 hover:transition !bg-transparent",
          type === "skeleton" && "!opacity-0 -z-50",
          error
            ? "!text-[var(--text-error)] !border-[var(--background-modifier-error)]"
            : selected
              ? "!text-[var(--text-on-accent)] !placeholder-[hsl(0deg_0%_100%_/_50%)] !border-[var(--text-accent-hover)] hover:!bg-[var(--interactive-accent-hover)]"
              : "!border-[var(--background-modifier-border-hover)] hover:!bg-[var(--background-modifier-form-field)]",
        )}
        oninput={handleUpdate}
        disabled={type === "skeleton"}
      />
    </div>

    <div class="flex items-center justify-between pl-[1px]">
      <div class="[font-size:calc(var(--font-ui-small)+1px)]">
        <FilepathsCount {settings} {granularity} {format} {selected} {error} />
        {#if error}
          <span class="text-[var(--text-error)]"
            >{previewName(value)} •
          </span>
          <span class="text-[var(--text-error)]" id="format-error">
            {error}
          </span>
        {:else}
          <span class={cn(selected ? "!text-[var(--text-on-accent)]" : "u-pop")}
            >{value.trim()
              ? previewName(value)
              : "Empty format"}</span
          >
        {/if}
        {#if formatRole}
          <span class={cn(selected ? "!text-[var(--text-on-accent)] font-semibold" : "opacity-70")}> · {formatRole}</span>
        {/if}
      </div>
      <div class="flex">
        <!-- replace -->
        <button
          class={cn(
            "clickable-icon extra-setting-button hover:!bg-[var(--background-modifier-hover)]",
            (error || value.trim() === "") &&
              "!cursor-not-allowed hover:bg-transparent hover:!opacity-70",
            error
              ? "!text-[var(--text-error)]"
              : selected
                ? "!text-[var(--text-on-accent)]"
                : "",
            type === "skeleton" && "!opacity-0 -z-50",
          )}
          aria-label="Replace all formats with this one"
          bind:this={replaceBttnEl}
          onclick={handleReplaceAll}
          disabled={!!error || value.trim() === "" || type === "skeleton"}
        ></button>
        <!-- remove -->
        <button
          class={cn(
            "clickable-icon extra-setting-button hover:!bg-[var(--background-modifier-hover)]",
            error
              ? "!text-[var(--text-error)]"
              : selected
                ? "!text-[var(--text-on-accent)]"
                : "",
            type === "skeleton" ? "!opacity-0 -z-50" : "",
          )}
          aria-label="Remove format"
          bind:this={removeBttnEl}
          onclick={handleRemove}
          disabled={type === "skeleton"}
        ></button>
      </div>
    </div>
  </div>
  {#if type === "skeleton"}
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="svg-icon lucide-plus absolute top-1/2 left-1/2 [transform:translate(-50%,-50%)]"
      ><path d="M5 12h14" /><path d="M12 5v14" /></svg
    >
  {/if}
</label>
