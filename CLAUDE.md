# Calendared

Obsidian プラグイン。luiisca/obsidian-periodic-notes-calendar（v1.2.1）を改造した個人用の版（GPL-3.0）。
Svelte 5 + TypeScript + Vite + Tailwind。作業ブランチは `custom`。`upstream` は元の版（push 不可）。

## 文書

目次は `docs/README.md`（必要なものだけ読む）。`README.md`（ルート）は使う人向け（英語）。日本語の使い方は `docs/guides/usage-ja.md`。機能を変えたら両方を直す。

## 決まり

変更を入れるときの流れの全体は `docs/guides/development.md` の「変更を入れるときの手順」。どこに何を書くかの目安もそこにある。要点:

- 元の版から変えたコードには `Calendared:` で始まるコメントを付ける
- なぜそうしたかはコミットメッセージの本文に書く。文書にはコミット ID を書かない
- 変更を終えたら `docs/customizations.md` に 1〜2 行で足し（末尾に〔日付〕）、`docs/todo.md` から消す
- 設計判断は `docs/adr/` に 1 決定 1 ファイルで書き、`npm run adr` で一覧を作り直す（書き方は `docs/adr/README.md`）
- 元の版の更新は取り込まない（独立した版として育てる。公開するかはパートナーに使ってもらってから決める）。元の版のファイルも自由に変えてよい。機能を削ったときはコードにコメントを残さない
- 確認は `npm test`（Obsidian に関係しない処理のテスト）、`npm run build`（ESLint・型チェック込み）、`npm run deploy`（テストと読み込み確認をしてから Vault にコピー。
  行き先は引数・`OBSIDIAN_VAULT`・`.deploy-vault` の順で、この手元では `.deploy-vault` が private を指す）。動作や見た目は Obsidian で確かめる必要がある
- テストは t-wada の考え方に沿う（作り直す前に今の振る舞いを固定、新しく作るときは先にテスト）。詳しくは `docs/guides/development.md` の「テスト」
- 文書は日本語で、平易な言葉で書く
