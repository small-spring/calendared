# Emoji search keywords

Search keywords for Calendared's sticker picker, one file per language (`<language>.json`). Each file maps an emoji-mart
emoji id to the words that find it in that language, for example `{ "+1": ["いいね", "グッド", "サムズアップ", "親指", ...] }`.

Calendared does not bundle these files. When you add a language under "Emoji search languages" in the settings, it
downloads that language's file once, from this repository through jsDelivr (`cdn.jsdelivr.net`), or from GitHub
(`raw.githubusercontent.com`) if jsDelivr can't be reached, and keeps it in the plugin's folder. Sanskrit, which
emoji-mart also translates to, has no file: CLDR has almost no emoji words in it.

## Source

The keywords are derived from the emoji annotations of the Unicode Common Locale Data Repository (CLDR), version 48.2.0,
as published on npm in `cldr-annotations-full` and `cldr-annotations-derived-full`.

They were generated and modified by `scripts/build-emoji-keywords.mjs` in this repository: for each emoji in
`@emoji-mart/data` (set 15), the CLDR spoken name (split at the colon, as in "旗: 日本") and keywords are joined into one
list without duplicates, and keyed by emoji-mart's emoji id.

This data is not an official Unicode product.

## License

The CLDR data is © Unicode, Inc. and is used under the Unicode License v3. The copyright and permission notice is in
[LICENSE](LICENSE) in this folder.

The emoji ids are from `@emoji-mart/data` (MIT License; see `THIRD_PARTY_NOTICES.md` at the root of this repository).
