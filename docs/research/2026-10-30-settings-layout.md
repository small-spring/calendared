# 調査: 設定画面の階層の組み方（2026-10-30）

設定画面の整理（[plans/settings.md](../plans/settings.md)）のために調べた。決めたことは [ADR-0020](../adr/0020-settings-page-layout.md)。
調べた日の情報で、あとから更新しない。出典で確かめられなかったものは「未確認」と書いた。

## Obsidian の決まりと仕組み

- プラグインのガイドライン（https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines ）
  - 見出しは、区切りが 2 つ以上あるときだけ使う
  - 一番上に「General」「Settings」やプラグイン名の見出しを置かない。全体の設定は見出しなしで一番上に置く
  - 見出しに「settings」と書かない。文の書き方は先頭だけ大文字（sentence case）。`<h1>`・`<h2>` ではなく `new Setting().setName().setHeading()` を使う
- `SettingGroup`（1.11 から。https://docs.obsidian.md/Reference/TypeScript+API/SettingGroup ）: 見出し、項目、絞り込みの欄、ボタン。折りたたみはない
- 宣言で書く設定 `getSettingDefinitions()`（1.13 から。https://docs.obsidian.md/Plugins/User+interface/Settings 、
  https://docs.obsidian.md/plugins/guides/migrate-declarative-settings ）
  - 部品は、見出しの区切り（`group`。絞り込みの欄、`visible` で出し分け）、足す・消す・並べ替える一覧（`list`）、戻るボタン付きのサブページ（`page`）
  - すべての項目が Obsidian の設定の検索に出る（`aliases` も。`searchable: false` で外せる）。サブページは控えめに使うよう書かれている
  - 古い版向けに `display()` を残せる
  - 折りたたみはない（文書に記述がなく、Paperize の変更履歴に「新しい描き方には折りたたみの考えがない」とある。
    https://github.com/johannes-kaindl/obsidian-paperize/releases/tag/0.3.3 ）

## Obsidian のプラグイン（GitHub のソースで確かめた）

| プラグイン | 形 | 項目の数 | 繰り返す項目 |
| --- | --- | --- | --- |
| Dataview | 1 ページ。`setHeading` の区切り。最初の 5 項目は見出しなし | 23 | なし |
| Calendar（liamcain） | 1 ページ。`h3` の「General Settings」「Advanced Settings」（今のガイドラインに合わない） | 5〜8 | 週次ノートの項目は必要なときだけ |
| Kanban | 1 ページ。`h3`・`h4` の見出し。同じ画面をボードごとのモーダルでも使う | 約 36 | その場で編集する一覧 |
| Omnisearch | 長い 1 ページ。`h1`、`<hr>` で区切る | 約 40（未確認） | なし |
| Tasks | 宣言で書く形。7 つの区切り（最初は見出しなし）＋サブページ 2 つ | 上に約 21、全部で 30 以上 | `list` の行。編集はモーダル |
| Templater | 宣言で書く形。6 つの区切り＋サブページ 7 つ。トグルがオンのときだけ下の項目を出す | 上に約 20 | `list` の行。押すとモーダルで編集 |
| Linter | 宣言で書く形。メインのページに区切り、規則の種類ごとにサブページ、その中に規則ごとの区切り | 22＋多くの規則 | 規則ごとにオン・オフ。オンのときだけ下の項目を出す |
| Excalidraw | ページの木。1.13 より前は入れ子の `<details>` と自前の検索、1.13 からは `page` とパンくず | 約 200（未確認） | ― |
| Periodic Notes 1.x（liamcain） | Svelte の自前の画面。一覧の画面から詳細の画面へ | 周期ごとに約 4 | **周期ごとに折りたためる箱**（はじめは閉じている）。見出しに名前・オン・オフ・「起動時に開く」の印、中に書式・フォルダ・テンプレート・起動時 |
| Journals | 区切りの多いメインのページ。日記ごとに「Configure」でサブページ。別に「Maintenance」ページ | 多い | 行ごとに Configure・複製・削除 |
| Style Settings | たためる見出しの入れ子（`collapsed: true`） | テーマによる | ― |

出典: 各プラグインの GitHub（obsidian-dataview `src/main.ts`、obsidian-calendar-plugin `src/settings.ts`、obsidian-kanban `src/Settings.ts`、
obsidian-tasks `src/Config/SettingsTab.ts`、Templater `src/settings/Settings.ts`、obsidian-linter `src/ui/settings.ts`、
obsidian-excalidraw-plugin `src/core/settings.ts`、obsidian-periodic-notes `src/settings/pages/details/PeriodicGroup.svelte`、
obsidian-journal `docs/user/settings.md`、obsidian-style-settings の README）

