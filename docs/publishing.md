# 公開に向けてやること

Calendared を Obsidian のコミュニティプラグインとして公開するまでの、やることの一覧。
目標は、iPhone でも BRAT を使わずに、コミュニティプラグインから入れて使えるようにすること（2026-10-29 に決めた方向）。

- 上の段から順に進める。同じ段の中は、どれからでもよい。ただし 1. の issue は出したら返事を待つだけなので、待つ間に 2.・3. を進める
- 公開は、わかっている不具合を直してから（2026-10-30 に決めた）。README（5.）は、不具合と仕上げ（3.）が済んで仕様が固まってから書く
- 「担当」の「自分」はあなたが手でやること（GitHub への書き込み、決めごと、実機の確認）。「Claude」はコードや文書の作業
- 済んだら `- [x]` にして、末尾に〔日付〕を付ける。全部済んだら、このファイルの中身を [customizations.md](customizations.md) に短くまとめて消す

## 方針（決めたこと）

- **元の版の更新は取り込まない**。決まりは [development.md](development.md) と `CLAUDE.md` に書いてある
- **ライセンスは GPL-3.0**。元の版の LICENSE が GPL-3.0 なので、改変した版も GPL-3.0 でしか公開できない（元の `package.json` だけ MIT と書いてあった）
- **自分が使わない機能は削る**（手入れが大変なため）。2026-10-29 に、プレビュー欄・フローティング表示・minimal mode の切り替え・
  TODO の引き継ぎ・自然言語の日付を削った（[customizations.md](customizations.md) の「削った機能」）
  - 残すもの: 起動時にノートを開く、テンプレートの基本の置き換え、カレンダーの言語の切り替え（作りは直す）、ステッカー、
    1 つの周期に複数の書式を持つ機能（自分は使わないので手入れの優先度は低い）
  - 「周期ノートでないノートにもタイムラインを出す」は 2026-10-30 に作り直した

## 1. 元の作者の許可（いちばん先。ほかの段を止める）

Obsidian の開発者ポリシー（Developer policies の「Forks」）では、フォーク（元の版のコードを受け継いだ版）は、次のどちらかを満たさないと
一覧に載せられない。どちらでも、元の作者を貢献者として明記する。満たせなければ、元のコードを受け継がない新しいリポジトリで作り直すしかない。

- A. 元の作者から、誰でも確かめられる形（GitHub の issue など）で、はっきりした許可をもらう
- B. 元の作者に連絡が取れず、6 か月以上更新がないことを示す。そのうえで元の作者に連絡し、30 日待つ

元の版の最後の更新は 2026-02-14（v1.2.1）なので、B の「6 か月」はもう満たしている。

- [x] 元の版のリポジトリ（luiisca/obsidian-periodic-notes-calendar）に出す issue の文面を下書きする（英語。日本語訳つき。下の「issue の下書き」）— Claude〔2026-10-30〕
- [ ] 下書きを読んで直す。特に、自分の名前・リポジトリの URL・変えたことの一覧 — 自分
- [ ] issue を出す前に、GitHub のリポジトリを公開にするか決める。元の作者が改変の中身を見られるほうが判断しやすい。
  公開にしないなら、下書きからリポジトリへのリンクを消す — 自分
- [ ] issue を出す — 自分
- [ ] 返事を待つ。許可が出たら、issue へのリンクを README のクレジットに書く。30 日たっても返事がなければ、B の形で進める — 自分

### issue の下書き

元の版のリポジトリの Issues に出す。タイトルと本文は英語。`<...>` は出す前に埋める。

**Title**: Permission to publish a modified fork as a separate community plugin

