<script lang="ts">
  import locales from "@/locales";
  import { defaultWeekdays, sysLocaleKey } from "@/localization";
  import { TimelineViewMode } from "@/settings/constants";
  import { settingsStore } from "@/settings/store";
  import { Dropdown, SettingItem, Toggle } from "@/settings/ui";
  import { switchLocale, updateWeekStartSetting } from "@/stores";
  import { toSupportedWeekStart } from "@/weeks";
  import TimelineManager from "@/ui/components/timeline/manager";
  import { derived as derivedStore } from "svelte/store";
  import { Notice, Platform } from "obsidian";
  import { isReservedStickerProperty, RESERVED_STICKER_PROPERTIES } from "@/ui/utils/picker";

  // Sticker
  // Calendared: stickers live in one property. Upstream's prefix / migrate / backup settings were removed
  let stickerProperty: string = $state($settingsStore.stickerProperty);
  const handleStickerPropertyInput = () => {
    const property = stickerProperty.trim();
    if (property === "" || isReservedStickerProperty(property)) {
      new Notice(
        property === ""
          ? "Enter a property name for stickers."
          : `Adding a sticker overwrites the whole value of its property, so '${property}' can't be used (see the list under Sticker property). Choose another name, such as 'sticker' or 'mood'.`,
        8000,
      );
      stickerProperty = $settingsStore.stickerProperty;
      return;
    }
    settingsStore.update((s) => {
      s.stickerProperty = property;
      return s;
    });
  };

  const handleShouldConfirmBeforeCreate = (
    shouldConfirmBeforeCreate: boolean,
  ) => {
    settingsStore.update((settings) => ({
      ...settings,
      shouldConfirmBeforeCreate,
    }));
  };

  const handleConfirmAutoHoverPreview = (autoHoverPreview: boolean) => {
    settingsStore.update((settings) => ({
      ...settings,
      autoHoverPreview,
    }));
  };

  // Timeline
  const handleToggleTimeline = (enabled: boolean) => {
    settingsStore.update((s) => {
      s.timeline.enabled = enabled;
      return s;
    });
    if (enabled) {
      TimelineManager.create()?.mountAll();
    } else {
      TimelineManager.destroy();
    }
  };

  const handleToggleGranularityBased = (granularityBased: boolean) => {
    settingsStore.update((s) => {
      s.timeline.granularityBased = granularityBased;
      return s;
    });
    TimelineManager.instance?.restartAll();
  };
  const handleSetViewMode = (viewMode: TimelineViewMode) => {
    settingsStore.update((s) => {
      s.timeline.viewMode = viewMode;
      return s;
    });
    TimelineManager.instance?.restartAll();
  };
  const handleToggleDisplayOnRestNotes = (displayOnRestNotes: boolean) => {
    settingsStore.update((s) => {
      s.timeline.displayOnRestNotes = displayOnRestNotes;
      return s;
    });
    TimelineManager.instance?.restartAll();
  };
  const handleToggleDisplayStickers = (displayStickers: boolean) => {
    settingsStore.update((s) => {
      s.timeline.displayStickers = displayStickers;
      return s;
    });
    TimelineManager.instance?.restartAll();
  };
  const handleSetRestViewMode = (restViewMode: TimelineViewMode) => {
    settingsStore.update((s) => {
      s.timeline.restViewMode = restViewMode;
      return s;
    });
    TimelineManager.instance?.restartAll();
  };

  // Localization
  const handleSetLanguage = (localeKey: string) => {
    switchLocale(localeKey);
  };
  const getLanguageOptions = () => {
    let options = [
      {
        label: `Same as system - ${locales.get(sysLocaleKey) || sysLocaleKey}`,
        value: sysLocaleKey,
      },
    ];
    window.moment.locales().forEach((momentLocale) => {
      // use a name like "English" when available in static locales file otherwise use localeKey
      options.push({
        label: locales.get(momentLocale) || momentLocale,
        value: momentLocale,
      });
    });

    return options;
  };

  let firstWeekday = $derived(
    defaultWeekdays[$settingsStore.localeSettings.weekStartId],
  );
  const handleFirstWeekdayChange = (weekday: string) => {
    const newWeekStartId = defaultWeekdays.indexOf(weekday);

    updateWeekStartSetting(newWeekStartId);
  };
  // Calendared: Saturday, Sunday or Monday only, like Google Calendar (docs/periods.md, ADR-003)
  const weekdayOptionsStore = derivedStore(settingsStore, () => {
    const localeDefault = toSupportedWeekStart(window.moment.localeData().firstDayOfWeek());
    return [
      {
        label: `Locale default - ${window.moment.localeData().weekdays()[localeDefault]}`,
        value: defaultWeekdays[localeDefault],
      },
      ...[6, 0, 1].map((i) => ({
        label: window.moment.localeData().weekdays()[i],
        value: defaultWeekdays[i],
      })),
    ];
  });
</script>

