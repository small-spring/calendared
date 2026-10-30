# 設定画面の文言の見直し（案の一覧）

「設定画面だけを見た人が、どの項目が何をするかわかるか」という目で、今の設定画面（`src/settings/ui/tabs/` の Calendar タブと Periods タブ）を
見直した案。**案を出しただけで、どれを直すかはまだ決めていない**。決めたら、[settings.md](settings.md)（目指す姿）か [todo.md](../todo.md) に移し、
このファイルは消す。2026-10-31 に書いた。

- 見たのは、項目の名前、説明の文、並び順、見出しの分け方、オン・オフで隠れる項目の出方
- 「今」は画面に出ている英語のまま。「案」も英語（画面の言葉）で、理由は日本語
- 設定画面を Obsidian 1.13 の宣言で書く形に組み直すとき（[settings.md](settings.md)）に、そのまま使える形にした。
  組み直しで消える項目（ホバーのプレビュー、書式の一覧など）は、短く触れるだけにした
- 見た目は Obsidian で確かめる必要がある。コードからはわからないことは、最後の「確かめること」に分けた

## 進め方（2026-10-31 に決めた）

1. 間違い・誤解を招くもの、書き方の決まりに外れるものを先に直す（済んだ。下の「済んだもの」）
2. Calendar タブの名前と説明（C・D・E・F・G）は、表の案に〇か✕を付けてもらって直す。組み直しのあとも文言はそのまま使える
3. 並び順と見出し（B）、タブの名前（A6）、書式まわり（H4）、Open on startup（H9）、Hover preview（G3）は、組み直しのときにまとめて直す。
   見出しバーの呼び方（A1）とアイコン（A2）は、宣言で書く設定で出せるかを確かめてから決める

### 済んだもの（2026-10-31）

- Periods タブの先頭の文を、今の動きに合わせた（オフにした周期はコマンドにも出ず、作らない。今あるノートは残ると書く）
- 書式の行のボタンを「Rename notes to this format」にした（確認の画面の題とボタンも「Rename」）
- 文の途中の「Daily」などを小文字にした（Folder、Open on startup）。Folder の説明は「Where new daily notes are created.」
- 件数を「N files」「1 file」「0 files」にした
- 選択肢を「Same as system (English)」「Language default (Sunday)」にした

## 全体に通じること

| # | 今 | 案 | 理由 |
| --- | --- | --- | --- |
| A1 | 見出しバーを指す言葉が「note header」「note's header」「header」とばらばら。「reading-view icon」という目印も使う | Obsidian 本体の設定と同じ言葉に 1 つにそろえる（候補は「tab title bar」。外観の設定「Show tab title bar」の言葉。確かめること 1） | 同じ場所が別の言葉で書かれると、別の場所に見える。閲覧ビューのアイコンはスマホでは見えにくく、目印にしにくい |
| A2 | 見出しバーのボタンの項目に、ボタンの形が出ていない | 名前の横に、ボタンと同じアイコンを出す（Open now は `calendar-clock`、ステッカーは `smile-plus`） | 名前だけでは、見出しバーのどのボタンかわからない。アイコンがあれば、画面で見たボタンと結び付く（ユーザーの案）。出せるかは確かめること 2 |
| A3 | 周期ノートの総称は、今は「periodic note」のほかに言い方がまざっていないが、新しい文でも崩さない | 総称は「periodic note」、周期ごとは小文字の「daily note」など（見出しの「Daily notes」は除く） | 文の途中の大文字は直した（上の「済んだもの」） |
| A5 | 説明が文になっていないもの、要らないものがある（下の各項目） | 名前で足りるものは説明をなくす。説明は「何に効くか」か「気をつけること」だけにする | 1 行で済む項目が 2 行になると、設定画面が長く見え、要る説明が埋もれる |
| A6 | タブの名前が「Calendar」「Periods」。Calendar タブの中身はステッカー・パンくず・見出しバーのボタンなどで、カレンダーの設定は少ない | 組み直しでタブはなくなる（[settings.md](settings.md)）。それまで直すなら「General」「Periodic notes」 | 「Calendar」タブにステッカーがあると探しにくい |

## Calendar タブ

### 並び順と見出し

今の並び: Stickers / Breadcrumbs / Mini calendar / Interaction behavior / Localization