```markdown
Hi Luis,

Thank you for Periodic Notes Calendar. I have been using it every day, and it became the base of my own setup.

Since October 2026 I have been modifying a fork of v1.2.1 for my own use, and the changes have grown large enough
that I would like to publish it as a separate community plugin named **Calendared** (plugin id: `calendared`).
The repository is here: https://github.com/small-spring/calendared

Main differences from the original:

- Stickers are stored in a note property (`sticker: 👍`) instead of tags in the body
- Weeks follow one week scheme (ISO week numbers by default) across the calendar, the timeline and templates
- The timeline is kept per tab, and the calendar reads notes and the open note directly from Obsidian
  (the list of notes is no longer saved in data.json)
- Some features were removed to keep it maintainable: the preview panel, floating mode, minimal mode toggle,
  carrying over TODOs and natural language dates

Obsidian's developer policies ask forks in the community directory to have the original author's explicit,
publicly verifiable permission, so I am asking here:

**Would you allow me to publish this fork as a separate plugin in the Obsidian community directory?**

If you agree, I will:

- keep the GPL-3.0 license and your copyright notice,
- credit you as the original author and a contributor in the README, with a link to this repository and to this issue,
- make it clear that Calendared is a modified version and not maintained by you.

If you would rather not, or if you would prefer that I contribute some of the changes back here instead,
please let me know. Either answer is completely fine.

Thank you,
<名前>
```

日本語訳（自分が内容を確かめるため。出すのは英語だけ）:

> Luis さん、こんにちは。
>
> Periodic Notes Calendar をありがとうございます。毎日使っていて、自分の使い方の土台になっています。
>
> 2026 年 10 月から、v1.2.1 をフォークして自分用に改造してきました。変更が大きくなったので、**Calendared** という名前
> （プラグインの id は `calendared`）の別のコミュニティプラグインとして公開したいと考えています。
> リポジトリはこちらです: https://github.com/small-spring/calendared
>
> 元の版との主な違い:
>
> - ステッカーを、本文のタグではなくノートのプロパティ（`sticker: 👍`）に保存する
> - 週を、カレンダー・タイムライン・テンプレートで 1 つの決め方（既定は ISO の週番号）にそろえた
> - タイムラインをタブごとに持ち、カレンダーはノートと開いているノートを Obsidian から直接読む
>   （ノートの一覧を data.json に保存しなくなった）
> - 手入れできる量に保つため、いくつかの機能を削った: プレビュー欄、フローティング表示、minimal mode の切り替え、
>   TODO の引き継ぎ、自然言語の日付
>
> Obsidian の開発者ポリシーでは、コミュニティの一覧に載せるフォークには、元の作者のはっきりした、誰でも確かめられる許可が
> 必要とされています。そこで、ここでお尋ねします。
>
> **このフォークを、別のプラグインとして Obsidian のコミュニティの一覧に公開してもよいでしょうか？**
>
> 許可していただけたら、次のようにします。
>
> - GPL-3.0 のライセンスと、あなたの著作権表示を残す
> - README で、あなたを元の作者・貢献者として明記し、このリポジトリとこの issue へのリンクを載せる
> - Calendared は改造版で、あなたが手入れしているものではないことを明記する
>
> 望まない場合や、変更の一部をこちらに還元してほしい場合は、教えてください。どちらの答えでもまったく構いません。
>
> よろしくお願いします。
> <名前>

## 2. ライセンスとクレジット

- [x] `LICENSE` は GPL-3.0（元の版のまま）。`package.json` の `license` も `GPL-3.0-only` にした〔2026-10-29〕
- [ ] `THIRD_PARTY_NOTICES.md` を作る — Claude
  - ビルドした `main.js` に入る部品と、そのライセンス（2026-10-30 に確認。どれも MIT。MIT は著作権表示と許諾文を添えるのが条件）:
    emoji-mart 5.6.0、@emoji-mart/data 1.2.1、@floating-ui/dom 1.6.12（と @floating-ui/core・@floating-ui/utils）、clsx 2.1.1、
    emoji-regex 10.4.0、svelte 5.57.2、tailwind-merge 2.5.4、uuid 11.1.1、svelte-writable-derived 3.1.1
  - `src/ui/utils/emoji-keywords/ja.json` は Unicode CLDR のデータから作った。Unicode のライセンスが求める著作権表示とライセンス文を添える
  - 部品を足したり消したりしたら、ここも直す（[development.md](development.md) の「依存パッケージと安全対策」に書き足す）
