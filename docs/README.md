# 文書の目次

Calendared の文書。まず「誰が読むか」で分け、開発向けの中は「何のために読むか」で分ける。必要なものだけ読む。

## 使う人向け

- ルートの [README.md](../README.md): 使う人の入口（英語）
- [user/](user/): 使う人向けのもの。ここから開発向けの文書へはリンクしない
  - [user/usage-ja.md](user/usage-ja.md): 日本語の使い方（README の要約。入れ方を含む。パートナーに渡す）
  - [user/screenshots/](user/screenshots/): ルートの README に載せるスクリーンショット（撮り直し方はその中の README）

ここから下は開発向け（日本語）。

## 今どうなっているか

- [spec/](spec/): 機能ごとの仕様
  - [spec/overview.md](spec/overview.md): 機能と設定項目の一覧（まずここ）
  - [spec/architecture.md](spec/architecture.md): コードの地図（`src/` のどこに何があるかと、主な処理の流れ。コードを読む前にここ）
  - [spec/periods.md](spec/periods.md): 周期ノートの値の形と、週の定義
  - [spec/fiscal-year.md](spec/fiscal-year.md): 四半期と年の始まりの月（使う人の例、パンくず、カレンダー）
  - [spec/stickers.md](spec/stickers.md): ステッカー機能
  - [spec/migrations.md](spec/migrations.md): 移行（書式の変換、ステッカーのプロパティの付け替え、移行の案内）
  - [spec/state.md](spec/state.md): 状態管理の作り直しの記録（今のストアの一覧は architecture.md）
- [customizations.md](customizations.md): 元の版との違い（変更の記録）。変更を終えたら 1〜2 行で足す。GPL-3.0 の「改変したことと日付」の記録も兼ねる

## なぜそうしたか

- [adr/](adr/): 設計判断の記録（ADR）。1 つの決定を 1 つのファイルに書く。一覧と書き方は [adr/README.md](adr/README.md)
- [research/](research/): 決める前に調べたこと（事例など）。調べた日の情報で、あとから更新しない
- 個々の変更の理由や不具合の原因は、コミットメッセージの本文

## これから

- [todo.md](todo.md): 作業の一覧（機能・不具合・公開の手続き・いつか・見送ったこと）。やることはここだけに書く
- [plans/](plans/): これから作るものの設計（目指す姿と、決めることの一覧）
  - [plans/sticker-kinds.md](plans/sticker-kinds.md): ステッカーを複数の種類にする（いつか）の設計

## やり方・参考

- [guides/development.md](guides/development.md): はじめに（初日の手順）・変更を入れるときの手順・ビルド・deploy・テスト・依存の更新・書き方の決まり
- [guides/device-testing.md](guides/device-testing.md): Windows・iPhone の実機で試す
- [guides/publishing.md](guides/publishing.md): 公開の手続きの決まり・要件・issue の下書き（公開が済んだら archive/ へ）

## 使い終わったもの

- [archive/](archive/): 済んだ手続きや、役目を終えた文書
  - [archive/device-testing-setup.md](archive/device-testing-setup.md): 実機で試すための一度だけの準備
  - [archive/navigation.md](archive/navigation.md): ノートの間の移動の計画（要求の表。決めたことは ADR-0031）

## 置き場所の決まり

- 使う人が読むものは README（英語）と user/ に置き、それ以外は開発向けとする。使う人向けの文書は操作の言葉で書き、仕様や ADR へリンクしない（開発向けから使う人向けへのリンクはよい）
- 今の仕様は spec/、決めた理由は adr/、調べたことは research/、これから作るものの設計は plans/、作業は todo.md、やり方は guides/ に分ける。
  同じことを 2 か所に書かない（ほかの場所からはリンクする）
- 大きなものを作るときは plans/ に 1 ファイル作る。作り終えたら、その内容を spec/ に移して plans/ のファイルを消し、
  関係する ADR の `implemented` を `true` にして `npm run adr` を実行する
- 一度きりの手続きが済んだら、その文書は archive/ に移す
