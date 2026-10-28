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