- [ ] README のクレジット: 元の版の名前とリンク、元の作者（Luis Cadillo / luiisca）、改変したことと日付、GPL-3.0、許可の issue — Claude
- [ ] `package.json` の `author`・`description` を自分の版のものにする（今は元の作者のまま）— Claude（名前は自分が決める）

## 3. 公開の前に直す不具合と仕上げ

わかっている不具合は直してから公開する。iPhone での確認（7.）で見つかったものもここに足す。

- [ ] **言語の扱いを直す**（[todo.md](todo.md) の「1. 公開までに」）— Claude
  - 起動時に、Obsidian 全体の moment（本体とほかのプラグインが共有している）の言語を、Calendared の設定の言語に書き換えている。
    設定が Obsidian の表示言語と同じなら何も変わらないので、自分の Vault では見えていない。違う言語にすると、Obsidian 本体やほかのプラグイン
    （Templater の `tp.date` など）の日付の言葉まで変わり、プラグインを切っても戻らない
- [ ] **絵文字を自分の言語で検索できるようにする**（2026-10-30 に、公開の前に必須と決めた）— Claude
  - 今は日本語の検索の言葉だけを同梱していて、ほかの言語の人は英語でしか検索できない（元の版と同じ）
  - 絵文字ピッカー（emoji-mart）が画面の文言を訳している 20 言語で、検索の言葉（Unicode CLDR から作る）を量ると、合わせて 3.4 MB。
    全部同梱すると `main.js` が約 0.9 MB から約 4.3 MB になり、起動のたびに読み込む。配れるファイルは `main.js`・`manifest.json`・`styles.css`
    だけなので、言語ごとの別ファイルは一緒に配れない
  - 形: 設定に「絵文字を自分の言語で検索する」を置き、ボタンを押したときだけ、その言語のデータをダウンロードしてプラグインのフォルダに保存する。
    2 回目からは通信しない。日本語も同梱をやめれば `main.js` が小さくなる。画面の文言の訳（言語ごとに数 KB）は 20 言語とも同梱してよい
  - 決めること: ダウンロード元（自分のリポジトリの Release に言語ごとのファイルを置くか、jsDelivr から CLDR の元データを取って変換するか）、
    日本語を同梱し続けるか
  - 通信するので、README に、いつ・どこへ通信するかを書く（開発者ポリシーの開示事項）。Unicode のライセンス表示（2.）もダウンロードするデータに合わせる
- [ ] 開発用の版の警告 `lifecycle_double_unmount`（[todo.md](todo.md) の「1. 公開までに」）。本番の版では出ず、害は見えていないが、どこから出ているかは確かめる — Claude
- [ ] 書式を消すときの確認で、ファイル数が実際より多く出る（同じ名前になる書式が 2 つあるとき。[todo.md](todo.md) の「2. 公開後、早めに」）。
  小さな問題なので、公開の前にやるかは決める — 自分
- [ ] 設定画面の文言を、ガイドラインの決まり（見出しは `setHeading()`、文は sentence case、見出しに「settings」と書かない）に合わせて見直す — Claude
- [ ] 設定画面の整理（[todo.md](todo.md) の「設定画面の整理」）。公開の後でもよい — 決めるのは自分

## 4. manifest.json とバージョン

公開の要件: 説明は 250 字以内でピリオドで終え、絵文字を使わず、「This is a plugin」で始めない。寄付を受けないなら `fundingUrl` を消す。
バージョンは `x.y.z` の形で、GitHub の Release のタグ（`v` を付けない）と同じにする。

