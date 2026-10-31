# 文書の目次

Calendared の開発向けの文書（日本語）。使う人向けの説明は、ルートの [README.md](../README.md)（英語）と、その要約の [guides/usage-ja.md](guides/usage-ja.md)（日本語）。
必要なものだけ読む。

## 今どうなっているか

- [spec/](spec/): 機能ごとの仕様
  - [spec/overview.md](spec/overview.md): 機能と設定項目の一覧（まずここ）
  - [spec/periods.md](spec/periods.md): 周期ノートの値の形と、週の定義
  - [spec/stickers.md](spec/stickers.md): ステッカー機能
  - [spec/migrations.md](spec/migrations.md): 移行（書式の変換、ステッカーのプロパティの付け替え、移行の案内）
  - [spec/state.md](spec/state.md): 状態（ストア）の一覧と、状態管理の作り直しの記録
- [customizations.md](customizations.md): 元の版との違い（変更の記録）。変更を終えたら 1〜2 行で足す。GPL-3.0 の「改変したことと日付」の記録も兼ねる

## なぜそうしたか

- [adr/](adr/): 設計判断の記録（ADR）。1 つの決定を 1 つのファイルに書く。一覧と書き方は [adr/README.md](adr/README.md)
- [research/](research/): 決める前に調べたこと（事例など）。調べた日の情報で、あとから更新しない
- 個々の変更の理由や不具合の原因は、コミットメッセージの本文

## これから

- [todo.md](todo.md): 作業の一覧（機能・不具合・公開の手続き・いつか・見送ったこと）。やることはここだけに書く
- [plans/](plans/): これから作るものの設計（目指す姿と、決めることの一覧）
  - [plans/sticker-kinds.md](plans/sticker-kinds.md): ステッカーを複数の種類にする（いつか）の設計
  - [plans/navigation.md](plans/navigation.md): ノートの間の移動（タイムライン・Open now・カレンダー）の要求と案

## やり方・参考

- [guides/development.md](guides/development.md): ビルド・deploy・依存の更新・書き方の決まり・テスト
- [guides/device-testing.md](guides/device-testing.md): Windows・iPhone の実機で試す
- [guides/usage-ja.md](guides/usage-ja.md): 使う人向けの日本語の使い方（入れ方を含む。パートナーに渡す）
- [guides/publishing.md](guides/publishing.md): 公開の手続きの決まり・要件・issue の下書き（公開が済んだら archive/ へ）

## 画像

- [screenshots/](screenshots/): ルートの README に載せるスクリーンショット

## 使い終わったもの

- [archive/](archive/): 済んだ手続きや、役目を終えた文書
  - [archive/device-testing-setup.md](archive/device-testing-setup.md): 実機で試すための一度だけの準備

## 置き場所の決まり

- 今の仕様は spec/、決めた理由は adr/、調べたことは research/、これから作るものの設計は plans/、作業は todo.md、やり方は guides/ に分ける。
  同じことを 2 か所に書かない（ほかの場所からはリンクする）
- 大きなものを作るときは plans/ に 1 ファイル作る。作り終えたら、その内容を spec/ に移して plans/ のファイルを消し、
  関係する ADR の `implemented` を `true` にして `npm run adr` を実行する
- 一度きりの手続きが済んだら、その文書は archive/ に移す
