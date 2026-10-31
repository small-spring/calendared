# 公開の手続き（参考）

Calendared を Obsidian のコミュニティプラグインとして公開すると決めたときの、決まりと要件と下書き。一度だけの手続きなので、手順書ではなく参考として置く。
**やることの一覧は [todo.md](../todo.md) の「公開の手続き」**（ここには書かない）。

目標は、iPhone でも BRAT を使わずに、コミュニティプラグインから入れて使えるようにすること（2026-10-29 に決めた方向）。
公開が済んだら、このファイルは [archive/](../archive/) に移す（以後のリリースの手順は、公開のときに guides/release.md として書く）。

## 方針（決めたこと）

- **元の版の更新は取り込まない**。決まりは [guides/development.md](development.md) と `CLAUDE.md` に書いてある
- **ライセンスは GPL-3.0**。元の版の LICENSE が GPL-3.0 なので、改変した版も GPL-3.0 でしか公開できない（元の `package.json` だけ MIT と書いてあった）
- **改変したことと日付を示す**。GPL-3.0 は、改変した版に「改変したこと」と「その日付」をはっきり書くよう求めている（第 5 条 a）。
  README の告知とクレジット、[customizations.md](../customizations.md)、コードの `Calendared:` のコメントで示す
- **自分が使わない機能は削る**（手入れが大変なため）。2026-10-29 に、プレビュー欄・フローティング表示・minimal mode の切り替え・
  TODO の引き継ぎ・自然言語の日付を削った（[customizations.md](../customizations.md) の「削った機能」）
- **公開するかは、機能を詰めてパートナーに使ってもらってから決める**（2026-10-30 に決めた。[ADR-0028](../adr/0028-decide-publishing-after-feedback.md)）。README は、仕様が固まってから書く

## 元の作者の許可

Obsidian の開発者ポリシー（Developer policies の「Forks」）では、フォーク（元の版のコードを受け継いだ版）は、次のどちらかを満たさないと
一覧に載せられない。どちらでも、元の作者を貢献者として明記する。満たせなければ、元のコードを受け継がない新しいリポジトリで作り直すしかない。

- A. 元の作者から、誰でも確かめられる形（GitHub の issue など）で、はっきりした許可をもらう
- B. 元の作者に連絡が取れず、6 か月以上更新がないことを示す。そのうえで元の作者に連絡し、30 日待つ

元の版の最後の更新は 2026-02-14（v1.2.1）なので、B の「6 か月」はもう満たしている。issue を出して、30 日たっても返事がなければ B の形で進める。

## issue の下書き

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
- 日本語の説明は [usage-ja.md](usage-ja.md)

## 申請の手順

2026-10-30 の時点の手順（Obsidian のドキュメント「Submit your plugin」）。`obsidianmd/obsidian-releases` への PR ではなくなった。

1. GitHub に Release を作る。タグは `manifest.json` の `version` と同じ。`main.js`・`manifest.json`・`styles.css` を添付する
2. [community.obsidian.md](https://community.obsidian.md) に Obsidian のアカウントでサインインし、GitHub のアカウントを結びつける
3. プラグインを登録する。既定のブランチの先頭の `manifest.json` が読まれる
4. 自動の審査で指摘されたら直し、バージョンを上げた Release を作り直す
