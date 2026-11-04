# ステッカー（Stickers）

周期ノート（日・週・月・四半期・年）に絵文字を 1 つ付けて、カレンダーのその日付（や月・年）に表示する機能です。
「この日は良かった」「旅行」などの印をシールのように貼るイメージです。

- **第 1 部 使う人向け**: 何ができて、どう動くか（1〜8 章）
- **第 2 部 開発する人向け**: データの流れ、設計判断の記録（ADR）（9〜10 章）。どのファイルにあるかは [code/architecture.md](../code/architecture.md)

---

# 第 1 部 使う人向け

## 1. ステッカーとは

- 1 つのノートに付くステッカーは **1 つ**（絵文字 1 文字）
- ステッカーは **ノートのプロパティ** に保存される（標準は `sticker` という名前のプロパティ）
  ```yaml
  ---
  sticker: 👍
  ---
  ```
- プラグイン側に別の保存場所はない。プラグインを外してもステッカーはノートのプロパティとして残る

## 2. 付け方

次のどれかで絵文字ピッカーを開き、絵文字を選ぶ。

- **ノートの見出しバーのボタン**（おすすめ）: 周期ノートを開くと、右上の閲覧ビュー（本）アイコンの左に 😊+ のボタンが出る（Open now のボタンも出していれば、その左）。
  ステッカーが付いていると、ボタンがその絵文字に変わる。ふつうのノートには出ない。設定で非表示にできる
- **コマンド**: コマンドパレットの「Calendared: Manage sticker」。開いている周期ノートが対象で、ホットキーも割り当てられる
- **カレンダーの日付の右クリック「Manage sticker」**: ノートを開かずに、ほかの日に付けられる。
  ファイルエクスプローラーやノートの「…」メニューには出ない（[ADR-0007](../adr/0007-menu-item-in-calendar-only.md)）

選んだ時点で、そのノートのステッカーのプロパティに書き込まれる（すでにあれば上書き）。
書き込みには Obsidian 公式の仕組み（`processFrontMatter`）を使うので、プロパティ欄がなければ作られ、ほかのプロパティや本文は変わらない。

プロパティ欄を直接編集して `sticker: 🎉` と書いても同じ。

**絵文字の検索**: 英語のほかに、設定の「Emoji search languages」で追加した言語でも検索できる（日本語なら「いいね」→ 👍、
「旅行」→ ✈️、「日本」→ 🗾 🇯🇵 など）。追加できるのは 20 言語。追加した言語の検索の言葉は、そのとき 1 回だけダウンロードして
プラグインのフォルダに保存する（10 章）。ピッカーの文言（「検索」「よく使う絵文字」など）は、追加しなくても Obsidian の表示言語になる

## 3. 設定

「設定 → Calendared → Stickers」にある。

- **Stickers（見出しのスイッチ）**: ステッカー機能全体のオン・オフ。オフにすると、カレンダーでの表示・見出しバーのボタン・
  右クリックの項目・コマンドがすべて消える（ノートのプロパティは消えない）。以下の項目もオンのときだけ表示される
- **Sticker button**: 見出しバーのボタンを出すかどうか
- **Sticker property**: ステッカーを入れるプロパティの名前（以下）

- 標準は `sticker`。`mood` などにしてもよい
- **Obsidian が特別に扱うプロパティは使えない**: `tags`、`aliases`、`cssclasses`（古い単数形の `tag`、`alias`、`cssclass` も）。
  大文字・小文字は区別しない。設定しようとすると通知が出て、元の値に戻る
  - 理由: ステッカーを付けると、そのプロパティの値は **丸ごと上書き** される。
    たとえば `tags: [diary, travel]` のノートに付けると `tags: 👍` になり、自分のタグが消えてしまう
  - 同じ理由で、自分で作ったリスト型のプロパティ（複数の値を入れているもの）も指定しないこと
- 空欄にもできない
- 名前を変えると、**以後は新しい名前のプロパティだけ** を読み書きする。古い名前のプロパティにあるステッカーは表示されなくなる
  （ノートからは消えない）。前のステッカーが残っている間は、欄の下に警告が出て、移行で今のプロパティへ移せる（[migrations.md](migrations.md)）

## 4. 読み方（どれが表示されるか）

設定したプロパティの値を読む。

- 値が **絵文字 1 文字** なら、それを表示する
- 値が **リスト** なら（手で編集したときなど）、最初の「絵文字 1 文字」の要素を表示する
- それ以外（空、文字、`👍👍`、`👍good` など）は、ステッカーなしとして扱う

「絵文字 1 文字」には、肌の色違いや 🇯🇵 のような組み合わせ絵文字も含む。

## 5. 外し方

次のどれかで外す（ステッカーのプロパティが消える）。

- 絵文字ピッカーの一番上の行のゴミ箱アイコン（ステッカーが付いているときだけ、今のステッカーと並んで出る）
  - キーボードでは、検索欄で ↑ を押すとゴミ箱に移り、Enter で外す。ゴミ箱で ↓ を押すと検索欄に戻る。
    絵文字を選んでいる（↓ で絵文字の一覧に入った）ときの ↑ は、今までどおり 1 段上へ移る（一番上の段からは検索欄へ戻る）
