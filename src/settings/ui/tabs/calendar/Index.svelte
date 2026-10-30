<script lang="ts">
  import locales from "@/locales";
  import { defaultWeekdays, sysLocaleKey } from "@/localization";
  import type { ISettings } from "@/settings/constants";
  import { settingsStore } from "@/settings/store";
  import { Dropdown, SettingItem, Toggle } from "@/settings/ui";
  import { switchLocale, updateWeekStartSetting } from "@/stores";
  import { toSupportedWeekStart } from "@/weeks";
  import { showsOn } from "@/navigation";
  import { localeWeekStart, weekdayNames } from "@/calendar-locale";
  import { derived as derivedStore } from "svelte/store";
  import { Notice } from "obsidian";
  import { isReservedStickerProperty, RESERVED_STICKER_PROPERTIES } from "@/ui/utils/emoji-picker";
  import { useIcon } from "@/ui/utils";
  import { STICKER_BUTTON_ICON } from "@/ui/sticker-actions";
  import { openNowIcon } from "@/ui/open-now";
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

  // Calendared: the breadcrumbs and the mini calendar (docs/adr/0031, 0032), each turned on and off by its heading's
  // toggle (docs/adr/0033). NavigationManager follows the settings
  const placementOptions = [
    { label: "Always", value: "always" },
    { label: "Phone only", value: "phone" },
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
        // Calendared: the language in parentheses (upstream: "Same as system - English")
        label: `Same as system (${locales.get(sysLocaleKey) || sysLocaleKey})`,
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
        // Calendared: "Language default (Sunday)"; upstream-style "Locale default - Sunday" read as developer jargon
        label: `Language default (${names[localeDefault]})`,
        value: defaultWeekdays[localeDefault],
      },
      ...[6, 0, 1].map((i) => ({
        label: names[i],
        value: defaultWeekdays[i],
      })),
    ];
  });
</script>

