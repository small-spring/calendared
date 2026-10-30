# 引き継ぎ: パンくずとミニカレンダー（タイムラインの作り直し）

ローカルの Claude Code（Mac）に実装を頼むための引き継ぎ。2026-10-30 にクラウドのセッションで決めたことをまとめた。
この文書だけで作り始められるように書いてある。迷ったら、下の「決まっていないこと」を見て、作る前にユーザーに聞く。
作り終えたら、この文書は消す（中身は spec/ と customizations.md に移る）。

## 頼みたいこと

今の「タイムライン」（周期ノートの上の帯）を、**パンくず** と **ミニカレンダー** の 2 つの機能に分けて作り直す。

- 決めたことと理由: [ADR-0031](../adr/0031-breadcrumbs-and-mini-calendar.md)（まずこれを読む）
- 設定の表と、今の設定からの変わり方: [settings.md](settings.md) の「タイムライン（パンくずとミニカレンダー）」
- 要求の表と、考えた順: [navigation.md](navigation.md)
- 見た目のモック（スマホの画面で押して試せる）: https://claude.ai/artifact/NutaNPPr71vEV82ExgjaG4
  （ユーザーだけが開ける。見た目で迷ったら、ユーザーにモックのどこを見ればよいか聞く）

**範囲に入れないもの**: Open now ボタン（[ADR-0030](../adr/0030-open-now.md)。どのノートに出すかなどがまだ決まっていない）、
設定画面の作り直し（Obsidian 1.13 の宣言で書く形。[ADR-0020](../adr/0020-settings-page-layout.md)）。
今回は、今の Svelte の設定画面（Calendar タブの Timeline の見出し）に項目を足し・消すだけにする。

## 作るものの仕様

モックの画面（今日のデイリーノートを開いているとき）:

```
            2026 › Q4 › 10月 › W44 › 30日              … パンくず（中央揃え）
‹   月 27   火 28   水 29  [木 30]  金 31   土 1   日 2   ›   … ミニカレンダー
```

### パンくず

- 開いているノートの位置を、上の周期から並べる。例: 日 `2026 › Q4 › 10月 › W44 › 30日`、週 `2026 › Q4 › 10月 › W44`、月 `2026 › Q4 › 10月`
- 上の周期を押すと、そのノートを開く（なければ作る。「ノートを作る前の確認」の設定に従う。今のタイムラインの見出しと同じ）
- 一番右（開いているノート自身）を押すと、‹ › で動かしたミニカレンダーがノートに戻る（今の ⌖ の代わり）
- 使っていない（設定でオフの）周期:
  - 週と四半期は **出さない**（例: 週・四半期をオフにすると `2026 › 10月 › 30日`）
  - 月と年は **出すが、押せない**。押せないことを色で示さない（薄くしない）
  - 今のタイムラインの見出しの決まり（`Timeline.svelte` の `showHeading`）と同じ考え
- ミニカレンダーがオフのときは、パンくずの両端に ‹ › を出し、前後のノートを直接開く
- 文字はカレンダーの言語で書く（`src/calendar-locale.ts`）。週は `W44`（週番号は週の決め方の部品から。`weekSchemeFor`）
- 週のノートの年・四半期・月を何にするかは **決まっていない**（下の「決まっていないこと」）

### ミニカレンダー

- 開いているノートと同じ周期を並べる。ステッカーとノートの有無のドットを出す（今の `DateBttn.svelte`・`Sticker.svelte` をそのまま使う。
  ステッカーは数字の右上に傾けて重ねる今の見せ方のまま）
- 今日（週の帯なら今週、月の帯なら今月）は、メインのカレンダーと同じ決まりで色を付ける（`DateBttn` がすでにそうしている）
- 並べ方
  - **日**: 設定「日の並べ方」に従う
    - 週ごと（既定）: カレンダーと同じ週の 7 日。週の始まりはカレンダーの設定（土・日・月。`localeSettings.weekStartId`）
    - ノートを真ん中に: 前後 3 日ずつの 7 日
  - **週・月・四半期・年**: ノートを真ん中に、前後 2 つずつの 5 個
