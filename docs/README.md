# 文書の目次

Calendared の開発向けの文書（日本語）。使う人向けの説明は、ルートの [README.md](../README.md)（英語、元の版のまま）。
必要なものだけ読む。

## 今どうなっているか

- [customizations.md](customizations.md): 元の版との違い。変更を終えたら 1〜2 行で足す
- [spec/](spec/): 機能ごとの仕様。今どうなっているかを書く
  - [spec/periods.md](spec/periods.md): 周期ノートの値の形と、週の定義
  - [spec/stickers.md](spec/stickers.md): ステッカー機能
  - [spec/state.md](spec/state.md): 状態（ストア）の一覧と、状態管理の作り直しの記録
- [features.md](features.md): 今ある機能と設定項目の一覧と、設定画面の整理でそれぞれをどう変えるか（整理が終わったら spec/ と customizations.md に移して消す）

## なぜそうしたか

- [adr/](adr/): 設計判断の記録（ADR）。1 つの決定を 1 つのファイルに書く。一覧と書き方は [adr/README.md](adr/README.md)
- 個々の変更の理由や不具合の原因は、コミットメッセージの本文

## これから

- [plan.md](plan.md): これから作るもの（設定画面の整理のあとの目指す姿）と、決めることの一覧
- [todo.md](todo.md): 作業の一覧（不具合・やりたいこと・見送ったこと）
- [publishing.md](publishing.md): コミュニティプラグインとして公開するまでにやること

## 手順

- [development.md](development.md): ビルド・deploy・依存の更新・書き方の決まり・テスト
- [device-testing.md](device-testing.md): Windows・iPhone の実機で試す手順

## 置き場所の決まり

- 今の仕様は spec/、決めた理由は adr/、これからのことは plan.md と todo.md に分ける。同じことを 2 か所に書かない
- 作り終えたら、plan.md の該当する部分を spec/ に移し、ADR の `implemented` を `true` にして `npm run adr` を実行する