## Obsidian の外

| 製品・ガイドライン | 階層の形 | 繰り返す項目 | 危ない操作 | 出典 |
| --- | --- | --- | --- | --- |
| VS Code | 左に目次の木（「Commonly Used」が先頭）、上に検索（`@modified`・`@ext:` などで絞れる）。上級者向けは `@tag:advanced` で絞ったときだけ | 一覧と詳細の形ではなく、JSON で書かせる | 設定ごとに「Reset」。変えた設定に色の帯 | https://code.visualstudio.com/docs/configure/settings |
| JetBrains IDE | 左に分類の木、左上に検索。OK / Apply / Cancel で反映 | 一覧と詳細（未確認） | 未確認 | https://www.jetbrains.com/help/idea/settings-preferences-dialog.html |
| Apple HIG（Settings） | 設定は少なく、既定値をよく。macOS の設定画面は、関係する設定ごとのページ | ― | ― | https://developer.apple.com/design/human-interface-guidelines/settings |
| macOS システム設定 | 左の一覧＋右のページ。検索の結果も左に | 「詳細…」のシート（未確認） | 「一般」→「転送またはリセット」（未確認） | 紹介記事のみ |
| iOS の設定 | 下へたどる一覧 | アカウントの一覧 → 詳細（未確認） | 「一般」の一番下。消去は何段も確認（パスコード、アカウントのパスワード） | https://support.apple.com/en-us/108931 |
| Windows のアプリのガイドライン・Windows 11 | 見出しで区切った 1 列。行（SettingsCard）の中にたたむ（SettingsExpander）のは 1 段まで。関係ないときは隠さず薄くして理由を出す。サブページでもパンくずと左の一覧を残す | プリンターの一覧から選ぶ | PC のリセットは専用のサブページで、選択を 1 つずつ進める | https://learn.microsoft.com/en-us/windows/apps/design/app-settings/guidelines-for-app-settings |
| Android（Material） | 区切りの見出し。15 項目を超えたらサブページ（題は開いた行と同じ）。複雑なら検索。関係する設定は親のすぐ下。サブページの一番上に全体のオン・オフを置ける | 行の 2 行目には説明ではなく今の状態 | 特になし | https://developer.android.com/design/ui/mobile/guides/patterns/settings |
| GNOME（libadwaita） | ページ・区切り・行。検索できる。サブページを開く行の右端に「›」 | たためる行（2 行目とオン・オフを持てる） | 未確認 | https://gnome.pages.gitlab.gnome.org/libadwaita/doc/main/class.PreferencesDialog.html |
| Nielsen Norman Group（段階的に見せる） | よく使うものを最初の画面に、上級者向けははっきりした入口の先に。段は 2 つまで（3 段以上は迷わせる） | ― | ― | https://www.nngroup.com/articles/progressive-disclosure/ |
| GitHub のリポジトリの設定 | 長い 1 ページ | ― | 一番下の「Danger Zone」。消すときはリポジトリの名前を入力させる | https://docs.github.com/en/repositories/creating-and-managing-repositories/deleting-a-repository |

## ここから言えること

- 周期は、メインのページに 1 行ずつ（右にオン・オフ、2 行目に今の状態の要約、右端に「›」）並べ、書式・フォルダ・テンプレートは周期ごとの
  サブページに置く。サブページの題は行の名前と同じにし、一番上にもオン・オフを置く。段は 2 つで収まる
- オフの周期も行は消さない（形が変わらず、検索でも見つかる）。オフのときに隠すのは、サブページの中の項目だけ
- 移行は、メインのページの一番下に「移行 ›」の行を置き、サブページにする。ボタンには何が起きるかを書き、一覧を見せてから実行する
- 7 項目くらいまでの区切りは見出しだけでよい。サブページは、繰り返すものと移行だけに使う

## 比べた形

1. 見出しで区切った 1 ページ＋重い部分だけサブページ（Tasks・Templater・Linter）。Obsidian の見た目と検索がそのまま使え、メインのページが短い。
   1.13 が要る。周期どうしを見比べるにはサブページを行き来する
2. 1 ページで、周期ごとに折りたためる箱（Periodic Notes 1.x）。見比べやすく移動がないが、折りたたみを自分で作るので宣言で書く形にできず、検索に出ない
3. オンにした周期の項目だけ出す（Linter の規則）。いちばん簡単で検索にも出るが、オンにする周期が多いとページが伸びる

→ 1 に決め、サブページの中では 3 を使う（[ADR-0020](../adr/0020-settings-page-layout.md)）
