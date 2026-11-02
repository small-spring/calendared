# 開発のしかた

## はじめに（初日の手順）

1. Node.js 24 LTS と npm 11.19 以上を入れる（持ち主は Homebrew の `node@24`）。`package.json` の `engines` と `.npmrc` の
   `engine-strict=true` で、版が古いと `npm install` が止まる
2. リポジトリを取ってきて、部品を入れる

   ```bash
   git clone https://github.com/small-spring/calendared.git
   cd calendared
   npm install
   ```

3. 試しの Vault を各自で作る。Obsidian で空のフォルダを Vault として開くだけでよい。ふだん使う Vault には入れない
   （ノートを作る・設定を変える確かめで、本物のデータが変わる）。持ち主は `~/Documents/Obsidian/calendared-test` を使っている
4. `npm run deploy` の行き先を決める。既定の行き先はないので、次のどれかで指定する（上ほど優先）
   - 引数: `npm run deploy -- ~/path/to/vault`
   - 環境変数: `OBSIDIAN_VAULT=~/path/to/vault npm run deploy`
   - 手元の設定ファイル: リポジトリ直下の `.deploy-vault` に Vault のパスを 1 行書く（git に入らない）。以後は `npm run deploy` だけでよい

   ```bash
   echo ~/path/to/vault > .deploy-vault
   ```

   どれもないと、案内を出して止まる。持ち主は `.deploy-vault` で private の Vault を指している
5. `npm run deploy` を実行する（テスト → ビルド → 読み込み確認 → Vault の `.obsidian/plugins/calendared/` へコピー）
6. Obsidian で、設定 → コミュニティプラグイン → 制限モードをオフにし、Calendared をオンにする（初めの 1 回だけ）
7. コードを変えたら、もう一度 `npm run deploy` して、Obsidian で読み直す（`obsidian plugin:reload id=calendared`。
   下の「Obsidian で確かめる」。CLI を使わないなら、設定でプラグインをオフ → オン）

- コードを読む前に [コードの地図](../spec/architecture.md) を見る。機能と設定の一覧は [spec/overview.md](../spec/overview.md)
- `npm run dev` は、ファイルを保存するたびにリポジトリ直下の `main.js` を作り直すだけで、Vault には入らない。
  型や書き間違いを早く見たいときに使い、Obsidian で試すときは `npm run deploy` する

## 変更を入れるときの手順

1. 新しく作る・直すときは、先にテストを書いて失敗を確かめる（下の「テスト」）。作り直す前は、今の振る舞いを固定するテストを書く
2. 元の版から変えたコードに `Calendared:` で始まるコメントを付ける（下の「書き方の決まり」）
3. `npm test`（日付の計算を変えたら `npm run test:dst` も）と `npm run build`（ESLint・型チェック・ADR の一覧の古さ）を通す
4. `npm run deploy` して、動作と見た目を Obsidian で確かめる
5. 使う人から見える機能を変えたら、[README.md](../../README.md)（英語）と [usage-ja.md](usage-ja.md)（日本語）を両方直す。
   仕様が変わったら [spec/](../spec/) も直す
6. [customizations.md](../customizations.md) に 1〜2 行で足し（末尾に〔日付〕）、[todo.md](../todo.md) から消す
7. 設計判断をしたら [adr/](../adr/) に 1 決定 1 ファイルで書き、`npm run adr` で一覧を作り直す（書き方は [adr/README.md](../adr/README.md)）
8. コミットする。題は日本語で 1 行、本文に、なぜそうしたか・不具合の原因・どう確かめたかを書く。自分が変えたファイルだけを入れる

### どこに書くか（目安）

| 書くこと | 書く場所 |
| --- | --- |
| そのコードが何をするか、元の版から何をなぜ変えたか | コードのコメント（英語。`Calendared:` で始める） |
| その変更の理由、不具合の原因、確かめ方 | コミットメッセージの本文（日本語） |
| 元の版と何が違うか（1〜2 行） | [customizations.md](../customizations.md) |
| 案を比べて 1 つを選んだこと、あとで「なぜこうしたの」と聞かれそうなこと、これからの変更を縛る決まり | [adr/](../adr/)（1 決定 1 ファイル）。1 つの不具合の直し方や、迷わずに決まったことは、コミットの本文で足りる |
| 今どう動くか（仕様） | [spec/](../spec/) |
| これからやること | [todo.md](../todo.md) だけ |