<!-- Calendared: the settings for a button in the tab title bar show that button's icon next to their name, so the
     setting can be matched with the button on screen -->
{#snippet buttonName(icon: string, name: string)}
  <span class="inline-flex items-center gap-1.5"><span class="inline-flex [--icon-size:var(--icon-s)]" use:useIcon={icon}></span>{name}</span>
{/snippet}

<!-- ------------------------------- -->
<!-- ------ Sticker section ------- -->
<!-- ------------------------------- -->
<div class="setting-group">
  <!-- Calendared: turning stickers off hides everything about them (display, header button, menu item, commands) -->
  <SettingItem
    isHeading={true}
    name="Stickers"
    type="toggle"
    description="An emoji for each periodic note, shown in the calendar."
  >
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
      description="In the tab title bar of periodic notes. Shows the note's sticker; click it to pick one."
      type="toggle"
    >
      {#snippet name()}{@render buttonName(STICKER_BUTTON_ICON, "Sticker button")}{/snippet}
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
          Property that holds the sticker. Adding a sticker replaces its value.
        </p>
        <!-- Calendared: always show which names are refused, from the same list the check uses -->
        <p class="m-0 mt-1">
          Can't be one of Obsidian's built-in properties:
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

<!-- --- Period breadcrumbs section ---- -->
<!-- ----------------------------------- -->
<!-- Calendared: "Period breadcrumbs" on screen, so it isn't taken for the community plugin "Breadcrumbs"; the code
     keeps calling it breadcrumbs -->
<div class="setting-group">
  <SettingItem
    isHeading={true}
    name="Period breadcrumbs"
    type="toggle"
    description="Shows where the note sits, such as 2026 › Q4 › Oct › W44 › 30, above the note. Click a period to open its note."
  >
    {#snippet control()}
      <Toggle onChange={(enabled) => updateBreadcrumbs({ enabled })} isEnabled={$settingsStore.breadcrumbs.enabled} />
    {/snippet}
  </SettingItem>
  {#if $settingsStore.breadcrumbs.enabled}
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
      <SettingItem name="Show on non-periodic notes">
        {#snippet control()}
          <Toggle
            onChange={(onOtherNotes) => updateBreadcrumbs({ onOtherNotes })}
            isEnabled={$settingsStore.breadcrumbs.onOtherNotes}
          />
        {/snippet}
      </SettingItem>
    </div>
  {/if}
</div>

<!-- --- Mini calendar section ---- -->
<!-- ------------------------------ -->
<div class="setting-group">
  <SettingItem
    isHeading={true}
    name="Mini calendar"
    type="toggle"
    description="Shows the days (or weeks, months…) around the note, above it. Click one to open it."
  >
    {#snippet control()}
      <Toggle onChange={(enabled) => updateMiniCalendar({ enabled })} isEnabled={$settingsStore.miniCalendar.enabled} />
    {/snippet}
  </SettingItem>
  {#if $settingsStore.miniCalendar.enabled}
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
      <SettingItem name="Show on non-periodic notes">
        {#snippet control()}
          <Toggle
            onChange={(onOtherNotes) => updateMiniCalendar({ onOtherNotes })}
            isEnabled={$settingsStore.miniCalendar.onOtherNotes}
          />
        {/snippet}
      </SettingItem>
      <SettingItem name="Days shown" description="For daily notes. Other notes show 2 on each side.">
        {#snippet control()}
          <Dropdown
            options={[
              { label: "Calendar week", value: "week" },
              { label: "3 days each side", value: "centered" },
            ]}
            onChange={(dayLayout) => updateMiniCalendar({ dayLayout: dayLayout as ISettings["miniCalendar"]["dayLayout"] })}
            value={$settingsStore.miniCalendar.dayLayout}
          />
        {/snippet}
      </SettingItem>
      <!-- has no effect while stickers are off -->
      {#if $settingsStore.stickersEnabled}
        <SettingItem name="Show stickers">
          {#snippet control()}
            <Toggle
              onChange={(displayStickers) => updateMiniCalendar({ displayStickers })}
              isEnabled={$settingsStore.miniCalendar.displayStickers}
            />
          {/snippet}
        </SettingItem>
      {/if}
    </div>
  {/if}
</div>

<!-- applies to both, so it sits apart from both headings, and shows while either of them shows on desktop -->
{#if showsOn($settingsStore.breadcrumbs, false) || showsOn($settingsStore.miniCalendar, false)}
  <div class="setting-group">
    <div class="setting-items">
      <SettingItem
        name="Compact on desktop"
        description="Show the period breadcrumbs and mini calendar in a small box at the top right of the note, instead of a bar under the tab title bar. Phones always use the bar."
      >
        {#snippet control()}
          <Toggle
            onChange={(compactOnDesktop) => settingsStore.update((s) => ({ ...s, compactOnDesktop }))}
            isEnabled={$settingsStore.compactOnDesktop}
          />
        {/snippet}
      </SettingItem>
    </div>
  </div>
{/if}

<!-- ------------------------------------- -->
<!-- --- Interaction behavior section ---- -->
<!-- ------------------------------------- -->
<div class="setting-group">
  <SettingItem isHeading={true} name="Interaction behavior" />

  <div class="setting-items">
    <!-- Calendared: named as an action, and says where it asks (upstream: "Creation confirmation") -->
    <SettingItem
      name="Confirm before creating notes"
      description="From the calendar, period breadcrumbs, mini calendar or Open now. Commands never ask."
    >
      {#snippet control()}
        <Toggle
          onChange={handleShouldConfirmBeforeCreate}
          isEnabled={$settingsStore.shouldConfirmBeforeCreate}
        />
      {/snippet}
    </SettingItem>

    <SettingItem
      description="Show a button in every note's header that opens now's note: today's, or this week's if daily notes are off, and so on."
    >
      {#snippet name()}{@render buttonName(openNowIcon(), "Open now button")}{/snippet}
      {#snippet control()}
        <Toggle
          onChange={(openNowHeaderButton) => settingsStore.update((s) => ({ ...s, openNowHeaderButton }))}
          isEnabled={$settingsStore.openNowHeaderButton}
        />
      {/snippet}
    </SettingItem>
  </div>
</div>

<!-- ------------------------------------- -->
<!-- --- Localization section ---- -->
<!-- ------------------------------------- -->
<div class="setting-group">
  <SettingItem isHeading={true} name="Localization" />
  <div class="setting-items">
    <!-- Calendared: says where the language shows, and that file names don't follow it -->
    <SettingItem
      name="Calendar language"
      description="Month and weekday names in the calendar, period breadcrumbs and mini calendar. File names use Obsidian's language."
    >
      {#snippet control()}
        <Dropdown
          options={getLanguageOptions()}
          onChange={handleSetLanguage}
          value={$settingsStore.localeSettings.localeOverride}
        />
      {/snippet}
    </SettingItem>

    <!-- Calendared: the week start also decides a weekly note's days (docs/adr/0011), which the name doesn't tell -->
    <SettingItem
      name="Week starts on"
      description="Also sets which 7 days a weekly note covers."
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