- コマンド「Calendared: Remove sticker」（開いている周期ノートにステッカーがあるときだけパレットに出る）
- カレンダーの日付の右クリック「Manage sticker」で開いたピッカーの「Remove sticker」
- ノートのプロパティ欄から、ステッカーのプロパティを手で消す

## 6. Metadata Menu との関係

[Metadata Menu](https://github.com/mdelobelle/metadatamenu) を使っている場合は、fileClass に、設定と同じ名前の項目
（例: `sticker`）を作っておくと、Metadata Menu の画面からもステッカーを編集できる。
カレンダーや見出しバーのボタンで付けた値も、Metadata Menu で入れた値も、同じプロパティなのでどちらからも見える。

- 項目の型は、1 つの値を入れるもの（Input や Select など）にする
- 本文に書く「インライン項目」（`sticker:: 👍`）は **読まない**。プロパティ欄（frontmatter）の値だけを使う

Metadata Menu を使っていなくても、Obsidian 標準のプロパティ欄で同じように扱える。

## 7. 元の版のステッカーについて（移行）

元の版（Periodic Notes Calendar）は、ステッカーを本文中のタグ（`#絵文字` や `#sticker/絵文字`）として保存していた。
Calendared ではタグ形式を **読まない** ので、元の版で付けたステッカーはカレンダーに表示されない。

移行（タグ → プロパティへの書き換え）の機能は、この機能からは切り離した。
元の版にあった「Sticker prefix」「Migrate stickers」「Backup」の設定も削除している。
必要になったら、移行用の機能を別に作る（[todo.md](../todo.md) 参照）。

## 8. わかっている制限

- 1 つのマスに表示できる絵文字は 1 つなので、ステッカーも 1 ノート 1 つ
- スマホでは、見出しバーのボタンの出方が変わる（「…」の中に入るなど）。未確認

---

# 第 2 部 開発する人向け

## 9. データの流れ

**付けるとき**

0. `stickersEnabled` がオフなら、どの入口も出ない（`stickerFrom` も常に「なし」を返す）
1. 見出しバーのボタン・コマンド・カレンダーの右クリックの「Manage sticker」が、どれも `openStickerPicker`（`src/ui/sticker-actions.ts`）を呼ぶ。
   対象ノートの情報を `stickerPickerNoteStore` に入れ、絵文字ピッカーの吹き出しをボタン（やメニュー）の位置に開く
2. 絵文字を選ぶと `initializePicker` の `onEmojiSelect` が、**その時点の** `stickerPickerNoteStore` からノートを取り、`setSticker` を呼ぶ
3. `setSticker` が `app.fileManager.processFrontMatter` で、設定のプロパティに絵文字を書く

**表示するとき**

1. Obsidian がノートのメタデータ（frontmatter を含む）を更新すると `metadataCache` の `changed` が来る
2. 窓口（`src/io/vault-source.ts`）がそれを受けて、次のコマで読んでいる場所に読み直させる（[ADR-0016](../adr/0016-vault-source.md)）
3. 日付ボタン（`DateBttn.svelte`）や見出し、タイムラインが `noteAt` を呼び直し、窓口から読んだメタデータを `stickerFrom`（`src/stickers.ts`）でステッカーにして、表示が変わる

**見出しバーのボタン**

- `StickerActions.refresh()` が、開いている Markdown ビューすべてについて、周期ノートならボタンを付け（`view.addAction`）、
  そうでなければ外す。ボタンの見た目は、ステッカーがあればその絵文字、なければ 😊+ アイコン
- `addAction` は新しいボタンを左端に入れるので、作ったあとに Open now のボタンの左へ移す（`ViewActions` の `ACTION_ORDER`）。
  出たり消えたりするこのボタンを左に置くと、いつも出ている Open now の位置が動かない
- `stickersEnabled` か `stickerHeaderButton` がオフなら、すべて外す
- 呼ぶきっかけ: `file-open`（ノートを開いた）、`layout-change`（タブの並びが変わった）、`metadataCache` の `changed`（プロパティが変わった）、設定の変更。
  `changed` は入力のたびに来るので、ステッカーが変わったときだけ描き直す
- パンくずとミニカレンダー（`NavigationManager`）とは独立している。あちらは `resize` のときだけ付け直す作りなので、それに相乗りしない
- パンくずとミニカレンダーは見出しバーの下にあり、ボタンは見出しバーの中なので重ならない
- プラグインを止めるとき（`onunload`）に `removeAll()` で外す

**絵文字の検索を表示言語に対応させる仕組み**（`src/ui/utils/emoji-locale.ts`）

- emoji-mart の検索は、絵文字データの `id` `name` `keywords` `emoticons` だけを見る（英語）。各キーワードの「先頭一致」で探す
- Unicode CLDR の注釈（言語ごとの絵文字の名前とキーワード）から、言語ごとのキーワード表（`data/emoji-keywords/<言語>.json`、
  絵文字の id → キーワード）を作ってこのリポジトリに置いている。プラグインには同梱しない（20 言語で約 3.4 MB）
  - 作るのは `scripts/build-emoji-keywords.mjs`。元データは開発用の依存 `cldr-annotations-full`（通常の絵文字）と `cldr-annotations-derived-full`（国旗・肌の色など）
  - CLDR は絵文字の異体字セレクタ（U+FE0F）を省いた形で持っているので、それを無視して突き合わせる
  - 国旗の名前は「旗: 日本」のような形なので、`:` で分けて両方をキーワードにする
  - 対象は emoji-mart が文言を訳している言語。Sanskrit は CLDR にほとんど言葉がなく、表が空になるので外した
  - 出どころとライセンス（Unicode License v3）は `data/emoji-keywords/README.md`・`LICENSE` と `THIRD_PARTY_NOTICES.md` に書いた
- 設定の「Add languages」で言語を選んで「Download」を押したときだけ、その言語の表をダウンロードする（`src/emoji-search.ts` の `EmojiKeywordStore`）
  - 取る先は jsDelivr（`cdn.jsdelivr.net/gh/small-spring/calendared@<タグ>/data/emoji-keywords/<言語>.json`）。取れなければ GitHub の raw。
    取る版は `EMOJI_DATA_REF` のタグ（`emoji-data-1` など。動かさない）で固定しているので、公開した版のプラグインが取る中身は変わらない（[ADR-0056](../adr/0056-emoji-data-tag.md)）。送るのはファイルの名前（言語）だけ
  - 中身を確かめてから、データの版（`EMOJI_DATA_REF`）と一緒にプラグインのフォルダの `emoji-keywords/<言語>.json` に保存する。
    どの言語を入れているかは、このファイルで決まる（設定には持たない。新しい端末で勝手にダウンロードしないため）
  - 起動時は保存したファイルを読むだけで、通信しない。データの版が変わったファイルは使わない（入れ直しが要る）
  - 設定には言語ごとの大きさを出す（`EMOJI_DATA_SIZES_KB`。実際のファイルとずれないことをテストで確かめている）
- 入れた言語の表は、ピッカーに渡すデータの `keywords` に、英語の後ろに足す。emoji-mart は最初に受け取ったデータを持ち続け、
  ピッカーを作るたびに `search`（検索用の文字列）がない絵文字だけ作り直すので、いつも同じデータを渡し、言語を足したり消したりしたら
  その中の `keywords` を書き換えて `search` を消す。次にピッカーを開いたときから効く（プラグインを入れ直したあと、Obsidian を再起動するまでは、
  前に読み込んだときのピッカーが使われるので効かない）
- emoji-mart は、英語以外の文言を、渡されないとネットから取りに行く。それを避けるため、`@emoji-mart/data/i18n/<言語>.json`（20 言語、合わせて約 80 KB）を
  同梱し、Obsidian の表示言語（`getLanguage()`、古い版では localStorage の `language`）のものを渡す
- CLDR のデータを新しい版にしたら、同じスクリプトで表を作り直し、コミットして新しいタグを付けてから、そのタグを `EMOJI_DATA_REF` に書く（[guides/development.md](../guides/development.md)）

**実装上の注意**

- 絵文字ピッカー（emoji-mart）はブラウザに `<em-emoji-picker>` を登録する。この登録は Obsidian を再起動するまで残るので、
  プラグインを読み込み直した後は、登録済みのクラス（`customElements.get("em-emoji-picker")`）を使って作る
- 吹き出しは `document.body` に置かれる。プラグインを止めるとき（`onunload`）に片付けないと、次に読み込んだときに古い吹き出しを
  id で拾ってしまう。作るときにも同じ id の残骸を消している（`src/ui/sticker-picker.ts`）

## 10. 設計判断の記録（ADR）

- [ADR-0001 ステッカーはプロパティ 1 つに保存する](../adr/0001-sticker-in-one-property.md)
- [ADR-0002 読むのも設定のプロパティだけ（互換の読み取りをしない）](../adr/0002-read-only-configured-property.md)
- [ADR-0003 移行の機能はステッカー機能から切り離す](../adr/0003-migration-separate-from-stickers.md)
- [ADR-0004 Obsidian の組み込みプロパティは固定の禁止リストにする（編集可能にしない）](../adr/0004-reserved-property-list.md)
- [ADR-0005 上級者向けのタグ形式は作らない](../adr/0005-no-tag-format.md)
- [ADR-0006 見出しバーのボタンは「押すとピッカーが開く」だけにする（ホバーで消す形にしない）](../adr/0006-header-button-opens-picker.md)
- [ADR-0007 右クリックの項目はカレンダーのメニューにだけ出す（「Manage sticker」）](../adr/0007-menu-item-in-calendar-only.md)
- [ADR-0008 月・年などのタイトルにもステッカーを出す（タイムラインの下の帯には出さない）](../adr/0008-stickers-on-titles.md)