案（組み直しの形（[settings.md](settings.md)）に近づける）:

```
（見出しなし）    Week starts on / Calendar language / Confirm before creating notes / Open now button
Breadcrumbs     （見出しのトグル）Show on / Show on non-periodic notes
Mini calendar   （見出しのトグル）Show on / Show on non-periodic notes / Days shown / Show stickers
（見出しなし）    Compact on desktop   … どちらかが PC に出るときだけ
Stickers        （見出しのトグル）Sticker button / Sticker property / Emoji search languages
```

| # | 今 | 案 | 理由 |
| --- | --- | --- | --- |
| B1 | 先頭が Stickers | 全体の設定（見出しなし）を先頭に、Stickers を最後に | ガイドラインは「全体の設定は見出しなしで一番上」。ステッカーは飾りで、周期ノートの土台より後でよい |
| B2 | 見出し「Interaction behavior」に、作成の確認・Open now のボタン・ホバーのプレビューが入る | 見出しをなくし、確認と Open now のボタンは見出しなしの全体の設定へ。ホバーのプレビューは組み直しで消える（それまでは全体の設定の最後に） | 「Interaction behavior」では中身が想像できない。3 つに共通点がない |
| B3 | 見出し「Localization」に、カレンダーの言語と週の始まりが入る | 見出しをなくし、全体の設定へ | 週の始まりは、表示だけでなく週次ノートの 7 日やファイル名にも効く。「Localization」の下だと見た目の設定に見える |

### Stickers

| # | 項目 | 今 | 案 | 理由 |
| --- | --- | --- | --- | --- |
| C1 | Stickers（見出しのトグル） | 説明なし | 説明を足す: 「An emoji for each periodic note, shown in the calendar.」 | 設定画面だけを見た人には「ステッカー」が何かわからない。ほかの 2 つの見出し（パンくず・ミニカレンダー）には説明がある |
| C2 | Sticker button in note header | 説明「Show a button next to the reading-view icon of periodic notes. It shows the note's sticker, and opens the emoji picker.」 | 名前「Sticker button」＋アイコン（A2）。説明「In the tab title bar of periodic notes. Shows the note's sticker; click it to pick one.」 | 見出しが Stickers なので名前の「sticker」以外は説明に回せる。場所の言葉は A1 にそろえる |
| C3 | Sticker property | 説明 2 段（プロパティの説明と、使えない名前の一覧） | 1 段目を「Property that holds the sticker. Adding a sticker replaces its value.」に縮める。2 段目は「Can't be one of Obsidian's built-in properties: …」 | 「(e.g. 'sticker', 'mood')」は欄の薄い文字（placeholder）と重なる。使えない名前の一覧は、入れてから断られるより先に見えたほうがよいので残す |
| C4 | Emoji search languages | 説明がダウンロード元を 2 つ書き、3 文ある | 「Search stickers in these languages too. Each one is downloaded once when added (from cdn.jsdelivr.net).」 | 通信することは書いておく（使う人が知るべきこと）。予備の取得先や「言語だけ送る」は README に回してもよい |
| C5 | ツールチップとの言葉 | 見出しバーのボタンの名前は「Add sticker」、コマンドは「Manage sticker」、設定は「Sticker button」 | 3 つをそろえる（例: どれも「Sticker」系の 1 つの動詞に）。設定画面の外なので、別に決める | 設定の名前から、画面のどのボタンかたどれるように |

### Breadcrumbs

