# Calendared のカスタマイズ内容

このリポジトリは [luiisca/obsidian-periodic-notes-calendar](https://github.com/luiisca/obsidian-periodic-notes-calendar)
（v1.2.1, `fe2e262`）をもとにした個人用の改造版です。ライセンスは元と同じ GPL-3.0。

元の版との違いをここに記録します。コード中の変更箇所には `Calendared:` というコメントを付けています。

## 名前・ビルド

- プラグイン id / 表示名を `calendared` / `Calendared` に変更（`manifest.json`, `package.json`）
  - 元: `periodic-notes-calendar` / `Periodic notes calendar`
- `scripts/deploy.sh`（`npm run deploy`）を追加。ビルドして Vault にコピーする

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
- カレンダーのペインの左右の余白を揃えた（`src/app.css` の `#pnc-calendar-parent`。元は右だけ余白なし）
  - `DateNavigator.svelte` は使われなくなったが、ファイルは残してある
- `DateBttn` に `onSelect` を追加。指定するとクリックでノートを開く代わりにそれを呼ぶ

## やりたいことメモ（未着手）

- 設定で無効にしている周期（例: 年）のタイトルを押しても、ノートを作らないようにする
  - 今は `createOrOpenNote`（`src/io/create-or-open-note.ts`）が `enabled` を見ずに作成している
- どこかでリファクタのタイミングを取る