- ‹ › は帯の幅ぶん動く（日は 7 日、ほかは 5 つ）。動かした位置はタブごとに持つ（今の `TimelineSync` と同じく、同じノートを開いている間は残す）
- 今の帯の見出し（W43、Q4 など）と、帯の下の月・年（「10月」「2026」）はなくす（パンくずが代わりになる）
- **戻るボタン**: パンくずがオフで、開いているノートが帯から外れたときだけ、帯の下の区切り線にまたがる形で「30日に戻る」
  （戻る矢印のアイコンとノートの名前）を真ん中に出す。押すと帯がノートに戻る
  - ボタンがないときに空白を残さない。ボタンが出ても ‹ › の場所が動かないようにする（続けて押せるように）。
    帯の端にボタンを足す形は、‹ › の場所がずれてだめだった
  - ノートのタイトルに被らないよう、パンくずがオフでミニカレンダーだけのときは、本文を少し下げておく（ボタンが出ても本文は動かない）

### 両方に共通

- 置き場所: 見出しバーのすぐ下。パンくずが上、ミニカレンダーが下
  - スマホ: 今の作りのまま。見出しバーのすぐ下に置き、本文をその高さぶん下げる（`--pnc-timeline-height`）。
    下へスクロールすると見出しバーと一緒に隠れ、少し上へ戻すと出る（`src/app.css` の `is-hidden-nav`）
  - PC: **決まっていない**（下の「決まっていないこと」）
- たたむボタン（⌃ / ›）と、開閉をタブごとに覚えることはなくす
- 周期ノートでないノート（設定でオンのとき）: 使っている周期のうち一番細かいものの「今」を基準にする
  （日を使っていれば今日。パンくずは今日の位置で、「今日」とは書かない。ミニカレンダーは今日の近く）。
  一番右を押したときの「戻る」先は、その今
- スマホかどうかは `Platform.isPhone`。タブレットはスマホに含めない（サイドのカレンダーを出しておけるため）

### 設定

| 項目 | キー（案） | 値 | 既定（案） |
| --- | --- | --- | --- |
| パンくず › 出す場所 | `timeline.breadcrumbs.placement` | `always` / `phone` / `never` | `always` |
| パンくず › 周期ノートでないノートにも出す | `timeline.breadcrumbs.onOtherNotes` | boolean | false |
| ミニカレンダー › 出す場所 | `timeline.miniCalendar.placement` | `always` / `phone` / `never` | `always` |
| ミニカレンダー › 周期ノートでないノートにも出す | `timeline.miniCalendar.onOtherNotes` | boolean | false |
| ミニカレンダー › 日の並べ方 | `timeline.miniCalendar.dayLayout` | `week` / `centered` | `week` |
| ミニカレンダー › ステッカーを出す | `timeline.miniCalendar.displayStickers` | boolean | true |

- キーの名前は案。読みやすい名前があれば変えてよい
- 今の `data.json` からの読み替え（`src/main.ts` の `loadSettings`。消した設定は `REMOVED_SETTINGS` の形にならって消す）
  - `timeline.enabled` が false → 両方の `placement` を `never`
  - `timeline.displayOnRestNotes` → 両方の `onOtherNotes`
  - `timeline.displayStickers` → `miniCalendar.displayStickers`
  - `timeline.granularityBased`・`timeline.viewMode`・`timeline.restViewMode` は消す（`TimelineViewMode` の型や `VIEW_MODES` も要らなくなる）
- 設定画面の文言は英語。ガイドラインに合わせて sentence case（例: 「Breadcrumbs」「Show on」「Always / Phone only / Never」）

## 今のコードの地図