| # | 項目 | 今 | 案 | 理由 |
| --- | --- | --- | --- | --- |
| D1 | Breadcrumbs（見出しのトグル） | 名前「Breadcrumbs」。説明「Where the note sits, such as 2026 › Q4 › Oct › W44 › 30, above the note. Click a period to open its note.」 | **名前「Period breadcrumbs」（2026-10-31 に決めた）**。説明「Shows where the note sits, such as 2026 › Q4 › Oct › W44 › 30, above the note. Click a period to open its note.」 | 「breadcrumbs」だけでは作る側の言葉で、コミュニティプラグイン「Breadcrumbs」とも紛れる。「Period」を付けて何のパンくずかを示しつつ、パートナーと同じ言葉（パンくず）で話せるように breadcrumbs は残す（「Period path」も考えた）。変えるのは画面の名前だけで、コードの名前・設定のキー・開発向けの文書の「パンくず」はそのまま。説明の 1 文目に動詞を足し、例は残す |
| D2 | Show on | 選択肢「Always / Phone only」。説明「Phone only keeps desktop and tablets to the side calendar.」 | 選択肢を「All devices / Phones only」に。説明は「Tablets count as desktop.」だけ（またはなし） | 名前が「Show on」なので、選択肢は場所（機器）で答えるほうが読める。今の説明は「keeps … to the side calendar」が何を言っているかわかりにくい。わかりにくいのはタブレットの扱いだけ |
| D3 | Show on other notes | 説明「Also show where today is on notes that aren't periodic notes.」 | 「Show on non-periodic notes」にして、説明をなくす（ユーザーの案） | 「other notes」は何の「ほか」かわからない。名前に入れれば 1 行で済む |
| D4 | （D3 の別案） | | 「Show today on non-periodic notes」 | 周期ノートでないノートでは「今日」の位置を出す、ということまで名前でわかる。ただし、ミニカレンダーの同じ項目と名前がずれる。D3 を勧める |

### Mini calendar

| # | 項目 | 今 | 案 | 理由 |
| --- | --- | --- | --- | --- |
| E1 | Mini calendar（見出しのトグル） | 説明「The notes before and after the open one, above the note, with their stickers.」 | 「Shows the days (or weeks, months…) around the note, above it. Click one to open it.」 | 1 文目に動詞がない。「notes」だと、ノートがない日は出ないように読める。ステッカーは下の「Show stickers」があるので書かない |
| E2 | Show on | パンくずと同じ | D2 と同じ | |
| E3 | Show on other notes | 説明「Also show the days around today on notes that aren't periodic notes.」 | 「Show on non-periodic notes」、説明なし | D3 と同じ |
| E4 | Days | 選択肢「Calendar week / Centered on the note」。説明「Show the calendar's week, or the note in the middle with 3 days on each side.」 | 名前「Days shown」、選択肢「Calendar week / 3 days each side」、説明「For daily notes. Other notes show 2 on each side.」 | 「Days」だけでは何の設定かわからない。日のノートにしか効かないことが書かれていない。選択肢に「3 日」と入れれば説明の言い換えが要らない |
| E5 | Show stickers | ステッカーをオフにしても出ている | ステッカーがオフのときは隠す | 効かない項目が見えていると、オンにしたのに出ない、と迷う |

### Compact on desktop

| # | 今 | 案 | 理由 |
| --- | --- | --- | --- |
| F1 | Mini calendar の見出しの下にある。ミニカレンダーがオフでも、パンくずが PC に出ていれば、オフの見出しの下にこれだけ残る | Mini calendar のあとに、見出しなしの別の段として置く（出す条件は今と同じ: どちらかが PC に出るとき） | 見出しのトグルがオフなのに下に項目が残るのは、ADR-0033 の「オフなら中身を隠す」と食い違って見える。どちらにも効く項目を片方の見出しに入れると、もう片方には効かないように読める |
| F2 | 説明「Applies to both. Show them in a small box at the top right of the note instead of a bar under its header. Phones always use the bar.」 | 「Show the breadcrumbs and mini calendar in a small box at the top right of the note, instead of a bar under the tab title bar. Phones always use the bar.」 | F1 で見出しの外に出すと「both」「them」が何を指すかわからなくなるので、名前で書く。「header」は A1 にそろえる |

### 全体の設定（今の Interaction behavior と Localization）

