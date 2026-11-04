# 公開の手続き（参考）

Calendared を Obsidian のコミュニティプラグインとして公開すると決めたときの、決まりと要件と下書き。一度だけの手続きなので、手順書ではなく参考として置く。
**やることの一覧は [todo.md](../todo.md) の「公開の手続き」**（ここには書かない）。

目標は、iPhone でも BRAT を使わずに、コミュニティプラグインから入れて使えるようにすること（2026-10-29 に決めた方向）。
公開が済んだら、このファイルは [archive/](../archive/) に移す（以後のリリースの手順は、公開のときに guides/release.md として書く）。

## 方針（決めたこと）

- **元の版の更新は取り込まない**。決まりは [guides/development.md](development.md) と `CLAUDE.md` に書いてある
- **ライセンスは GPL-3.0**。元の版の LICENSE が GPL-3.0 なので、改変した版も GPL-3.0 でしか公開できない（元の `package.json` だけ MIT と書いてあった）
- **改変したことと日付を示す**。GPL-3.0 は、改変した版に「改変したこと」と「その日付」をはっきり書くよう求めている（第 5 条 a）。
  README の Credits（改変した人と、改変を始めた日）と git の履歴で示す（第 5 条 a は、変えた行ごとの印までは求めていない。[ADR-0053](../adr/0053-when-to-update-docs.md)）。
  2026-11-02 までの変更は [archive/customizations.md](../archive/customizations.md) にもまとめてある
- **自分が使わない機能は削る**（手入れが大変なため）。2026-10-29 に、プレビュー欄・フローティング表示・minimal mode の切り替え・
  TODO の引き継ぎ・自然言語の日付を削った（[archive/customizations.md](../archive/customizations.md) の「削った機能」）
- **公開する**（2026-11-04 に決めた。[ADR-0028](../adr/0028-decide-publishing-after-feedback.md) の追記）。パートナーの感想は聞き始めていて、公開の手続きと並べて直していく

## 元の作者の許可

Obsidian の開発者ポリシー（Developer policies の「Forks」）では、フォーク（元の版のコードを受け継いだ版）は、次のどちらかを満たさないと
一覧に載せられない。どちらでも、元の作者を貢献者として明記する。満たせなければ、元のコードを受け継がない新しいリポジトリで作り直すしかない。

- A. 元の作者から、誰でも確かめられる形（GitHub の issue など）で、はっきりした許可をもらう
- B. 元の作者に連絡が取れず、6 か月以上更新がないことを示す。そのうえで元の作者に連絡し、30 日待つ

元の版の最後の更新は 2026-02-14（v1.2.1）なので、B の「6 か月」はもう満たしている。issue を出して、30 日たっても返事がなければ B の形で進める。

## issue の下書き

元の版のリポジトリの Issues に出す。タイトルと本文は英語。2026-11-04 に今の機能に合わせて書き直した。
出す前に、次を確かめる。

- 署名は GitHub の名前（small-spring）にしてある。本名を書くなら差し替える
- リポジトリへのリンクは、出す前にリポジトリを公開にする前提。公開にしないなら、その 1 文を消す
- AI（Claude Code）で書いたことは README の Credits と同じく書いておく（あとで知られるより、先に言うほうが誠実なため）

**Title**: Permission to publish a modified fork as a separate community plugin

```markdown
Hi Luis,

Thank you for Periodic Notes Calendar. What drew me to it was that it can create monthly notes, not just daily notes,
right from the calendar. It was close to what I wanted, so in late October 2026, before using it day to day,
I started customizing a fork of v1.2.1 for my own use.
The changes have grown large enough that I would like to publish it as a separate community plugin
named **Calendared** (plugin id: `calendared`).
The repository is here: https://github.com/small-spring/calendared

Main differences from the original:

- Stickers are saved in a note property (`sticker: 👍`) instead of tags in the body
- The timeline became breadcrumbs (`2026 › Q4 › Oct › W44 › 30th`) and a mini calendar above each note, kept per tab
- Weeks follow ISO 8601 week numbers and start on Saturday, Sunday, or Monday, the same way everywhere
  (file names, the calendar, the breadcrumbs, and templates)
- Quarters and years can start in any month (fiscal years)
- Each period has one format, and only notes in the period's folder count as its notes.
  The calendar reads notes from the vault directly instead of keeping a list in data.json
- A "Migrate notes" section renames old notes after a format change, with a list to check first
- Some features were removed to keep it maintainable: the preview panel, floating mode, the minimal mode toggle,
  carrying over TODOs, and natural language dates

Most of the code was written with Claude Code (an AI coding tool), directed and reviewed by me.

Obsidian's developer policies ask that a fork listed in the community directory has the original author's explicit,
publicly verifiable permission, so I am asking here:

**Would you allow me to publish this fork as a separate plugin in the Obsidian community directory?**

If you agree, I will:

- keep the GPL-3.0 license,
- credit you as the original author and a contributor in the README, with links to your repository and to this issue,
- make it clear that Calendared is a modified version that you do not maintain, and ask users to report problems
  to Calendared, not to you.

If you would rather not, or would prefer that I contribute some of the changes back here instead,
please let me know. Either answer is completely fine.

Thank you,
small-spring
```

日本語訳（内容を確かめるため。出すのは英語だけ）:

