# 開発のしかた

## 環境

- Node.js 24 LTS（Homebrew の `node@24`）、npm 11.19 以上

## ビルドと Vault への反映

- `npm run build`: ESLint をかけてからビルドする
- `npm run deploy`（`scripts/deploy.sh [Vault のパス]`）: ビルドして Vault の `.obsidian/plugins/calendared/` にコピーする。
  Vault の既定は `~/Documents/Obsidian/private`（環境変数 `OBSIDIAN_VAULT` でも指定できる）
  - `DEPLOY_MODE=development npm run deploy` で開発用の版を入れる。窓口の読み直しの時間などを Console に出す（`import.meta.env.DEV`）。
    Svelte の確認処理も入るので、本番の版より遅い。試し終わったら `npm run deploy` で本番の版に戻す
  - ビルドの前にテスト（`npm test`）を動かし、落ちたらコピーしない
  - コピーの前に読み込み確認（`scripts/check-load.cjs`）をする。ビルドした `main.js` を Node.js で、偽物の Obsidian
    （何を聞かれても何かを返す Proxy）を使って読み込み、読み込み中に落ちたらコピーしない。
    読み込み順の不具合（例: `Cannot access 'X' before initialization`）は型チェックや ESLint では見つからないため
  - 動作や見た目は確かめないので、Obsidian での確認は別に必要
- Windows・iPhone で試すときは [device-testing.md](device-testing.md)（Remotely Save で Calendared のフォルダだけを同期する）
- `npm run check`: svelte-check。残っている既知の警告・エラー:
  - 設定画面のトグル（`Toggle.svelte`）のアクセシビリティの警告 2 件
  - emoji-mart の型定義ファイルの中のエラー 2 件（部品の側の問題。ビルドには影響しない）
  - `Format.svelte` の `tabindex` の型のエラー 1 件（元の版から）

## テスト

`npm test`（1 回動かす）/ `npm run test:watch`（ファイルを保存するたびに動かす）。道具は Vitest。設定は `vitest.config.ts`。

- 対象は画面や Obsidian に関係しない処理（日付の計算、テンプレートの置き換え、ファイル名の読み取りなど）。
  テストは対象のファイルの隣に `<名前>.test.ts` で置く
- 進め方は t-wada（和田卓人さん）の考え方に沿う
  - 既存のコードを作り直す前に、今の振る舞いをそのまま固定するテスト（仕様化テスト）を書く。おかしいと思った振る舞いも、
    まずはそのまま固定し、テスト名に【気になる点】と書いて [todo.md](todo.md) に回す
  - 新しく作る・直すときは、先にテストを書いて失敗を確かめ（Red）、通るように作り（Green）、整える（Refactor）
  - テストを書いたら、一度コードをわざと壊して、そのテストが落ちることを確かめる（落ちないテストは何も守っていない）
  - テスト名は日本語で、何を確かめているか（仕様）が読んで分かるように書く。1 つのテストでは 1 つの振る舞いを確かめる
  - 計算は Obsidian に関係する部分から切り離して、Obsidian なしでテストできるところに置く（例: `src/periods.ts`）
- Obsidian の外で動かすための仕掛け
  - `src/test-setup.ts`: Obsidian と同じ版の moment（2.29.4、開発用の依存）を `window.moment` に置く。
    テストごとに言語を英語、時計を本物に戻す
  - `src/test-obsidian.ts`: `obsidian` の代わり（npm の `obsidian` は型定義だけで中身がない）。テストする処理が読み込み時に使うものだけ置く
  - 設定のストアなど、Obsidian につながる部品は、テストの中で `vi.mock` で置き換える（例: `src/io/validation/index.test.ts`）。
    置き換えるのは外側だけにして、テストしたい処理そのものは置き換えない
  - ESLint の「moment を直接読み込まない」決まりは、テストのファイルでは外している（`eslint.config.js`）

## 依存パッケージと安全対策

`.npmrc` で供給網（サプライチェーン）攻撃に備えている。

- `ignore-scripts=true`: 依存パッケージのインストールスクリプトを動かさない
- `min-release-age=14`: 公開から 14 日たっていないバージョンは入れない（乗っ取られた版の多くはその間に見つかる）

更新のしかた:

- プラグインに入る部品（`dependencies`）は、必要なものだけをバージョンを指定して更新する
- ビルド用の道具（`devDependencies`）は、今のバージョン範囲の中での更新（`npm audit fix`。`--force` は使わない）にとどめる
- どちらも更新後に、追加・変更されたパッケージの一覧、公開からの日数、`npm audit signatures`、ビルド・ESLint・読み込み確認を見る

- メジャー更新（大きな版の更新）も、既知の脆弱性を解くために必要なら行う。そのときは上の確認に加えて、Obsidian での動作確認をする
  （2026-10-29 に Vite 5 → 7、vite-plugin-svelte 4 → 6、Vitest 5 を入れた）

2026-10-29 の時点で、プラグインに入る部品の既知の脆弱性は 0 件（`npm audit --omit=dev`）。ビルド用の道具には 9 件（critical 0 件）残っている。
古い picomatch（ほかの道具の中）、moment の言語名の扱い、eslint-plugin-obsidianmd 経由のものなど。
どれも開発用サーバーや細工した入力が前提で、このプロジェクトでの実害はない。
Vitest 3 には critical が 2 件あった（テスト用サーバー経由のファイル読み出しなど）ので、直っている Vitest 5 を使っている。

## 絵文字の検索の言葉

`data/emoji-keywords/<言語>.json` は `node scripts/build-emoji-keywords.mjs` で、Unicode CLDR の注釈
（開発用の依存 `cldr-annotations-full` / `cldr-annotations-derived-full`）から生成する。プラグインには同梱せず、
ユーザーが設定で言語を追加したときに、jsDelivr 経由でこのリポジトリから取る（[stickers.md](spec/stickers.md) の 10 章）。

- 作り直したら、`src/emoji-search.ts` の `EMOJI_DATA_SIZES_KB`（言語ごとの大きさ）を直す。ずれているとテストが落ちる
- 作り直したファイルをコミットして push してから、そのコミットの ID を `EMOJI_DATA_REF` に書く（プラグインはそのコミットから取る）。
  前のデータを保存している人は、版が変わるので入れ直しが要る
- CLDR を新しい版にしたら、`data/emoji-keywords/README.md` と `THIRD_PARTY_NOTICES.md` の版も直す
- 手元で試す: リポジトリを小さなサーバーで配り、ダウンロード先をそこに向けた開発用の版を入れる。終わったらサーバーを止める

  ```bash
  python3 -m http.server 8765 --bind 127.0.0.1
  VITE_EMOJI_DATA_BASE=http://localhost:8765/ DEPLOY_MODE=development npm run deploy
  ```
- jsDelivr と GitHub の raw は公開リポジトリしか配れないので、本番の版のダウンロードは、リポジトリを公開にするまで失敗する

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