## ビルドと確認

- `npm test`: テスト（下の「テスト」）
- `npm run build`: ESLint（`npm run lint`）→ 型チェック（`npm run check`）→ ADR の一覧が古くないかの確認 → ビルド。どれかが落ちたら止まる
  - 既知の警告: `build.outDir must not be the same directory of root`。プラグインはリポジトリ直下に `main.js`・`styles.css` を
    置く決まりのため（Vault へのコピーと Release がそこから取る）。`emptyOutDir: false` なので、ほかのファイルは消えない
- `npm run check`: svelte-check（TypeScript と Svelte の型チェック）だけを動かす。既知のエラー・警告はない（0 件）。
  ほかの部品の型定義は確かめない（`tsconfig.json` の `skipLibCheck`。emoji-mart の型定義に解けない読み込みがあるため）
- `npm run lint-fix`: 型チェックのあと、ESLint で直せるものを直す。整形の道具（Prettier など）は使っていない。まわりのコードの書き方に合わせる
- `npm run deploy`（`scripts/deploy.sh [Vault のパス]`）: ビルドして Vault の `.obsidian/plugins/calendared/` にコピーする。
  行き先の決め方は上の「はじめに」
  - ビルドの前にテスト（`npm test`）を動かし、落ちたらコピーしない。ESLint と型チェックは動かさない（`npm run build` で確かめる）
  - コピーの前に読み込み確認（`scripts/check-load.cjs`）をする。ビルドした `main.js` を Node.js で、偽物の Obsidian
    （何を聞かれても何かを返す Proxy）を使って読み込み、読み込み中に落ちたらコピーしない。
    読み込み順の不具合（例: `Cannot access 'X' before initialization`）は型チェックや ESLint では見つからないため
  - 動作や見た目は確かめないので、Obsidian での確認は別に必要
  - `DEPLOY_MODE=development npm run deploy` で開発用の版を入れる。窓口の読み直しの時間などを Console に出す（`import.meta.env.DEV`）。
    Svelte の確認処理も入るので、本番の版より遅い。試し終わったら `npm run deploy` で本番の版に戻す
- Windows・iPhone で試すときは [device-testing.md](device-testing.md)（Remotely Save で Calendared のフォルダだけを同期する）
- `npm run emoji-language -- <言語> [Vault のパス]`（`scripts/add-emoji-language.mjs`。Vault は deploy と同じ決め方）: 絵文字の検索の言葉を、ダウンロードせずに
  Vault のプラグインのフォルダに置く（下の「絵文字の検索の言葉」）。リポジトリが非公開の間は、設定からの追加はダウンロードに失敗するので、こちらを使う

### Release

`manifest.json` の `version` と同じタグ（`v` を付けない。例: `0.1.0`）を push すると、ワークフロー（`.github/workflows/main.yml`）が
テストとビルドをして、`main.js`・`manifest.json`・`styles.css` を載せた Release の下書きを作る。GitHub で下書きを確かめ、説明を書いて公開する。

```bash
git tag 0.1.0
git push origin 0.1.0
```

- タグと `version` が違うと止まる。先に `manifest.json` と `package.json` の `version` を上げてコミットする

## Obsidian で確かめる（Obsidian CLI）

