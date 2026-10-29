# Calendared

Obsidian プラグイン。luiisca/obsidian-periodic-notes-calendar（v1.2.1）を改造した個人用の版（GPL-3.0）。
Svelte 5 + TypeScript + Vite + Tailwind。作業ブランチは `custom`。`upstream` は元の版（push 不可）。

## 文書（必要なものだけ読む）

- `docs/customizations.md`: 元の版との違い（今どうなっているか）
- `docs/todo.md`: これからやること（不具合・やりたいこと）
- `docs/development.md`: ビルド・deploy・依存の更新・書き方の決まり
- `docs/stickers.md`: ステッカー機能の仕様と ADR
- `docs/periods.md`: 周期ノートの値の形と週の定義の設計と ADR
- `README.md`: 先頭の告知以外は元の版のまま（英語）

## 決まり

- 元の版から変えたコードには `Calendared:` で始まるコメントを付ける
- なぜそうしたかはコミットメッセージの本文に書く。文書にはコミット ID を書かない
- 変更を終えたら `docs/customizations.md` に 1〜2 行で足し（末尾に〔日付〕）、`docs/todo.md` から消す
- 元の版の更新は取り込まない（独立して公開する方針）。元の版のファイルも自由に変えてよい。機能を削ったときはコードにコメントを残さない
- 確認は `npm test`（Obsidian に関係しない処理のテスト）、`npm run build`（ESLint 込み）、`npm run deploy`（テストと読み込み確認をしてから Vault にコピー）。
  動作や見た目は Obsidian で確かめる必要がある
- テストは t-wada の考え方に沿う（作り直す前に今の振る舞いを固定、新しく作るときは先にテスト）。詳しくは `docs/development.md` の「テスト」
- 文書は日本語で、平易な言葉で書く
