---
id: 0026
title: "ホバーのプレビューは、コアプラグイン「ページプレビュー」の設定に任せる"
status: 採用
date: 2026-10-30
area: 設定
implemented: true
aliases:
  - ADR-0026
  - settings ADR-C7
---
# ADR-0026 ホバーのプレビューは、コアプラグイン「ページプレビュー」の設定に任せる

- **背景**: 今はカレンダーのホバーで、閲覧ビューの出所（`source: "preview"`）を借りてページプレビューを出し、Ctrl/Cmd が要るかを
  自前の設定「Hover preview」（`autoHoverPreview`）でも判定している。閲覧ビューの設定次第で振る舞いが変わり、分かりにくい
- **決定**: `registerHoverLinkSource` で出所「Calendared」を登録し、Ctrl/Cmd の判定はページプレビューに任せる。「Hover preview」の設定は消す
- **理由**: ページプレビューの設定画面に Calendared の行が出て、ほかの場所（エディタ、エクスプローラー）と同じ場所で切り替えられる
