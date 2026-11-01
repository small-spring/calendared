---
id: 0046
title: "カレンダーの言語の既定は、OS の言語ではなく Obsidian の言語から取る"
status: 採用
date: 2026-11-01
area: カレンダー
implemented: true
aliases:
  - ADR-0046
---
# ADR-0046 カレンダーの言語の既定は、OS の言語ではなく Obsidian の言語から取る

- **背景**: 設定「Calendar language」の既定（と、選択肢の一番上の「Same as …」）は、元の版のまま OS の言語（`navigator.languages`）から
  取っていた。仕様（[spec/overview.md](../spec/overview.md)）では既定は Obsidian の言語。OS が英語で Obsidian を日本語で使う人には、
  ノートの名前（Obsidian の moment で書く）は日本語の月の名前なのに、カレンダーだけ英語になる。
  また、OS の言語は `en-GB` のように大文字を含むが、moment の言語の名前は `en-gb` なので、選択肢に同じ言語が 2 回出ていた
- **検討した案**
  - A. 今のまま OS の言語
  - B. Obsidian が使っている moment の言語（`window.moment.locale()`）をそのまま読む
  - C. Obsidian の言語（`getLanguage()`）を、Obsidian が自分の moment に渡すのと同じ読み替えで moment の言語の名前にする
- **決定**: C
- **理由**
  - Obsidian 1.14.5 の本体を読むと、言語は `localStorage` の `language`、なければ OS の言語を Obsidian の対応する言語に寄せたもの、
    なければ `en`（`getLanguage()` はこれを返す）。起動時に、小文字にして `zh → zh-cn`・`cz → cs`・`no → nb` と読み替え、
    `window.moment.locale()` に渡している。同じ読み替えをすれば、ノートの名前と同じ言語になる
  - B は手軽だが、moment はすべてのプラグインと共有なので、ほかのプラグイン（元の版のように moment の言語を変えるもの）の影響を受ける
  - 読み替えの結果は moment の言語の名前そのものなので、選択肢の重なりもなくなる
- **結果**: `obsidianMomentLocale`（`src/calendar-locale.ts`）が読み替える。moment にない言語は英語（Obsidian 自身もそうなる）。
  既定の週の始まりも、この言語のふつうの週の始まり（土・日・月に寄せる）。選択肢の一番上は「Same as Obsidian (…)」。
  保存してある言語は変えない（既定が効くのは、まだ保存していない人だけ）。選んだ値は言語の名前そのもので保存するので、
  あとで Obsidian の言語を変えても、カレンダーの言語は付いてこない（前の「Same as system」も同じだった）
