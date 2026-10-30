<script lang="ts">
  import locales from "@/locales";
  import { defaultWeekdays, sysLocaleKey } from "@/localization";
  import type { ISettings } from "@/settings/constants";
  import { settingsStore } from "@/settings/store";
  import { Dropdown, SettingItem, Toggle } from "@/settings/ui";
  import { switchLocale, updateWeekStartSetting } from "@/stores";
  import { toSupportedWeekStart } from "@/weeks";
  import { localeWeekStart, weekdayNames } from "@/calendar-locale";
  import { derived as derivedStore } from "svelte/store";
  import { Notice, Platform } from "obsidian";
  import { isReservedStickerProperty, RESERVED_STICKER_PROPERTIES } from "@/ui/utils/emoji-picker";
  import EmojiLanguages from "./EmojiLanguages.svelte";

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

  // Calendared: the breadcrumbs and the mini calendar (docs/adr/0031, 0032). NavigationManager follows the settings
  const placementOptions = [
    { label: "Always", value: "always" },
    { label: "Phone only", value: "phone" },
    { label: "Never", value: "never" },
  ];
  const updateBreadcrumbs = (change: Partial<ISettings["breadcrumbs"]>) =>
    settingsStore.update((s) => ({ ...s, breadcrumbs: { ...s.breadcrumbs, ...change } }));
  const updateMiniCalendar = (change: Partial<ISettings["miniCalendar"]>) =>
    settingsStore.update((s) => ({ ...s, miniCalendar: { ...s.miniCalendar, ...change } }));

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
  // Calendared: Saturday, Sunday or Monday only, like Google Calendar (docs/adr/0011)
  // Calendared: named in the calendar's language (upstream read Obsidian's moment, which it had switched to that language)
  const weekdayOptionsStore = derivedStore(settingsStore, (settings) => {
    const locale = settings.localeSettings.localeOverride;
    const names = weekdayNames(locale, 0).weekdays;
    const localeDefault = toSupportedWeekStart(localeWeekStart(locale));
    return [
      {
        label: `Locale default - ${names[localeDefault]}`,
        value: defaultWeekdays[localeDefault],
      },
      ...[6, 0, 1].map((i) => ({
        label: names[i],
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
    <EmojiLanguages />
  </div>
  {/if}
</div>

<!-- --- Breadcrumbs section ---- -->
<!-- ---------------------------- -->
<div class="setting-group">
  <SettingItem
    isHeading={true}
    name="Breadcrumbs"
    description="Where the note sits, such as 2026 › Q4 › Oct › W44 › 30, above the note. Click a period to open its note."
  />
  <div class="setting-items">
    <SettingItem name="Show on" description="Phone only keeps desktop and tablets to the side calendar.">
      {#snippet control()}
        <Dropdown
          options={placementOptions}
          onChange={(placement) => updateBreadcrumbs({ placement: placement as ISettings["breadcrumbs"]["placement"] })}
          value={$settingsStore.breadcrumbs.placement}
        />
      {/snippet}
    </SettingItem>
    {#if $settingsStore.breadcrumbs.placement !== "never"}
      <SettingItem name="Show on other notes" description="Also show where today is on notes that aren't periodic notes.">
        {#snippet control()}
          <Toggle
            onChange={(onOtherNotes) => updateBreadcrumbs({ onOtherNotes })}
            isEnabled={$settingsStore.breadcrumbs.onOtherNotes}
          />
        {/snippet}
      </SettingItem>
    {/if}
  </div>
</div>

<!-- --- Mini calendar section ---- -->
<!-- ------------------------------ -->
<div class="setting-group">
  <SettingItem
    isHeading={true}
    name="Mini calendar"
    description="The notes before and after the open one, above the note, with their stickers."
  />
  <div class="setting-items">
    <SettingItem name="Show on" description="Phone only keeps desktop and tablets to the side calendar.">
      {#snippet control()}
        <Dropdown
          options={placementOptions}
          onChange={(placement) => updateMiniCalendar({ placement: placement as ISettings["miniCalendar"]["placement"] })}
          value={$settingsStore.miniCalendar.placement}
        />
      {/snippet}
    </SettingItem>
    {#if $settingsStore.miniCalendar.placement !== "never"}
      <SettingItem name="Show on other notes" description="Also show the days around today on notes that aren't periodic notes.">
        {#snippet control()}
          <Toggle
            onChange={(onOtherNotes) => updateMiniCalendar({ onOtherNotes })}
            isEnabled={$settingsStore.miniCalendar.onOtherNotes}
          />
        {/snippet}
      </SettingItem>
      <SettingItem name="Days" description="Show the calendar's week, or the note in the middle with 3 days on each side.">
        {#snippet control()}
          <Dropdown
            options={[
              { label: "Calendar week", value: "week" },
              { label: "Centered on the note", value: "centered" },
            ]}
            onChange={(dayLayout) => updateMiniCalendar({ dayLayout: dayLayout as ISettings["miniCalendar"]["dayLayout"] })}
            value={$settingsStore.miniCalendar.dayLayout}
          />
        {/snippet}
      </SettingItem>
      <SettingItem name="Show stickers">
        {#snippet control()}
          <Toggle
            onChange={(displayStickers) => updateMiniCalendar({ displayStickers })}
            isEnabled={$settingsStore.miniCalendar.displayStickers}
          />
        {/snippet}
      </SettingItem>
    {/if}
    {#if $settingsStore.breadcrumbs.placement === "always" || $settingsStore.miniCalendar.placement === "always"}
      <SettingItem
        name="Compact on desktop"
        description="Applies to both. Show them in a small box at the top right of the note instead of a bar under its header. Phones always use the bar."
      >
        {#snippet control()}
          <Toggle
            onChange={(compactOnDesktop) => settingsStore.update((s) => ({ ...s, compactOnDesktop }))}
            isEnabled={$settingsStore.compactOnDesktop}
          />
        {/snippet}
      </SettingItem>
    {/if}
  </div>
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

    <SettingItem
      name="Open now button"
      description="Show a button in every note's header that opens now's note: today's, or this week's if daily notes are off, and so on."
    >
      {#snippet control()}
        <Toggle
          onChange={(openNowHeaderButton) => settingsStore.update((s) => ({ ...s, openNowHeaderButton }))}
          isEnabled={$settingsStore.openNowHeaderButton}
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
