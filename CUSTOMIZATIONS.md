# Calendared のカスタマイズ内容

このリポジトリは [luiisca/obsidian-periodic-notes-calendar](https://github.com/luiisca/obsidian-periodic-notes-calendar)
（v1.2.1, `fe2e262`）をもとにした個人用の改造版です。ライセンスは元と同じ GPL-3.0。

元の版との違いをここに記録します。コード中の変更箇所には `Calendared:` というコメントを付けています。

## 名前・ビルド

- プラグイン id / 表示名を `calendared` / `Calendared` に変更（`manifest.json`, `package.json`）
  - 元: `periodic-notes-calendar` / `Periodic notes calendar`
- `scripts/deploy.sh`（`npm run deploy`）を追加。ビルドして Vault にコピーする

## 依存パッケージと安全対策

- 開発環境は Node.js 24 LTS（Homebrew の `node@24`）、npm 11.19 以上
- `.npmrc` に供給網（サプライチェーン）攻撃への対策を追加
  - `ignore-scripts=true`: 依存パッケージのインストールスクリプトを動かさない
  - `min-release-age=14`: 公開から 14 日たっていないバージョンは入れない（乗っ取られた版の多くはその間に見つかる）
  - 元にあった `resolution-mode=highest` は今の npm では使えない設定なので削除
- 依存の更新は必要なものだけを指定して行う（一括の `npm audit fix` はしない）。更新後は `npm audit signatures` と、
  追加・変更されたパッケージの一覧を確認する
- プラグインに入る部品の既知の脆弱性を解消: Svelte 5.1.10 → 5.57.2、uuid 11.0.3 → 11.1.1（`npm audit --omit=dev` で 0 件）
  - 新しい Svelte では `unmount()` が Promise を返すので、呼び出しに `void` を付けた（6 か所。動作は同じ）
  - 新しい Svelte の svelte-check は「初期値しか見ていない」という警告（`state_referenced_locally`）を元のコードに 20 件ほど出すが、
    動作上の問題ではないので今は残している
  - `tsconfig.json` の `moduleResolution: "node"` のため、svelte-check が依存パッケージ（esrap）の型を見つけられないエラーが 2 件増えた。ビルドには影響しない
- ビルド用の道具（開発用依存）にも既知の脆弱性が残っている（24 件）。ビルドにしか使わないので今は更新していない

## 不具合修正

- 設定画面の Folder / Template 入力欄の候補が、設定モーダルの裏に隠れて見えなかったのを修正
  （`src/settings/ui/suggest.ts`, `src/app.css`）
- カレンダー・タイムラインで選択中の日付の背景色が付かず、文字だけ黒く見えていたのを修正
  （`src/ui/components/core/DateBttn.svelte`）

## 見た目の変更

- 年表示のヘッダー（`src/ui/components/YearHeader.svelte`）
  - 年を 4 桁で表示（元: `26` → `2026`）
  - 右上の 12 年範囲表示（例: `2020-2031`）を非表示。コードはコメントアウトして残してある

## カレンダーのナビゲーション

- Day / Month / Year のタブを廃止（`src/ui/components/Calendar.svelte`）
  - カレンダーは常に日のビュー。年の横のシェブロン（⌄）で月を選ぶ吹き出し（`src/ui/components/MonthPicker.svelte`）を開く
    - 吹き出しの中の ‹ › で年を移動し、月をクリックするとその月を表示して閉じる（ノートは開かない。右クリックメニューは元のまま）
    - 吹き出しの中の年の表記は、ヘッダーと同じく年次ノートを開く（なければ作る）。押すと吹き出しは閉じる
    - 外側のクリックか Esc で閉じる。カレンダー上のクリックで閉じたときは、そのクリックでノートを開かない
  - 月次・年次ノートを開いたときにカレンダーのタブを切り替える処理を削除（`src/ui/components/timeline/manager.ts`）
  - 元の月・年のビュー（`YearHeader`, `YearsHeader`）は、設定で日（または月）を無効にしたときだけ表示される
  - 月・年のビューで月・年をクリックすると、ノートを開く代わりに一つ下のビューへ移動する
- ヘッダーを 1 行に再構成（`src/ui/components/core/Header.svelte`）
  - 並び: `[月] ‹ › [年] ⌄ …… ⌖`。元は大きなタイトル＋右上に年、その下に `‹ • ›`
  - 月・年タイトルの下のドットは、そのノートがあるかどうか（日付のドットと同じ意味）
  - 元の `•`（今月に戻る）は右端の locate-fixed アイコンに変更。今月表示中は薄くなる
  - タイトルの文字サイズは常に元の minimal mode 相当
  - 月タイトルの幅は「その言語で一番幅の広い月名」に固定し、月が変わっても ‹ › が動かないようにした（`widthSamples`）。数字は等幅
  - ‹ › は小さめで月タイトルの下端に揃える。⌖ はカレンダーの右端の列（日曜）の中央に揃える
  - 月・年のタイトルは `src/ui/components/core/PeriodTitle.svelte` に切り出し、ヘッダーと月の吹き出しで共通にした。
    ルール: 年・月の表記を押すとそのノートを開く（なければ作る）
- カレンダーのペインの左右の余白を揃えた（`src/app.css` の `#pnc-calendar-parent`。元は右だけ余白なし）
  - `DateNavigator.svelte` は使われなくなったが、ファイルは残してある
- `DateBttn` に `onSelect` を追加。指定するとクリックでノートを開く代わりにそれを呼ぶ

## ノートの作成

- 設定で無効にしている周期（例: 年）のノートは作らない（`src/io/create-or-open-note.ts`）。既にあるノートは今までどおり開く
  - カレンダーのタイトル、コマンドパレットの「Open yearly note」なども同じ。作ろうとすると通知を出す
  - タイトルも、ノートがなく作れないときはクリックできる見た目（枠・背景の変化）にしない（`PeriodTitle.svelte`）

## タイムライン（周期ノートの右上）

- `src/ui/components/timeline/Timeline.svelte`
  - 開閉ボタンの横の相対表記（「今日」「3日前」など）を削除。週を動かしても文字が変わらない
  - `‹ • ›` を `‹ ›` と ⌖（locate-fixed）に分けた。⌖ は開いているノートの日付に戻る（元はノートも開き直していたが、それはやめた）。
    ノートの日付を表示中は薄くなる。矢印の大きさはカレンダーのヘッダーと同じ

## リファクタ（段階 1・2）

- 使われなくなったコードを削除: `DateNavigator.svelte`、`getRelativeDate` と `HUMAN_FORMATS_PER_GRANULARITY`、年ヘッダーの使われていない変数とコメントアウト
- 元のコードの ESLint 警告（14 件、未使用の import・変数など）を解消。`npx eslint ./src` で警告 0
- `PeriodTitle` の class を `className`（外枠の配置）と `textClassName`（文字の大きさ・色）に分けた。
  元は `ml-4` が二重にかかっていたので、年タイトルは `ml-8` 1 つにした（間隔は同じ。年の下のドットは文字の真下になった）
- Obsidian 本体へのアクセスを `PluginService.getPlugin()?.app` に統一（`window.app` の直接利用をなくした）
- 「読むだけで再描画させる」書き方を、`notesChangedStore`（`src/stores/notes.ts`）を読む形に統一。
  ノートの情報を描き直す理由が 1 か所に名前付きでまとまった（中身は今までと同じ: 設定かファイルの変化で発火）

## やりたいことメモ（未着手）

- カレンダーの選択状態を、カレンダー以外から開いたノートにも追従させる
  - 症状: カレンダーから 29 日を開くと 29 日が選択されるが、ファイルエクスプローラーや Cmd+D（Obsidian 本体の Daily notes の
    「今日のデイリーノートを開く」）で別のノートを開いても、選択と表示中の月がカレンダーで最後に操作したときのまま
  - 原因（調査済み）: 選択中のノート（`activeFileStore`）を更新しているのは、カレンダーからノートを開いたとき（`createOrOpenNote`）など
    プラグイン自身の操作だけ。ほかの方法で開いたときの追従（設定の `syncCalendar`）は `TimelineManager` の中にあり、
    タイムラインを無効にしている（今の設定）とこの処理自体が動かない
  - 方針案: Obsidian の `file-open` イベントで、開いたのが周期ノートなら `activeFileStore` と表示中の月を更新する。
    ノートを開くたびにファイル名を 1 回判定するだけなので、負荷はほぼない

- 状態管理の作り直し（リファクタ段階 3）: ノートの一覧を設定から切り離す、`internalFileModStore` の `Math.random()` による合図をやめる、など。
  先に処理部分のテストを書いてから
- スマホでの見え方の確認（優先度低）
