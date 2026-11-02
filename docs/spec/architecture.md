# コードの地図

`src/` のどこに何があるかと、主な処理の流れ。初めてコードを読むときの入口。細かい決まりは、各ファイルの頭のコメントと、リンク先の ADR にある。

## 全体の形

- 入口は `src/main.ts`（プラグインの本体。Obsidian が読み込む）。起動の処理、コマンド、Obsidian のイベントの受け口がここにある
- 画面は Svelte 5 の部品（`*.svelte`）。Obsidian の画面（ペイン、見出しバーのボタン、右クリックのメニュー、設定画面）に部品をはめ込む
- 計算は Obsidian から切り離して `src/` の直下に置き、Vitest でテストする（`periods.ts` など。テストは隣の `*.test.ts`）。
  Obsidian に触れるのは `io/`・`ui/`・`settings/` と `main.ts`
- 状態は Svelte のストア（`stores/`、`settings/store.ts`）。ただし、Obsidian が知っていること（ファイル、プロパティ、開いているノート）は
  写しを持たず、窓口 `io/vault-source.ts` から毎回読む（[ADR-0016](../adr/0016-vault-source.md)）
- `@/` は `src/` を指す（`config/vite.config.ts`・`config/vitest.config.ts`・`tsconfig.json`）

## フォルダとファイル

### src/ の直下（Obsidian に関係しない計算。ほぼすべてにテストがある）

| ファイル | 役目 |
| --- | --- |
| `main.ts` | プラグインの本体。設定の読み込み、コマンド、イベント（ノートを開いた・作った・名前を変えた）の受け口 |
| `view.ts` | カレンダーのペイン（Obsidian の `ItemView`）。中身は `ui/components/view/View.svelte` |
| `periods.ts` | 周期（日・週・月・四半期・年）の計算。周期の名前（`PeriodName`）、範囲、前後への移動、名前の読み書き（[spec/periods.md](periods.md)） |
| `weeks.ts` | 週の決め方（週の始まり、週番号。[ADR-0011](../adr/0011-week-follows-calendar.md)・[0014](../adr/0014-swappable-week-scheme.md)） |
| `format-tokens.ts` | 名前の書式を記号に分ける・周期ごとに使える記号（[ADR-0040](../adr/0040-format-tokens-per-period.md)・[0041](../adr/0041-own-format-tokenizer.md)） |
| `navigation.ts` | パンくずとミニカレンダーに何を並べるか（[ADR-0031](../adr/0031-breadcrumbs-and-mini-calendar.md)） |
| `migrations.ts` | 移行で何を変えるかの計画（実行は `settings/ui/migrations/run.ts`。[spec/migrations.md](migrations.md)） |
| `stickers.ts` | ノートのステッカーを読む（書くのは `ui/utils/emoji-picker.ts`。[spec/stickers.md](stickers.md)） |
| `emoji-search.ts` | ステッカーのピッカーを英語以外で検索する（言葉のデータは別にダウンロード） |
| `calendar-locale.ts`・`localization.ts`・`locales.ts` | カレンダーの言語（月・曜日の名前）、Obsidian の言語の読み取り、言語の一覧 |
| `period-words.ts` | 周期の言い方（「Today's note」など）。設定・通知・コマンドで共通 |
| `today.ts` | 「今日」を決める（日付が変わったら進める） |
| `constants.ts` | 周期の一覧（`granularities`）、既定の書式、ペインの種類の名前など |
| `app-service.ts` | プラグインのインスタンスをどこからでも取り出す（`PluginService.getPlugin()`） |
| `utils.ts` | 小さな道具 |
| `test-setup.ts`・`test-obsidian.ts`・`test-fixtures.ts` | テストの仕掛け（[guides/development.md](../guides/development.md) の「テスト」） |

### io/（Vault とノートの読み書き）

| ファイル | 役目 |
| --- | --- |
| `vault-source.ts` | Obsidian が知っていることを読む唯一の窓口（ファイル、フォルダ、メタデータ、開いているノート）。変化を知らせて描き直させる |
| `vault.ts` | 周期と日付からノートのパスを決める・ノートを探す（`getNotePath`・`noteAt`・`getFileData`）、テンプレートを読む |
| `create-or-open-note.ts` | ノートを開く。なければ（確認してから）テンプレートで作って開く（`createOrOpenNote`・`openCurrentNote`） |
| `notes-by-format.ts` | フォルダの中で書式に合うノートと、ノートの周期を求める（[ADR-0044](../adr/0044-periodic-notes-in-period-folder.md)） |
| `validation/` | ファイルが周期ノートかどうか（`periodicNoteOf`・`isValidPeriodicNote`）、書式・フォルダ・テンプレートの設定の確かめ |
| `parse.ts` | テンプレートの `{{date}}` などを置き換える |
| `note-path.ts` | パスの組み立て（Obsidian と同じ正規化） |
| `types.ts` | 周期の型（`IGranularity` など） |

### stores/（画面が共有する状態）

