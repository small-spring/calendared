# 調査: 1 日に複数の種類の記録を付ける画面（2026-10-30）

ステッカーを複数の種類（例: 気分 `mood`、活動量 `activeness`）にするときの、付ける画面とカレンダーでの見せ方を考えるために調べた
（[plans/settings.md](../plans/settings.md) の「ステッカー」、[todo.md](../todo.md) の「3. いつか」）。
調べた日の情報で、あとから更新しない。出典で確かめられなかったものは「未確認」と書いた。

| 名前 | 付ける画面 | 変えられること | 複数の種類の見せ方 | 出典 |
| --- | --- | --- | --- | --- |
| Daylio | 入力画面に、5 段階の気分の行。自作の気分は 5 段階の下の「…」の中。活動は同じ画面の別の段 | 5 段階の名前・絵文字・色。自作の気分は、どれかの段階に属させれば足せ、並べ替えや段階の移動もできる。気分を増やしすぎると画面が重くなると注意している | カレンダーに日ごとの気分のアイコン（未確認） | https://daylio.net/faq/docs/daylio-faq/tutorials/create-and-manage-moods/ |
| Bearable | ホーム画面に、気分（1〜10）・元気さ（1〜5）・症状（0〜4）・睡眠・要因の段を縦に並べ、段ごとに操作を持つ | 段の表示のオン・オフと、ドラッグでの並べ替え。段階の数は決まっている。要因はあり・なしか、高・中・低 | カレンダーは気分か症状を出し、「強調する要因」を選んで重ねる | https://bearable.app/support/howto/configure-and-enter-data-into-bearable/ 、https://bearable.app/support/tips/visualise-your-health-data-in-many-forms/ |
| Pixels（Year in Pixels） | 分類から気分を選ぶ。タグ。1 日の中の気分の変化 | 気分・色・タグ | 1 年を 1 枚に、1 日 1 マスの色（気分だけ） | https://apps.apple.com/us/app/id1668460700 |
| Apple「心の状態」 | 「不快 ↔ 快」のスライダー、続けて気持ちの言葉と生活の分野。「1 日の気分」と「今の気持ち」は別の入口 | なし | グラフで「1 日の気分 / 今の気持ち」を切り替え | https://support.apple.com/guide/watch/apd7de0f5610/watchos |
| How We Feel | 4 つの区分（元気さ × 快さ）から選び、言葉（約 144）を選ぶ | 見つからなかった | 未確認 | 紹介記事のみ |
| Exist.io | 1 日 1 回、気分を 1〜9（2020 年までは 1〜5）。タグや数は別に入れる | 自分で作る数値とタグ | 週か月で 1 つずつ見る（未確認） | https://exist.io/blog/mood-new-scale/ |
| Obsidian Mood Calendar（xzhi） | 空いている日付を押すとピッカー。プロパティに書く | プロパティの名前（`MyMood`）。候補の一覧を足す・消す・並べ替える（初めは 7 つ） | 1 種類だけ | https://www.obsidianstats.com/plugins/mood-calendar |
| Obsidian Mood Tracker（dartungar） | モーダルに気分の尺度・気持ちの札・メモ。JSON に保存 | 名前を変えられる。自分の絵文字は予定 | グラフ | https://github.com/dartungar/obsidian-mood-tracker |
| Heatmap Calendar | 付ける画面はない。値は DataviewJS で渡す | 色の組、強さの範囲 | 1 つのヒートマップに複数の組を色で分ける | https://github.com/Richardsl/heatmap-calendar-obsidian |
| Tracker | 付ける画面はない。値はインラインのフィールド。絵文字を数に対応づけられる | クエリですべて決める | 月の表示で、どの組を出すかを番号で指定（押して切り替えるかは未確認） | https://github.com/pyrochlore/obsidian-tracker |
| Metadata Menu | 一覧から 1 つ選ぶ型、押すたびに次へ進む型 | 候補は設定か fileClass で決める（順が保たれるかは未確認） | ― | https://github.com/mdelobelle/metadatamenu |
| Periodic Notes Calendar（元の版） | 右クリック →「Add sticker」→ すべての絵文字のピッカー、または本文の `#🎉` | なし | 1 つ | https://github.com/luiisca/obsidian-periodic-notes-calendar |

調べていないもの: Reflectly、Moodnotes、Calendar（liamcain）のドット、習慣の記録のプラグイン、Day Planner。

## ここから言えること

- **1 枚の画面に、種類ごとの段を並べる**（Daylio、Bearable）。入口が 1 つで済み、その日の分を一度に付けられる。段ごとに、決まった候補の行
  （気分）にも、「選ぶ…」でピッカーを開く形（活動量）にもできる。ただし種類が増えると画面が重くなる
- **種類ごとに、順番のある候補の一覧を設定で持つ**（Mood Calendar、Daylio、Bearable）。短い一覧はそのまま尺度になり、あとで数や色にも変えられる。
  一覧が空なら「すべてから」と読める。候補から外した絵文字が付いた古いノートの扱いを決めておく（Daylio は過去の記録には出し続ける）
- **カレンダーは 1 種類ずつ見せ、切り替える**（Bearable、Apple、Tracker）。マスが読みやすい。種類をまたいだ傾向はひと目では見えない
  （Bearable はほかの種類を強調表示で重ねて補っている）
- 種類ごとに入口を分ける形（Apple の「1 日の気分」と「今の気持ち」）は、種類ごとに付ける時間が違うときにしか役に立たない

→ 考えられる形: 見出しバーのボタンと右クリックの項目は 1 つ。開くと種類ごとの段が設定の順に並ぶ。「候補だけ」の種類は候補の行をそのまま押し、
「すべてから」の種類は今の絵文字と、ピッカーを開くボタンを出す。カレンダーに出す種類は、付けるボタンとは別の切り替えで選ぶ
