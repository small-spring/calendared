---
id: 0048
title: "Ctrl/Cmd を押しながら日付を押すと、新しいタブで開く（横に分けない）"
status: 採用
date: 2026-11-01
area: カレンダー
implemented: true
aliases:
  - ADR-0048
---
# ADR-0048 Ctrl/Cmd を押しながら日付を押すと、新しいタブで開く（横に分けない）

- **背景**: カレンダーの日付・週番号・月・年、パンくずとミニカレンダーを Ctrl/Cmd を押しながら押すと、新しいタブで開く
  （`workspace.getLeaf(true)`）。ところが仕様と README は「横に開く」（new split）と書き、コードの名前も `createNewSplitLeaf` だった
- **検討した案**
  - A. 書いてあるとおり、横に分けて開くように直す
  - B. 今の動き（新しいタブ）のままにし、文書と名前を合わせる
- **決定**: B
- **理由**
  - Obsidian では、リンクを Ctrl/Cmd を押しながら押すと新しいタブで開く。同じ操作が同じ結果になるほうが迷わない
  - 横に開きたいときは、右クリックの「Open to the right」がある
- **結果**: 仕様・README・usage-ja を「新しいタブで開く」に直し、引数の名前を `inNewTab` にした（`getLeaf("tab")`）