| ストア | 持っているもの |
| --- | --- |
| `displayedDateStore`（`dates.ts`） | カレンダーが表示している月（[ADR-0018](../adr/0018-when-displayed-month-changes.md)） |
| `todayStore`（`dates.ts`） | 今日。プラグインが 1 分ごとに確かめる（`refreshToday`） |
| `yearsRanges`（`dates.ts`） | 年のビューの範囲 |
| `themeStore`（`index.ts`） | ライト・ダーク |
| `stickerPickerNoteStore`（`sticker-picker.ts`） | ステッカーのピッカーを開いているノート |

ほかに、設定の `settingsStore` と、設定から作る周期の決まり `periodRulesStore`（週の始まり、四半期・年の始まりの月）が
`settings/store.ts` にある。カレンダーの選択（開いているノート）はストアに持たず、窓口の `activeFile()` から読む
（[ADR-0015](../adr/0015-selection-from-open-note.md)）。状態の作り直しの記録は [state.md](state.md)。

### ui/（画面）

| 場所 | 役目 |
| --- | --- |
| `components/Calendar.svelte` | カレンダー本体（月の表・月の一覧・年の一覧。見出しは `MonthHeader`・`YearHeader`・`YearsHeader`） |
| `components/core/` | カレンダーの部品（日付のボタン `DateBttn`、見出し、矢印など） |
| `components/view/` | カレンダーのペインの中身（`View.svelte`）と、ペインを開く・閉じる処理（`manager.ts` の `ViewManager`） |
| `components/navigation/` | ノートの上のパンくずとミニカレンダー（`Navigation.svelte`）と、タブごとに付け外しする処理（`manager.ts`・`sync.ts`） |
| `components/StickerPicker.svelte`・`sticker-picker.ts` | ステッカーのピッカー |
| `view-actions.ts`・`sticker-actions.ts`・`open-now.ts` | ノートの見出しバーのボタン（ステッカー、Open now） |
| `note-menu.ts` | カレンダーの日付・タイトルの右クリックのメニュー |
| `utils/event-handlers.ts` | カレンダーなどの日付を押した・ホバーしたときの処理（`eventHandlers.onClick` → `createOrOpenNote`） |
| `utils/emoji-picker.ts`・`utils/emoji-locale.ts` | ステッカーを書く・消す、ピッカーの言語 |
| `modals/`・`notice/` | 確認のモーダル、通知の文 |

### settings/（設定）

| 場所 | 役目 |
| --- | --- |
| `constants.ts` | 設定の型（`ISettings`）と既定値（`DEFAULT_SETTINGS`） |
| `store.ts` | `settingsStore`・`periodRulesStore` |
| `migrate.ts` | 保存された設定（`data.json`）を今の形に直して読む（`settingsFromSaved`） |
| `plugin-tab.ts` | 設定画面（Obsidian 1.13 の宣言で書く設定。[ADR-0020](../adr/0020-settings-page-layout.md)） |
| `ui/` | 設定画面に足す部品（書式の欄、件数、移行のページ、絵文字の言語） |
| `period-switch.ts`・`format-on-close.ts`・`migration-notice.ts`・`template-rename.ts` | 周期のオン・オフ、書式を閉じるときの扱い、移行の案内、テンプレートの名前変更への追従 |

## 主な処理の流れ

### 起動（`main.ts` の `onload`）

1. `PluginService.init`・`initVaultSource`（窓口を用意する）
2. `loadSettings`: `data.json` を `settingsFromSaved` で今の形にして `settingsStore` に入れる。以後、`settingsStore` が変わるたびに保存する
3. イベントの受け口、設定画面、コマンド、カレンダーのペインを登録する
4. Obsidian の画面の準備ができたら（`onLayoutReady`）: カレンダーのペインを置き（`ViewManager.initView`）、パンくずとミニカレンダーを各タブに付け
   （`NavigationManager.create().syncAll()`）、見出しバーのボタンを付け、設定にあれば起動時のノートを開く（`openCurrentNote`）

### ノートを開いたとき（`file-open`）

- `onFileOpen`: 周期ノートなら（`periodicNoteOf`）、その期間が表示中の月にかからないときだけ、カレンダーの月を移す
- カレンダーの選択は、窓口の `activeFile()` を読んでいるので、何もしなくても変わる
- 見出しバーのボタン（`stickerActions`・`openNowActions`）と、タブのパンくず・ミニカレンダー（`NavigationManager.syncAll`）を合わせる

### カレンダーの日付を押したとき（ノートを作る道）

`DateBttn` → `eventHandlers.onClick`（`ui/utils/event-handlers.ts`）→ `createOrOpenNote`（`io/create-or-open-note.ts`）
→ `getNotePath` でパスを決める → あれば開く。なければ書式を確かめ（まちがっていれば止めて知らせる。[ADR-0051](../adr/0051-invalid-format-stops-creating.md)）、
確認してからフォルダとテンプレートで作って開く。コマンド・Open now・起動時のノートは `openCurrentNote` から同じ道を通る。

### カレンダーが描かれるとき

`Calendar.svelte` は、`settingsStore`・`periodRulesStore`・`displayedDateStore` から表を作り、各マスのノートとステッカーを
`noteAt`（`io/vault.ts`）と窓口で読む。Obsidian でファイルやプロパティが変わると、窓口が知らせて描き直す（1 フレームにまとめる）。