- [x] `id`: `calendared`。2026-10-30 の時点で、一覧（9,660 件）のどれとも重ならない（id に `obsidian` は入れられない）
- [x] `isDesktopOnly`: `false` のまま。Node.js・Electron の機能は使っていない（2026-10-30 に確認）
- [ ] `version` を決める（例: 1.0.0、または元の版の続きとわかる 2.0.0）— 自分
- [ ] `author`・`authorUrl` を自分にする — 自分が名前を決め、Claude が書く
- [ ] `fundingUrl` を消す（今は元の作者の Ko-fi）— Claude
- [ ] `description` を自分の版の説明にする（英語の案を作る）— Claude、決めるのは自分
- [ ] `minAppVersion`（今は 1.7.7）が、使っている API に合っているか確かめる — Claude
- [ ] `versions.json`（どの版がどの `minAppVersion` から動くかの対応表）を作るか決める。任意 — Claude

## 5. README の書き直し

今の README は、先頭の告知以外は元の版のまま。削った機能（プレビュー、フローティング、自然言語の日付、TODO の引き継ぎ）や、
元のコマンド名・設定の説明が残っている。

- [ ] 英語で、今の仕様にきっちり合わせて書き直す — Claude
  - 何ができるか（カレンダー、タイムライン、ステッカー、周期ノートの設定と書式、週の決め方、コマンド）
  - 使い方、設定、スクリーンショット（撮るのは自分）
  - クレジットとライセンス（2. の内容）
  - 外部への通信はしない（開発者ポリシーで README に書く必要があるのは、通信する場合などなので、書かなくてもよい）
- [ ] 日本語の説明は `docs/` に残す（今のまま）

## 6. リポジトリの整理

- [ ] `CHANGELOG.md`: 元の版の履歴なので、消すか、自分の版の最初のバージョンから書き始める — 決めるのは自分
- [ ] release-please（`release-please-config.json`、`.release-please-manifest.json`）を使い続けるか決める。使わないなら消す — 自分
- [ ] `.github/workflows/main.yml` を作り直す。今は元の版向け（id が `periodic-notes-calendar`、`main` ブランチ、`secrets.PAT` が前提）— Claude
  - 例: タグを push したら、テストとビルドをして、Release に `main.js`・`manifest.json`・`styles.css` を載せる
- [ ] 既定のブランチを決める（`custom` のままか、`main` にするか）。審査は既定のブランチの先頭の `manifest.json` を読む — 自分
- [ ] `upstream` の remote を、元のコードを見比べる参照用に残すか決める — 自分
- [x] `main.js`・`styles.css` は git に入れない（`.gitignore` 済み）。Release に添付する
- [ ] GitHub のリポジトリ（small-spring/calendared）を公開にする。2026-10-30 の時点では外から見えない（GitHub の API で 404）。
  README とライセンス表示が済んでから — 自分

## 7. 確かめる

- [ ] `npm test`・`npm run build`・`npm run deploy` が通る — Claude
- [ ] Release から入れて動くか。BRAT でこのリポジトリを指定して入れるのが手軽 — 自分
- [ ] **iPhone での確認**（公開の前に必須）: 見え方、タップ、右クリックの代わり（長押し）、ホバーを前提にした機能 — 自分
  - 入れ方は [device-testing.md](device-testing.md)（Remotely Save で Calendared のフォルダだけを同期する）か、Release から BRAT で
  - 2026-10-30 に、タイムラインの見え方（見出しバーの下に出る、設定どおりの開閉で始まる）は確かめた
- [ ] Windows での確認（任意。[device-testing.md](device-testing.md)）— 自分

## 8. 申請

2026-10-30 の時点の手順（Obsidian のドキュメント「Submit your plugin」）。`obsidianmd/obsidian-releases` への PR ではなくなった。

- [ ] GitHub に Release を作る。タグは `manifest.json` の `version` と同じ。`main.js`・`manifest.json`・`styles.css` を添付する — 自分（6. の自動化があれば Claude）
- [ ] [community.obsidian.md](https://community.obsidian.md) に Obsidian のアカウントでサインインし、GitHub のアカウントを結びつける — 自分
- [ ] プラグインを登録する。既定のブランチの `manifest.json` が読まれる — 自分
- [ ] 自動の審査で指摘されたら直し、バージョンを上げた Release を作り直す — Claude と自分

## 9. 公開の後（任意）

- [ ] フォーラムの「Share & showcase」や Discord の `#updates` で知らせる — 自分
