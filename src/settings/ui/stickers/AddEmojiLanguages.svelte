<script lang="ts">
  // Calendared: pick emoji search languages to download, like adding a keyboard or a browser language: Obsidian's
  // language is suggested first, the rest are searchable, several can be picked, and nothing is downloaded until the
  // button that names the size and the server is pressed
  import { EMOJI_DATA_SIZES_KB, EMOJI_SEARCH_LANGUAGES, type EmojiSearchLanguage } from "@/emoji-search";
  import { downloadEmojiLanguages, emojiSearchState, suggestedEmojiLanguage } from "@/ui/utils/emoji-locale";
  import { languageNames } from "./language-names";

  interface Props {
    close: () => void;
  }
  let { close }: Props = $props();

  const suggested = suggestedEmojiLanguage();
  const all = EMOJI_SEARCH_LANGUAGES.map((code) => ({ code, ...languageNames(code) })).sort((a, b) =>
    a.english.localeCompare(b.english),
  );

  let query = $state("");
  let selected = $state<EmojiSearchLanguage[]>([]);
  let have = $derived(new Set([...$emojiSearchState.installed, ...$emojiSearchState.downloading]));
  let matches = $derived(
    all.filter(({ code, english, native }) => {
      const q = query.trim().toLowerCase();
      return !q || code === q || english.toLowerCase().includes(q) || native.toLowerCase().includes(q);
    }),
  );
  let sizeKb = $derived(selected.reduce((sum, code) => sum + EMOJI_DATA_SIZES_KB[code], 0));

  function toggle(code: EmojiSearchLanguage, on: boolean) {
    selected = on ? [...selected, code] : selected.filter((c) => c !== code);
  }
  function download() {
    void downloadEmojiLanguages(selected);
    close();
  }
</script>

{#snippet row(language: (typeof all)[number])}
  {@const done = have.has(language.code)}
  <label class="calendared-language-row" class:is-done={done}>
    <input
      type="checkbox"
      checked={done || selected.includes(language.code)}
      disabled={done}
      onchange={(event) => toggle(language.code, event.currentTarget.checked)}
    />
    <span class="calendared-language-name">{language.native}<span>{language.english}</span></span>
    <span class="calendared-language-size">{done ? "Added" : `${EMOJI_DATA_SIZES_KB[language.code]} KB`}</span>
  </label>
{/snippet}

<input class="calendared-language-search" type="search" placeholder="Search languages" bind:value={query} />
<div class="calendared-language-list">
  {#if suggested && matches.some((l) => l.code === suggested)}
    <div class="calendared-language-heading">Suggested (Obsidian's language)</div>
    {@render row(matches.find((l) => l.code === suggested)!)}
  {/if}
  <div class="calendared-language-heading">All languages</div>
  {#each matches.filter((l) => l.code !== suggested) as language (language.code)}
    {@render row(language)}
  {:else}
    <p class="calendared-language-empty">No matching language</p>
  {/each}
</div>
<p class="calendared-language-note">
  {selected.length
    ? `Downloads ${sizeKb} KB from cdn.jsdelivr.net (or raw.githubusercontent.com). Only the language names are sent.`
    : "Pick the languages to search stickers in."}
</p>
<div class="modal-button-container">
  <button onclick={close}>Cancel</button>
  <button class="mod-cta" disabled={selected.length === 0} onclick={download}>
    {selected.length ? `Download ${selected.length} (${sizeKb} KB)` : "Download"}
  </button>
</div>
