# 文書の目次

Calendared の文書。まず「誰が読むか」で分け、開発向けの中は「何のために読むか」で分ける。必要なものだけ読む。

## 知りたいことから探す

| 知りたいこと | 開く場所 |
| --- | --- |
| 何ができるか、どう使うか | ルートの [README.md](../README.md)（使う人向け、英語） |
| 開発を始めたい（初日の手順） | [guides/development.md](guides/development.md) の「はじめに」 |
| ある機能がどう動くか（端の場合も） | [features/](features/)。まず [features/overview.md](features/overview.md) |
| コードのどこに何があるか | [code/architecture.md](code/architecture.md) |
| なぜそうしたか | [adr/](adr/)。個々の変更の理由はコミットの本文 |
| 次に何をするか | [todo.md](todo.md) |

ここから下は開発向け（日本語）。ルートの README と [screenshots/](screenshots/) だけが使う人向け。

## 機能がどう動くか（features/）

使う人から見える振る舞いと、その細かい決まり（端の場合、ぶつかったときなど）。見出しは設定画面の言葉にそろえる。

- [features/overview.md](features/overview.md): 機能と設定の一覧（まずここ。ファイルを分けていない機能の決まりもここ）
- [features/stickers.md](features/stickers.md): ステッカー（Stickers）
- [features/migrations.md](features/migrations.md): ノートの移行（Migrate notes。書式の変換、ステッカーのプロパティの付け替え、移行の案内）
- [features/quarter-year-start.md](features/quarter-year-start.md): 四半期と年を好きな月から始める（Starts in。年度に合わせる）

## コードの仕組み（code/）

作る人から見える形。コードを読む前に開く。

- [code/architecture.md](code/architecture.md): コードの地図（`src/` のどこに何があるかと、主な処理の流れ）。どのファイルに何があるかは、ここだけに書く
- [code/periods.md](code/periods.md): 周期ノートをプラグインの中でどういう値として持つかと、週・四半期・年の区切りの作り

## 使う人向けの素材（screenshots/）

- [screenshots/](screenshots/): ルートの README に載せるスクリーンショット（撮り直し方はその中の README）

## なぜそうしたか

- [adr/](adr/): 設計判断の記録（ADR）。1 つの決定を 1 つのファイルに書く。一覧と書き方は [adr/README.md](adr/README.md)
- [research/](research/): 決める前に調べたこと（事例など）。調べた日の情報で、あとから更新しない
- 個々の変更の理由や不具合の原因、元の版から何を変えたかは、コミットメッセージの本文（git の履歴）

## これから

- [todo.md](todo.md): 作業の一覧（機能・不具合・公開の手続き・いつか・見送ったこと）。やることはここだけに書く
- [plans/](plans/): これから作るものの設計（目指す姿と、決めることの一覧）
  - [plans/sticker-kinds.md](plans/sticker-kinds.md): ステッカーを複数の種類にする・使う周期を選ぶ（いつか）の設計

## やり方・参考

- [guides/development.md](guides/development.md): はじめに（初日の手順）・変更を入れるときの手順・ビルド・deploy・テスト・依存の更新・書き方の決まり
- [guides/device-testing.md](guides/device-testing.md): Windows・iPhone の実機で試す
- [guides/publishing.md](guides/publishing.md): 公開の手続きの決まり・要件・issue の下書き（公開が済んだら archive/ へ）

## 使い終わったもの

- [archive/](archive/): 済んだ手続きや、役目を終えた文書
  - [archive/device-testing-setup.md](archive/device-testing-setup.md): 実機で試すための一度だけの準備
  - [archive/navigation.md](archive/navigation.md): ノートの間の移動の計画（要求の表。決めたことは ADR-0031）
  - [archive/customizations.md](archive/customizations.md): 元の版との違いの記録（2026-11-02 までの変更。それ以後は git の履歴）
  - [archive/state.md](archive/state.md): 状態管理の作り直しの記録（今のストアの一覧は architecture.md）

## 置き場所の決まり

- 使う人が読むものはルートの README（英語）だけで、それ以外は開発向けとする。README は操作の言葉で書き、開発向けの文書へは
  Documentation の節からだけリンクする（開発向けから README へのリンクはよい）
- 機能の振る舞いは features/、コードの仕組みは code/、決めた理由は adr/、調べたことは research/、これから作るものの設計は plans/、
  作業は todo.md、やり方は guides/ に分ける。同じことを 2 か所に書かない（ほかの場所からはリンクする）
- features/ と code/ の各ファイルは、見出しのすぐ下に「何が書いてあるか」と「ほかの場所にあるもの」を 1〜2 行で書く
- 大きなものを作るときは plans/ に 1 ファイル作る。作り終えたら、その内容を features/ か code/ に移して plans/ のファイルを消し、
  関係する ADR の `implemented` を `true` にして `npm run adr` を実行する
- 一度きりの手続きが済んだら、その文書は archive/ に移す
- どの文書をいつ直すかは [guides/development.md](guides/development.md) の「文書を直すきっかけ」（[ADR-0053](adr/0053-when-to-update-docs.md)）