| # | 項目 | 今 | 案 | 理由 |
| --- | --- | --- | --- | --- |
| G1 | Creation confirmation | 説明「Prompt before creating new periodic notes to prevent accidental entries.」 | 名前「Confirm before creating notes」。説明「From the calendar, breadcrumbs, mini calendar or Open now. Commands never ask.」 | 名前を動詞の形に（Obsidian 本体の「Confirm file deletion」と同じ形）。「to prevent accidental entries」は言わなくてもわかる。どこで聞かれ、どこで聞かれないかのほうが役に立つ |
| G2 | Open now button | 説明「Show a button in every note's header that opens now's note: today's, or this week's if daily notes are off, and so on.」 | 名前はそのまま＋アイコン（A2）。説明「In the tab title bar of every note. Opens today's note, or this week's if daily notes are off.」 | 「now's note」は英語として不自然。「and so on」は削っても伝わる。カレンダーの中の Open now に効かないことは、書くなら「The calendar's button always shows.」 |
| G3 | Hover preview | 説明「Instantly preview notes by hovering over dates (no modifier key needed).」 | 名前「Preview without Ctrl」（Mac では「Cmd」）。説明「Hover over a date in the calendar to preview its note.」 | 「Hover preview」だとオフにするとプレビューが出ないように読めるが、実際はオフでも Ctrl/Cmd を押せば出る。組み直しで消えるので、直すのは今だけの手当て |
| G4 | Calendar language | 説明「Set a specific language for the calendar interface.」 | 説明「Month and weekday names in the calendar, breadcrumbs and mini calendar. File names use Obsidian's language.」 | 「calendar interface」がどこまでか、ファイル名に効くかがわからない |
| G5 | Week starts on | 説明「Choose which day your week begins with.」 | 説明「Also sets which 7 days a weekly note covers.」 | 今の説明は名前の言い換え。週次ノートに効くことのほうが大事で、名前からはわからない |

## Periods タブ

| # | 項目 | 今 | 案 | 理由 |
| --- | --- | --- | --- | --- |
| H2 | 周期の見出し（Daily notes など）のトグル | 週は日を、四半期は月を使う。日をオフにすると週もオフになり、日がオフのとき週の見出しは薄くなるだけで理由が出ない。日・月・年を全部オフにはできない（黙ってオンに戻る） | 薄くするとき、見出しの横に「Needs daily notes」「Needs monthly notes」と出す。全部オフにできないことは、戻すときに通知で知らせる | 設定画面だけでは、なぜ薄いのか、なぜトグルが戻るのかがわからない |
| H3 | 「Opens at startup」の印 | 見出しの横に小さな斜体 | そのまま | 開かなくても、どれが起動時に開くかわかってよい |
| H4 | Format の「Required tokens: Y or y (year), M (month) and D (day)」 | | 「Must include: …」 | 「tokens」は Moment.js の言葉。下に「Format tokens: Moment.js documentation」があるので、そちらで言葉を知れる。組み直しで書式を 1 つにするときにまとめて直してもよい |
| H8 | Template | 説明「Choose a file to use as template」 | 「New daily notes start with this file's contents.」 | 今の説明は名前の言い換え。どう使われるかを書く。`{{date}}` などが使えることを書くなら 1 文足す |
| H9 | Open on startup | 説明「Automatically open or create a new Daily note whenever you open this vault.」 | 「Open today's note when Obsidian starts. Only one period can do this.」（週なら「this week's note」） | A3。どれかをオンにするとほかがオフになることが書かれていない。組み直しでは全体の設定の 1 つの選択肢になる（[settings.md](settings.md)） |

## 確かめること（Obsidian で見る）

1. 見出しバーを、Obsidian 本体（英語）の設定や文書が何と呼んでいるか。「Show tab title bar」の言葉を使ってよいか（A1）
2. 設定の名前の横にアイコンを出せるか、出したときに見やすいか（A2）
   - 今の作り（`SettingItem` の `name` は Svelte のかけらも渡せる）なら出せる
   - 組み直しのあと（1.13 の宣言で書く設定）で、名前にアイコンや DocumentFragment を渡せるか。渡せないなら、説明の先頭に置けるか
   - アイコンだけの見出しバーで、PC とスマホとで同じ形に見えるか
3. 見出しのトグル（Stickers・Breadcrumbs・Mini calendar）に付けた説明が、見出しの下にどう見えるか。宣言で書く設定で、見出しに説明を付けられるか（C1・D1・E1）
4. F1 の「見出しなしの別の段」が、Mini calendar の段とくっついて見えるか、離れて見えるか。どちらに効くかが伝わるか
5. オン・オフで項目が出たり消えたりするとき（ステッカー、パンくず、ミニカレンダー、Compact on desktop）、画面が跳ねて読みにくくならないか
6. Folder・Template の下にある、見えない「Valid」の行（エラーの文の場所取り）が、項目の間に変な空きを作っていないか
7. 周期の見出しが薄いとき（H2）、トグルを押せるのか、押せないのかが見た目でわかるか
8. 選択肢を「All devices / Phones only」にしたとき（D2）、ドロップダウンの幅に収まるか。スマホの幅で、名前と説明が何行になるか