<!-- ------------------------------- -->
<!-- ------ Sticker section ------- -->
<!-- ------------------------------- -->
<div class="setting-group">
  <!-- Calendared: turning stickers off hides everything about them (display, header button, menu item, commands) -->
  <SettingItem isHeading={true} name="Stickers" type="toggle">
    {#snippet control()}
      <Toggle
        isEnabled={$settingsStore.stickersEnabled}
        onChange={(enabled: boolean) =>
          settingsStore.update((s) => {
            s.stickersEnabled = enabled;
            return s;
          })}
      />
    {/snippet}
  </SettingItem>
  {#if $settingsStore.stickersEnabled}
  <div class="setting-items">
    <SettingItem
      name="Sticker button in note header"
      description="Show a button next to the reading-view icon of periodic notes. It shows the note's sticker, and opens the emoji picker."
      type="toggle"
    >
      {#snippet control()}
        <Toggle
          isEnabled={$settingsStore.stickerHeaderButton}
          onChange={(enabled: boolean) =>
            settingsStore.update((s) => {
              s.stickerHeaderButton = enabled;
              return s;
            })}
        />
      {/snippet}
    </SettingItem>
    <!-- Calendared: where new stickers are saved -->
    <SettingItem
      name="Sticker property"
    >
      {#snippet description()}
        <p class="m-0">
          Property that holds a note's sticker emoji (e.g. 'sticker', 'mood').
          Adding a sticker overwrites this property's value.
        </p>
        <!-- Calendared: always show which names are refused, from the same list the check uses -->
        <p class="m-0 mt-1">
          Not allowed (Obsidian's built-in properties):
          {#each RESERVED_STICKER_PROPERTIES as name, i}<code>{name}</code>{i < RESERVED_STICKER_PROPERTIES.length - 1 ? ", " : ""}{/each}
        </p>
      {/snippet}
      {#snippet control()}
        <input
          class="flex-grow"
          bind:value={stickerProperty}
          type="text"
          spellcheck={false}
          placeholder="sticker"
          onblur={handleStickerPropertyInput}
        />
      {/snippet}
    </SettingItem>
  </div>
  {/if}
</div>

<!-- --- Timeline section ---- -->
<!-- ------------------------- -->
<div class="setting-group">
  <SettingItem
    isHeading={true}
    name="Timeline"
    type="toggle"
    description="Quickly jump between time periods from the top of your periodic notes."
  >
    {#snippet control()}
      <Toggle
        onChange={handleToggleTimeline}
        isEnabled={$settingsStore.timeline.enabled}
      />
    {/snippet}
  </SettingItem>

  {#if $settingsStore.timeline.enabled}
    <div class="setting-items">
      <SettingItem
        name="Unique timelines for periodic notes"
        description="Toggle to show a specific timeline for each type of periodic note. When off, all periodic notes share the same week-based timeline."
      >
        {#snippet control()}
          <Toggle
            onChange={handleToggleGranularityBased}
            isEnabled={$settingsStore.timeline.granularityBased}
          />
        {/snippet}
      </SettingItem>
      <SettingItem
        name="Periodic notes timeline view mode"
        description="Set the default display mode for the timeline, either expanded or collapsed."
      >
        {#snippet control()}
          <Dropdown
            options={[
              { label: "Expanded", value: "expanded" },
              { label: "Collapsed", value: "collapsed" },
            ]}
            onChange={handleSetViewMode}
            value={$settingsStore.timeline.viewMode}
          />
        {/snippet}
      </SettingItem>

      <SettingItem
        name="Show timeline everywhere"
        description="Enable the timeline for all notes, not just periodic ones."
      >
        {#snippet control()}
          <Toggle
            onChange={handleToggleDisplayOnRestNotes}
            isEnabled={$settingsStore.timeline.displayOnRestNotes}
          />
        {/snippet}
      </SettingItem>

      <SettingItem
        name="Show timeline stickers"
        description="Show emoji stickers in the timeline view."
      >
        {#snippet control()}
          <Toggle
            onChange={handleToggleDisplayStickers}
            isEnabled={$settingsStore.timeline.displayStickers}
          />
        {/snippet}
      </SettingItem>

      {#if $settingsStore.timeline.displayOnRestNotes}
        <SettingItem
          name="Non-periodic notes timeline view mode"
          description="Set the default display mode for the timeline on non-periodic notes."
        >
          {#snippet control()}
            <Dropdown
              options={[
                { label: "Expanded", value: "expanded" },
                { label: "Collapsed", value: "collapsed" },
              ]}
              onChange={handleSetRestViewMode}
              value={$settingsStore.timeline.restViewMode}
            />
          {/snippet}
        </SettingItem>
      {/if}
    </div>
  {/if}
</div>

<!-- ------------------------------------- -->
<!-- --- Interaction behavior section ---- -->
<!-- ------------------------------------- -->
<div class="setting-group">
  <SettingItem isHeading={true} name="Interaction behavior" />

  <div class="setting-items">
    <SettingItem
      name="Creation confirmation"
      description="Prompt before creating new periodic notes to prevent accidental entries."
    >
      {#snippet control()}
        <Toggle
          onChange={handleShouldConfirmBeforeCreate}
          isEnabled={$settingsStore.shouldConfirmBeforeCreate}
        />
      {/snippet}
    </SettingItem>

    {#if !Platform.isPhone}
      <SettingItem
        name="Hover preview"
        description="Instantly preview notes by hovering over dates (no modifier key needed)."
      >
        {#snippet control()}
          <Toggle
            onChange={handleConfirmAutoHoverPreview}
            isEnabled={$settingsStore.autoHoverPreview}
          />
        {/snippet}
      </SettingItem>
    {/if}
  </div>
</div>

<!-- ------------------------------------- -->
<!-- --- Localization section ---- -->
<!-- ------------------------------------- -->
<div class="setting-group">
  <SettingItem isHeading={true} name="Localization" />
  <div class="setting-items">
    <SettingItem
      name="Calendar language"
      description="Set a specific language for the calendar interface."
    >
      {#snippet control()}
        <Dropdown
          options={getLanguageOptions()}
          onChange={handleSetLanguage}
          value={$settingsStore.localeSettings.localeOverride}
        />
      {/snippet}
    </SettingItem>

    <SettingItem
      name="Week starts on"
      description="Choose which day your week begins with."
    >
      {#snippet control()}
        <Dropdown
          options={$weekdayOptionsStore}
          onChange={handleFirstWeekdayChange}
          value={firstWeekday}
        />
      {/snippet}
    </SettingItem>
  </div>
</div>
