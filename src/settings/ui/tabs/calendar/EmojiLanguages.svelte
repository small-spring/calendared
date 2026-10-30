<script lang="ts">
  // Calendared: the languages the sticker picker searches in besides English (src/emoji-search.ts). Their search words
  // are downloaded only from the "Add languages" dialog, and kept in the plugin's folder until removed here
  import { EMOJI_DATA_SIZES_KB } from "@/emoji-search";
  import { SettingItem } from "@/settings/ui";
  import { emojiSearchState, removeEmojiLanguage } from "@/ui/utils/emoji-locale";
  import { useIcon } from "@/ui/utils";
  import { AddEmojiLanguagesModal } from "./add-emoji-languages-modal";
  import { languageNames } from "./language-names";
</script>

<SettingItem name="Emoji search languages">
  {#snippet description()}
    <p class="m-0">
      Search stickers in these languages as well as English. Each language's search words are downloaded once, when
      you add it, from <code>cdn.jsdelivr.net</code> (or <code>raw.githubusercontent.com</code>), and kept in the plugin's
      folder. Only the language is sent.
    </p>
  {/snippet}
</SettingItem>
<!-- the languages sit in a box under the heading above, one compact line each, with "Add languages…" as the box's last
     line (like a settings list's "Add item"), so the list and how to grow it read as one thing -->
<div class="calendared-language-list-box">
  <div class="calendared-language-items">
    {#each $emojiSearchState.installed as language (language)}
      {@const names = languageNames(language)}
      <div class="calendared-language-item">
        <span class="calendared-language-name">{names.native}<span>{names.english} · {EMOJI_DATA_SIZES_KB[language]} KB</span></span>
        <button
          class="clickable-icon"
          aria-label={`Remove ${names.english}`}
          use:useIcon={"trash-2"}
          onclick={() => void removeEmojiLanguage(language)}
        ></button>
      </div>
    {/each}
    {#each $emojiSearchState.downloading as language (language)}
      {@const names = languageNames(language)}
      <div class="calendared-language-item">
        <span class="calendared-language-name">{names.native}<span>{names.english} · Downloading…</span></span>
      </div>
    {/each}
    <button class="calendared-language-item calendared-language-add" onclick={() => new AddEmojiLanguagesModal().open()}>
      <span use:useIcon={"plus"}></span>Add languages…
    </button>
  </div>
</div>
