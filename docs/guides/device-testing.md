# 実機での確かめ方（Windows・iPhone）

開発は Mac で行い、`npm run deploy` で Mac の Vault にプラグインを入れる（[development.md](development.md)）。
ほかの端末（Windows、iPhone）では、Remotely Save で **Calendared のフォルダだけ** を同期して試す。

コミュニティプラグインとして公開したあとは、どの端末でもプラグインの一覧から入れられるので、この手順は要らなくなる。

一度だけの準備（Remotely Save の暗号化と、Calendared のフォルダだけを同期する設定）は 2026-10-30 に済ませた。
その手順は [archive/device-testing-setup.md](../archive/device-testing-setup.md) に移した。端末を足すときや、設定をやり直すときに見る。

## しくみ

- Obsidian のプラグインは、`.obsidian/plugins/<id>/` フォルダの中のファイルがすべて
  - `main.js`（プログラム）、`manifest.json`（名前とバージョン）、`styles.css`（見た目）、`data.json`（設定。あれば）
  - 「インストール」はこのフォルダを置くことと同じ。コミュニティプラグインの一覧や BRAT も、裏ではこれらのファイルを置いているだけ
- なのでフォルダを同期すれば、届いた端末でそのまま動く。iPhone の Obsidian も同じ `main.js` を動かす
  （Calendared はパソコンにしかない機能（Node.js、Electron）を使っていない）
- Remotely Save の設定（0.5.25 で確認）
  - 「設定フォルダも同期する」（`syncConfigDir`）: `.obsidian` フォルダも同期の対象に入れる
  - 「同期しないパス」（`ignorePaths`）: 正規表現で指定したパスを同期から外す
  - 「同期するパスだけ」（`onlyAllowPaths`）は Vault 全体に効き、ノートまで同期されなくなるので **使わない**
- Remotely Save の設定は端末ごと。どの端末にも同じ設定が要る

## 危険性

iOS も Obsidian も、同期で届いた `main.js` を検査しない（署名の確認などはない）。
なので「iPhone 側で危ないと判定される」ことはない。気をつけるのは次のこと。

- **同期先に書き込める人は、すべての端末でコードを動かせる**
  - 同期先（クラウドのストレージ）の `main.js` を差し替えられると、それが Mac・Windows・iPhone で動く。
    プラグインは Vault のファイルをすべて読み書きでき、ネットにもつながる
  - ほかのプラグインの `data.json` も読める。Remotely Save の `data.json` には同期先の鍵とパスワードが平文で入っている
  - 対策: 同期先のアカウントを固める（二段階認証など）。Remotely Save の暗号化を使う（[archive/device-testing-setup.md](../archive/device-testing-setup.md)。済んでいる）。
    **Remotely Save のフォルダは同期しない**（準備の手順 3 の正規表現で外れている）
- **開発中の不具合がすべての端末に広がる**
  - Calendared はノートを作ったり名前を変えたりする。不具合のある版を同期すると、どの端末でも同じことが起き、ノートの同期でさらに広がる
  - Mac でひととおり動かしてから同期する。作り直しの途中の版は送らない
- **中途半端に届くと動かない、または固まる**
  - 同期が途中で止まると `main.js` と `manifest.json` の版が食い違うことがある。ふつうは読み込みに失敗するだけ
  - 読み込み中に無限ループなどがあると、起動のたびに固まる。iPhone では開発者向けの画面がないので、
    「ファイル」アプリから `.obsidian/plugins/calendared/` を消すか、`.obsidian/community-plugins.json` から `calendared` を外す
    （Vault が「この iPhone 内」にある場合）
- **iPhone の JavaScript は少し古いことがある**
  - iOS の Obsidian は Safari と同じしくみで動く。iOS が古いと新しい書き方が使えない。Mac で動いて iPhone で動かないときはまずこれを疑う

## ふだんの流れ

1. Mac で `npm run deploy`（Mac の Vault の Calendared が新しくなる）
2. Mac で同期する
3. ほかの端末で同期し、Obsidian を再起動する（またはプラグインをオフ → オン）

## うまくいかなかったとき

- **ほかのプラグインの設定が上書きされた**: Obsidian を閉じ、準備の手順 2 のバックアップ（[archive/device-testing-setup.md](../archive/device-testing-setup.md)）から `.obsidian` を戻す。
  上書きされた端末で同期する前に、ほかの端末の自動同期が止まっているか確かめる
- **Calendared が届かない**: 「設定フォルダも同期する」がオンか、正規表現が `plugins/calendared/` を外していないかを確かめる。
  `.obsidian/` か `plugins/` のフォルダそのものを無視する正規表現になっていると、中の `calendared/` も無視される
- **届いたが動かない**: Obsidian を再起動する。プラグインのバージョン（`manifest.json`）が Mac と同じか確かめる。
  iPhone なら、開発者向けのログが見られないので、Mac で同じ操作をして再現するか確かめる

## 端末ごとに確かめること

- **Windows**: 見た目（フォントや拡大率でヘッダーの幅やタイムラインが崩れないか）、ファイル名（Windows で使えない文字 `: ? * " < > |` が書式に入っていないか）、
  ショートカット（Mac の Cmd は Windows の Ctrl。ホットキーは端末ごとに設定が要る場合がある）
- **iPhone**: 狭い画面での見た目、タップ・長押し（右クリックの代わり）、ホバーを前提にした機能（Hover preview など）が使えるか