| ファイル | 役目 |
| --- | --- |
| `src/ui/components/timeline/Timeline.svelte` | 今のタイムラインの画面。帯の日付の計算（`dates`）、見出し、帯の下の月・年、開閉、スマホでの高さの通知 |
| `src/ui/components/timeline/constants.ts` | 周期ごとの並べ方（`G_MAP`）と開閉の値（`VIEW_MODES`） |
| `src/ui/components/timeline/sync.ts`（テストあり） | どのタブにどのノートのタイムラインを付けるか（[ADR-0017](../adr/0017-timeline-per-tab.md)）。開閉の記憶もここ |
| `src/ui/components/timeline/manager.ts` | タブへの付け外し。設定でオンのときだけ動く |
| `src/ui/components/core/DateBttn.svelte`・`Sticker.svelte`・`PeriodTitle.svelte` | 日付のボタン、ステッカー、周期の名前（押すと開く） |
| `src/app.css` | スマホでの置き場所と、スクロールで隠れる動き |
| `src/settings/constants.ts` | 設定の型（`ISettings`）と既定値、消した設定の一覧 |
| `src/settings/ui/tabs/calendar/Index.svelte` | 今の設定画面の Timeline の見出し |
| `src/main.ts` | `loadSettings`（保存された設定の読み替え）、`TimelineManager` の起動 |

## 進め方

決まり（`CLAUDE.md` と [guides/development.md](../guides/development.md)）に沿う。特に:

- Obsidian に関係しない計算（帯に並べる日付、パンくずの並び、設定の読み替え）は、Svelte の外の関数にしてテストを先に書く
  （Red → Green → Refactor。書いたテストは、一度コードをわざと壊して落ちることを確かめる）。今の帯の日付の計算を作り直す前に、
  今の振る舞いを固定するテストを書くかは、作り直す範囲を見て決める（全部置き換えるなら、新しい仕様のテストを先に書けば足りる）
- 元の版から変えたコードには `Calendared:` で始まるコメントを付ける。消した機能のコメントは残さない
- 確認: `npm test`、`npm run build`（ESLint 込み）、`npm run deploy`。見た目と動きは Obsidian でユーザーに確かめてもらう（Mac と iPhone）
- 作り終えたら
  - [customizations.md](../customizations.md) に 1〜2 行で足す（末尾に〔日付〕）
  - [spec/overview.md](../spec/overview.md) の「4. タイムライン」を新しい形に書き直す
  - [settings.md](settings.md) のタイムラインの節は、設定画面の作り直しまで残す
  - ADR-0031 の `implemented` を `true` にして `npm run adr`
  - [todo.md](../todo.md) の設定画面の整理の項目から、タイムラインの作り直しを消す
  - この文書を消す

おすすめの順番:

1. 設定の型と読み替え（テストを先に）
2. 帯に並べるもの・パンくずの並びを計算する関数（テストを先に）
3. 画面: パンくず、ミニカレンダー、戻るボタン。開閉をなくす
4. 設定画面の項目
5. Obsidian で確かめてもらい、直す

## 決まっていないこと（作る前にユーザーに聞く）

- **PC での置き場所**: 今の PC では、ノートの右上に浮いた小さな箱。モックはスマホの画面だけで、PC の形は決めていない。
  案: スマホと同じく見出しバーのすぐ下に横いっぱいに置き、本文を下げる / 今のように右上に浮かせる
- **週のノートの年・四半期・月**: 月をまたぐ週（例: 9月 29日〜10月 5日）のパンくずに、どの月を出すか。
  案: 週番号の年を決める木曜日（ISO 8601）の月。週番号は行の月曜日の ISO 週番号（[ADR-0012](../adr/0012-iso-week-numbers.md)）なので、その週の木曜日に揃えると年もずれない
- **既定値**: 上の表の既定は案（[settings.md](settings.md) の決めることの一覧の #19）
- **パンくずの各周期の名前の書き方**: 日を `30日`（日本語）/ `30`（英語）にするか、月と合わせて `10月30日` にするか。モックは `30日`