> Luis さん、こんにちは。
>
> Periodic Notes Calendar をありがとうございます。惹かれたのは、日のノートだけでなく月のノートも、カレンダーから直接作れることでした。
> 欲しかったものに近かったので、日々使い始める前に、2026 年 10 月の終わりから v1.2.1 をフォークして自分用に改造してきました。変更が大きくなったので、**Calendared** という名前
> （プラグインの id は `calendared`）の別のコミュニティプラグインとして公開したいと考えています。
> リポジトリはこちらです: https://github.com/small-spring/calendared
>
> 元の版との主な違い:
>
> - ステッカーを、本文のタグではなくノートのプロパティ（`sticker: 👍`）に保存する
> - タイムラインを、各ノートの上のパンくず（`2026 › Q4 › Oct › W44 › 30th`）とミニカレンダーにし、タブごとに持つ
> - 週は ISO 8601 の週番号で、始まりは土・日・月から選べる。ファイル名・カレンダー・パンくず・テンプレートのどこでも同じ
> - 四半期と年を好きな月から始められる（年度）
> - 書式は周期ごとに 1 つで、その周期のフォルダにあるノートだけをその周期のノートとして扱う。
>   カレンダーは、ノートの一覧を data.json に持たず、Vault から直接読む
> - 「Migrate notes」で、書式を変えたあとに古いノートの名前を、一覧で確かめてからまとめて変えられる
> - 手入れできる量に保つため、いくつかの機能を削った: プレビュー欄、フローティング表示、minimal mode の切り替え、
>   TODO の引き継ぎ、自然言語の日付
>
> コードの大部分は、Claude Code（AI のコーディングの道具）で、私の指示と確認のもとで書きました。
>
> Obsidian の開発者ポリシーでは、コミュニティの一覧に載せるフォークには、元の作者のはっきりした、誰でも確かめられる許可が
> 必要とされています。そこで、ここでお尋ねします。
>
> **このフォークを、別のプラグインとして Obsidian のコミュニティの一覧に公開してもよいでしょうか？**
>
> 許可していただけたら、次のようにします。
>
> - GPL-3.0 のライセンスを守る
> - README で、あなたを元の作者・貢献者として明記し、あなたのリポジトリとこの issue へのリンクを載せる
> - Calendared は改造版で、あなたが手入れしているものではないことを明記し、不具合は Calendared のほうに知らせるよう書く
>
> 望まない場合や、変更の一部をこちらに還元してほしい場合は、教えてください。どちらの答えでもまったく構いません。
>
> よろしくお願いします。
> small-spring

## ライセンスとクレジット

- `LICENSE` は GPL-3.0（元の版のまま）。`package.json` の `license` も `GPL-3.0-only` にした（2026-10-29）
- `THIRD_PARTY_NOTICES.md` に、ビルドした `main.js` に入る部品のライセンスをまとめた（2026-10-30。どれも MIT。MIT は著作権表示と許諾文を添えるのが条件）:
  emoji-mart 5.6.0、@emoji-mart/data 1.2.1、@floating-ui/dom 1.6.12（と @floating-ui/core・@floating-ui/utils）、clsx 2.1.1、
  emoji-regex 10.4.0、svelte 5.57.2、tailwind-merge 2.5.4、uuid 11.1.1、svelte-writable-derived 3.1.1
  - 部品を足したり消したりしたら、ここも直す（[guides/development.md](development.md) の「依存パッケージと安全対策」）
- 絵文字の検索の言葉（`data/emoji-keywords/`）は Unicode CLDR のデータから作った。Unicode のライセンスが求める著作権表示とライセンス文を、
  `data/emoji-keywords/` と `THIRD_PARTY_NOTICES.md` に置いた
- README のクレジットに書くこと: 元の版の名前とリンク、元の作者（Luis Cadillo / luiisca）、改変したことと日付、GPL-3.0、許可の issue

## manifest.json の要件

- 説明（`description`）は 250 字以内でピリオドで終え、絵文字を使わず、「This is a plugin」で始めない
- 寄付を受けないなら `fundingUrl` を消す
- バージョンは `x.y.z` の形で、GitHub の Release のタグ（`v` を付けない）と同じにする
- 決めたこと: `id` は `calendared`（2026-10-30 の時点で、一覧の 9,660 件のどれとも重ならない。id に `obsidian` は入れられない）。
  `isDesktopOnly` は `false`（Node.js・Electron の機能は使っていない）。`version` は 0.1.0 から（元の版の続きの 1.2.1 だった。
  公開するときの版はそのときに決める）。`author` は small-spring
- `main.js`・`styles.css` は git に入れない（`.gitignore` 済み）。Release に添付する

## README に書くこと

2026-10-31 に、英語で今の仕様に合わせて書き直した。公開するときは、入れ方（今は自分でビルドする形）と、非公開の間の絵文字の言語の注意を書き換える。

- 何ができるか（カレンダー、タイムライン、ステッカー、周期ノートの設定と書式、週の決め方、コマンド）
- 使い方、設定、スクリーンショット
- クレジットとライセンス（上の「ライセンスとクレジット」）
- 通信すること（開発者ポリシーの開示事項）: 絵文字の検索の言語を追加したときだけ、その言語の検索の言葉を jsDelivr（`cdn.jsdelivr.net`）か
  GitHub（`raw.githubusercontent.com`）からダウンロードする。送るのは言語だけ。それ以外は通信しない
- おすすめのキーの割り当て（既定のホットキーは付けない代わり）

## 申請の手順

2026-10-30 の時点の手順（Obsidian のドキュメント「Submit your plugin」）。`obsidianmd/obsidian-releases` への PR ではなくなった。

1. GitHub に Release を作る。タグは `manifest.json` の `version` と同じ。`main.js`・`manifest.json`・`styles.css` を添付する
2. [community.obsidian.md](https://community.obsidian.md) に Obsidian のアカウントでサインインし、GitHub のアカウントを結びつける
3. プラグインを登録する。既定のブランチの先頭の `manifest.json` が読まれる
4. 自動の審査で指摘されたら直し、バージョンを上げた Release を作り直す
