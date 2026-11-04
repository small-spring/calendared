# Calendared

Obsidian プラグイン。luiisca/obsidian-periodic-notes-calendar（v1.2.1）を改造した個人用の版（GPL-3.0）。
Svelte 5 + TypeScript + Vite + Tailwind。作業ブランチは `custom`。`upstream` は元の版（push 不可）。

人が読んでもよい、開発の要点のまとめ。決まりの本体は `docs/guides/development.md` にあり、ここと食い違ったらそちらが正しい。

## 文書

目次は `docs/README.md`（必要なものだけ読む）。`README.md`（ルート）は使う人向け（英語）。

## 決まり

変更を入れるときの手順と、どの文書をいつ直すかは `docs/guides/development.md` の「変更を入れるときの手順」。要点:

- 毎回直す文書は、コミットメッセージの本文（なぜそうしたか・原因・確かめ方）と `docs/todo.md`（済んだ項目を消す）だけ。文書にはコミット ID を書かない
- 振る舞いの決まりを変えたら `docs/features/`（コードの作りを変えたら `docs/code/`）、設計判断をしたら `docs/adr/` に 1 決定 1 ファイル（`npm run adr` で一覧を作り直す）。README はリリースのときに直す
- 元の版の更新は取り込まない（独立した版として育てる）。元の版のファイルも自由に変えてよい。`Calendared:` の印のコメントは新しく付けない
- 確認は `npm test`、`npm run build`（ESLint・型チェック込み）、`npm run deploy`（テストと読み込み確認をしてから Vault にコピー。
  この手元では `.deploy-vault` に試しの Vault とふだんの Vault の 2 つがあり、両方に入る。Vault の名前は `CLAUDE.local.md`）。動作や見た目は Obsidian で確かめる必要がある
- テストは t-wada の考え方に沿う（作り直す前に今の振る舞いを固定、新しく作るときは先にテスト）
- 文書は日本語で、平易な言葉で書く
