# 開発のしかた

## 環境

- Node.js 24 LTS（Homebrew の `node@24`）、npm 11.19 以上

## ビルドと Vault への反映

- `npm run build`: ESLint をかけてからビルドする
- `npm run deploy`（`scripts/deploy.sh [Vault のパス]`）: ビルドして Vault の `.obsidian/plugins/calendared/` にコピーする。
  Vault の既定は `~/Documents/Obsidian/private`（環境変数 `OBSIDIAN_VAULT` でも指定できる）
  - コピーの前に読み込み確認（`scripts/check-load.cjs`）をする。ビルドした `main.js` を Node.js で、偽物の Obsidian
    （何を聞かれても何かを返す Proxy）を使って読み込み、読み込み中に落ちたらコピーしない。
    読み込み順の不具合（例: `Cannot access 'X' before initialization`）は型チェックや ESLint では見つからないため
  - 動作や見た目は確かめないので、Obsidian での確認は別に必要
- `npm run check`: svelte-check。残っている既知の警告・エラー:
  - 設定画面のトグル（`Toggle.svelte`）のアクセシビリティの警告 2 件
  - `tsconfig.json` の `moduleResolution: "node"` のため、依存パッケージ（esrap）の型が見つからないエラー 2 件（ビルドには影響しない）

## 依存パッケージと安全対策

`.npmrc` で供給網（サプライチェーン）攻撃に備えている。

- `ignore-scripts=true`: 依存パッケージのインストールスクリプトを動かさない
- `min-release-age=14`: 公開から 14 日たっていないバージョンは入れない（乗っ取られた版の多くはその間に見つかる）

更新のしかた:

- プラグインに入る部品（`dependencies`）は、必要なものだけをバージョンを指定して更新する
- ビルド用の道具（`devDependencies`）は、今のバージョン範囲の中での更新（`npm audit fix`。`--force` は使わない）にとどめる
- どちらも更新後に、追加・変更されたパッケージの一覧、公開からの日数、`npm audit signatures`、ビルド・ESLint・読み込み確認を見る

2026-10-28 の時点で、プラグインに入る部品の既知の脆弱性は 0 件（`npm audit --omit=dev`）。ビルド用の道具には 11 件残っている。
修正版がまだ 14 日の待ち期間内のもの、メジャー更新が必要なもの（vite 6, vite-plugin-svelte）など。
どれも開発用サーバー（使っていない）や細工した入力が前提で、このプロジェクトでの実害はない。

## 絵文字の日本語キーワード

`src/ui/utils/emoji-keywords/ja.json` は `scripts/build-emoji-keywords.mjs` で、Unicode CLDR の注釈
（開発用の依存 `cldr-annotations-full` / `cldr-annotations-derived-full`）から生成する。

## 書き方の決まり

- 元の版から変えたコードには `Calendared:` で始まるコメントを付ける（何をなぜ変えたか）
- なぜそうしたか・不具合の原因は、コミットメッセージの本文に書く
- 元の版から変えたことは [customizations.md](customizations.md) に 1〜2 行で足す。末尾に〔日付〕を付ける
- 元の版の更新は取り込まない（2026-10-29 に決めた。独立してコミュニティプラグインとして公開するため）。
  元の版のファイル（README、CHANGELOG、release-please の設定、`.github/` など）も自由に変えてよい。
  `upstream` の remote は元のコードを見比べる参照用
- 機能を削ったときは、コードにコメントを残さない（customizations.md に何を削ったかを書く）

## 変更の入ったコミットを探す

文書にはコミット ID を書かない（2026-10-29 に決めた）。元の版を取り込むときの rebase などで ID が変わるのと、
ID はそのコミット自身の中には書けず後から埋める手間がかかるため。必要なときに git で探す:

- `git blame <ファイル>` / `git log -L <開始行>,<終了行>:<ファイル>`: その行を変えたコミット
- `git log -S '<文字列>'`: その文字列を足した・消したコミット（`Calendared:` のコメントの一部などで探す）
- `git log --since=<日付> --until=<日付>`: 項目の日付のころのコミット