動いている Obsidian を、コマンドで操作して確かめられる（Obsidian CLI。`/usr/local/bin/obsidian`、1.12.7 以降。説明は `obsidian help` と
[公式の文書](https://obsidian.md/help/cli)）。Claude もこれで画面を見られる。2026-10-31 に、Obsidian 1.14.5 で試した。

```bash
obsidian plugin:reload id=calendared
```

| 目的 | コマンド |
| --- | --- |
| deploy した版を読み直す | `obsidian plugin:reload id=calendared` |
| ノートを開く | `obsidian open path=04-daily/2026-10-31.md` |
| Obsidian のコマンドを実行する | `obsidian command id=<ID>`（一覧は `obsidian commands filter=calendared`） |
| 画面の文字や属性を読む | `obsidian dev:dom selector=<CSS> text`（`all`、`attr=`、`css=` も使える） |
| JavaScript を実行する | `obsidian eval code="..."`（`app` に触れる） |
| 画面を撮る | `obsidian dev:screenshot path=<ファイル>` |
| スマホの見た目にする | `obsidian dev:mobile on` / `off` |
| エラーとログを読む | `obsidian dev:errors`、`obsidian dev:console` |

気をつけること（公式の文書に書かれていないこと）。Vault の名前とパスは持ち主のもの（ふだんの Vault が `private`、試しの Vault が
`calendared-test`）。自分の Vault に読み替える

- `vault=` を付けないと、いま前にある Vault を触る。設定のトグルを動かしたりノートを作ったりすると、本物のデータが変わる。
  ふだんの Vault では、読む・撮る・開くにとどめる
- ノートを作る・設定を変える確かめは、試しの Vault（持ち主は `~/Documents/Obsidian/calendared-test`）で行う。
  入れるのは `npm run deploy -- ~/Documents/Obsidian/calendared-test`、操作は `obsidian vault=calendared-test …`。
  起動時の動きは、`data.json` を書き換えてから `osascript -e 'quit app "Obsidian"'` → `open "obsidian://open?vault=calendared-test"` で開き直して見る。
  ノートを消すのは `app.vault.trash(file, true)`（シェルからゴミ箱へは移せない）
- 文字で確かめられるものは、`dev:dom` か `eval` で読む。Obsidian が裏にあっても読める
- `dev:screenshot` は、Obsidian が前にないと描き直しが止まっていて、古い画面が写る。撮る直前に `open -a Obsidian` で前に出す
- `dev:screenshot` と `dev:dom` は、メインのウィンドウしか見ない。設定画面は別のウィンドウ（題が「設定 - …」）で開くので、
  `eval` から Electron のウィンドウを探して読む。例（設定の文字を読む）:

  ```bash
  obsidian eval code="(async()=>{const w=require('electron').remote.BrowserWindow.getAllWindows().find(w=>w.getTitle().startsWith('設定')); return await w.webContents.executeJavaScript(\"document.querySelector('.vertical-tab-content')?.innerText\")})()"
  ```

  撮るときは、同じウィンドウで `w.focus()` のあと `w.webContents.capturePage()` の結果を `toPNG()` でファイルに書く。
  設定画面を開くのは `obsidian command id=app:open-settings`、Calendared のページへは `app.setting.openTabById('calendared')`
- 設定画面を開いたまま `eval` でカレンダーを押すと、確認のモーダルや右クリックのメニューは、最後に前にあった設定のウィンドウのほうに出る
  （手で押すときは押したウィンドウが前に来るので起きない）。モーダルは設定のウィンドウの `.modal-container` を読み、メニューの中身は
  `require('obsidian').Menu.prototype.showAtMouseEvent` を一時的に包んで `this.items` を読む。設定を閉じて開き直すと、閉じた設定の
  ウィンドウが隠れたまま残ることがあるので、`isVisible()` のものを選ぶ
- `.` で始まるファイル（`.keep.md` など）は Obsidian のノートとして読まれない（`getAbstractFileByPath` が null）。試すノートには使わない

## テスト

`npm test`（1 回動かす）/ `npm run test:watch`（ファイルを保存するたびに動かす）。道具は Vitest。設定は `vitest.config.ts`。

- `npm run test:dst`: 夏時間のある時間帯（`TZ=America/Santiago`）でテストを動かす。日付の計算を変えたら、`npm test` と一緒に動かす。
  チリは夏時間の始まりに 0 時を飛ばす（2026-09-06 は 1 時から始まる）ので、日付を「その日の 0 時」として扱うまちがいがあると、日がずれて落ちることがある。
  ブラジル（`America/Sao_Paulo`）は 2019 年から夏時間がなく、テストの日付では何も変わらないので、確かめには使えない
  （2026-11-01 に、`America/Santiago`・`America/Sao_Paulo`・`America/Havana`・`Asia/Beirut` で全部通ることを確かめた）

- 対象は画面や Obsidian に関係しない処理（日付の計算、テンプレートの置き換え、ファイル名の読み取りなど）。
  テストは対象のファイルの隣に `<名前>.test.ts` で置く
- 進め方は t-wada（和田卓人さん）の考え方に沿う
  - 既存のコードを作り直す前に、今の振る舞いをそのまま固定するテスト（仕様化テスト）を書く。おかしいと思った振る舞いも、
    まずはそのまま固定し、テスト名に【気になる点】と書いて [todo.md](../todo.md) に回す
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
  - `src/test-fixtures.ts`: 多くのテストで使う道具（日付の `d`・`ymd`、月曜始まり・日曜始まりの決まり `mondayWeeks`・`sundayWeeks`、
    既定の書式 `FORMATS`、ファイルの `md`・`fileAt`、設定の `testSettings`・`settingsModule`）。同じものをテストに書き写さず、ここから読む。
    設定を置き換えるときは `vi.mock("@/settings", async () => (await import("@/test-fixtures")).settingsModule())`
    （`vi.mock` の中身はファイルの頭に移されて先に動くので、道具は中で読み込む）。`settingsModule` は `settingsStore` と
    `periodRulesStore` を返す
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
ユーザーが設定で言語を追加したときに、jsDelivr 経由でこのリポジトリから取る（[stickers.md](../spec/stickers.md) の 10 章）。

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

変更を入れるときの流れは上の「変更を入れるときの手順」。ここは書き方の細かい決まり。

- 元の版から変えたコードには `Calendared:` で始まるコメントを付ける（何をなぜ変えたか）
  - 元の版のファイルの中では、変えた所ごと（関数・行）に付ける。元はどうだったかも短く書く（例: `Upstream used ...`）
  - 新しく作ったファイルは、頭に 1 つ付ければよい（ファイルの役目を書く）。中の関数ごとには要らない
  - `git log -S 'Calendared:'` などで探せるので、言葉は検索しやすく具体的にする
- 言葉: コードのコメント・画面の文・スクリプトの出力は英語。コミットメッセージ（題 1 行 + 本文）と `docs/` の文書は日本語
- なぜそうしたか・不具合の原因は、コミットメッセージの本文に書く（どこに何を書くかは上の「どこに書くか（目安）」）
- 元の版から変えたことは [customizations.md](../customizations.md) に 1〜2 行で足す。末尾に〔日付〕を付ける
- 元の版の更新は取り込まない（2026-10-29 に決めた。独立した版として育てるため。公開するかは [ADR-0028](../adr/0028-decide-publishing-after-feedback.md)）。
  元の版のファイル（README、CHANGELOG、release-please の設定、`.github/` など）も自由に変えてよい。
  `upstream` の remote は元のコードを見比べる参照用
- 機能を削ったときは、コードにコメントを残さない（customizations.md に何を削ったかを書く）

### 画面の文（英語）

- Obsidian のガイドラインに従う。見出しは `setHeading()`（宣言で書く設定では `heading`）、文は sentence case、見出しに「settings」と書かない
- 周期ノートの総称は「periodic note」、周期ごとは小文字の「daily note」など（見出しの「Daily notes」は除く）
- 説明は「何に効くか」か「気をつけること」だけにする。名前で足りるものは説明をなくす
- 見出しバーは Obsidian 本体の言葉で「tab title bar」と書く

## 変更の入ったコミットを探す

文書にはコミット ID を書かない（2026-10-29 に決めた）。元の版を取り込むときの rebase などで ID が変わるのと、
ID はそのコミット自身の中には書けず後から埋める手間がかかるため。必要なときに git で探す:

- `git blame <ファイル>` / `git log -L <開始行>,<終了行>:<ファイル>`: その行を変えたコミット
- `git log -S '<文字列>'`: その文字列を足した・消したコミット（`Calendared:` のコメントの一部などで探す）
- `git log --since=<日付> --until=<日付>`: 項目の日付のころのコミット
