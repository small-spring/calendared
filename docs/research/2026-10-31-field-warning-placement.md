# 調査: 入力欄の警告をどこに出すか（2026-10-31）

設定画面の週の書式の欄（設定画面の整理の計画（作り終えて消した。今の形は [spec/overview.md](../spec/overview.md)）の「周期ごとに繰り返す項目」）で、年をまたぐ週で名前がずれる書式への注意を、
欄の下の「1 file · 2026-W44」（件数とプレビュー）の上と下のどちらに出すかを決めるために調べた。プラグインに限らず、広く入力欄の警告・エラーの出し方を見た。
調べた日の情報で、あとから更新しない。出典で確かめられなかったものは「未確認」と書いた。

## 研究

- Seckler, Tuch, Opwis, Bargas-Avila（2012、Interacting with Computers。303 人）: エラー文の場所を 6 通り比べた。
  欄の近くに出すほうが、フォームの上や下にまとめて出すより、はっきり成績がよかった。いちばん好まれたのは欄の右
  （https://edoc-vmtest.ub.unibas.ch/21658/1/iwc24-0107.pdf ）
- 欄の上と下を直接比べた、きちんとした研究は見つからなかった。ほかはデザインの記事の意見
  - 下: 上から読む順に合う（https://uxmovement.com/?p=10902 、https://smart-interface-design-patterns.com/articles/error-messages-ux/ ）
  - 上: スマホでキーボードや自動入力の候補に隠れない（https://www.uxpin.com/studio/blog/error-feedback-best-practices-mobile-forms/ ）

## デザインシステム

| どこの | 置く場所 | 補足の文との関係 |
| --- | --- | --- |
| Carbon（IBM） | 欄の下 | 警告・エラーが出ると、補足の文と置き換わる（https://carbondesignsystem.com/components/text-input/usage/ ） |
| Atlassian | 欄の下。アイコン付き | 補足の文と置き換わる。条件を満たすと消える（https://atlassian.design/components/form/usage ） |
| Polaris（Shopify） | 欄のすぐ下。色だけに頼らないようアイコン付き | 記述を見つけられなかった（https://cdn.jsdelivr.net/npm/superv5_polarisui@2.0.1/dist/docs/components/InlineError/README.md ） |
| GOV.UK | 質問とヒントのあと、欄の前（欄の上）。赤い線で欄とつなげる | ヒントは残し、その下に出す（https://design-system.service.gov.uk/components/error-message/ ） |
| Adobe Spectrum | 補足の文に「ふつう」と「エラー」の 2 種類がある | 置き換えるかどうかは確かめられなかった（未確認） |
| Apple（HIG） | 入力欄のページに記述がない | ―（未確認） |
| Obsidian 本体 | コアのデイリーノートは、書式のプレビュー（「Your current syntax looks like this」）を欄の横の説明の中に出す | 記憶による（未確認） |

## わかったこと

- 欄の近くに出すことが一番効く。上か下かより、欄から離さないことが大事
- 欄の下に出す作りが多い。そのうち Carbon と Atlassian は、警告が出ると欄のすぐ下の 1 行を警告に使い、補足の文を押しのける。
  欄のいちばん近くは、直してほしいことに譲るという考え
- GOV.UK だけは欄の上に出す。ただし質問のすぐ下・欄のすぐ上で、欄から離れてはいない

## この画面に当てはめると

- 欄の下の「1 file · 2026-W44」は、Carbon などの「補足の文」に当たる（書式やフォルダが合っているかの目安）
- 置き換える作りに近いのは、警告を件数の行の上（欄のすぐ下）に置く形。警告を直せば消えて、件数の行が欄の下に戻る
- 件数は 0 件かどうかを見るのに大事なので、置き換えて隠すことまではしない
