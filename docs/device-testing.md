# 実機での確かめ方（Windows・iPhone）

開発は Mac で行い、`npm run deploy` で Mac の Vault にプラグインを入れる（[development.md](development.md)）。
ほかの端末（Windows、iPhone）では、Remotely Save で **Calendared のフォルダだけ** を同期して試す。

コミュニティプラグインとして公開したあとは、どの端末でもプラグインの一覧から入れられるので、この手順は要らなくなる。

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

## 一度だけの準備

途中で問題が起きても戻せるように、同期を止め、バックアップを取ってから進める。

### 1. すべての端末で自動同期を止める

- Mac・Windows・iPhone それぞれで、Remotely Save の設定の自動同期（一定時間ごとの同期、起動時の同期、保存時の同期）をオフにする
- 作業中に別の端末が勝手に同期して、設定を上書きするのを防ぐため

### 2. Mac の `.obsidian` をバックアップする

- Obsidian を閉じてから、Vault の `.obsidian` フォルダを丸ごと、Vault の外にコピーする（例: 日付を付けたフォルダ名で）
- Windows・iPhone の `.obsidian` も、できればバックアップする（iPhone はファイルアプリからコピーできる場合がある）

### 3. Mac で設定する

1. Remotely Save の設定で「設定フォルダも同期する」をオンにする
2. 「同期しないパス」に次の 1 行を足す（`.obsidian` の中のうち、`plugins/calendared/` 以外は同期しない、という意味）

   ```
   ^\.obsidian/(?!plugins/calendared/).*
   ```

   - 端末ごとに Calendared の設定を変えたいときは、`^\.obsidian/plugins/calendared/data\.json$` も足す
     （足さなければ、週の始まりや書式などの設定も全端末で同じになる）

### 4. 送られる中身を確かめてから、手動で 1 回同期する

- Remotely Save に同期の予定を確かめる機能（ドライラン、ログ）があれば使い、`.obsidian` の中で送られるのが `plugins/calendared/` の中だけか見る
- ほかのプラグインの設定や `community-plugins.json`、`hotkeys.json` などが含まれていたら **同期しない**。正規表現を見直す
- 問題なければ手動で同期する

### 5. Windows・iPhone で設定する

1. 手順 3 と同じ 2 つの設定をする
2. 手動で同期する。`.obsidian/plugins/calendared/` が届く
3. Obsidian の設定 →「コミュニティプラグイン」で、制限モードがオンならオフにし、Calendared を有効にする
   （有効なプラグインの一覧は同期しないので、端末ごとに一度だけ必要）
4. 動かなければ、Obsidian を再起動する

### 6. 自動同期を戻す

- すべての端末で、手順 1 で止めた自動同期を元に戻す

## ふだんの流れ

1. Mac で `npm run deploy`（Mac の Vault の Calendared が新しくなる）
2. Mac で同期する
3. ほかの端末で同期し、Obsidian を再起動する（またはプラグインをオフ → オン）

## うまくいかなかったとき

- **ほかのプラグインの設定が上書きされた**: Obsidian を閉じ、手順 2 のバックアップから `.obsidian` を戻す。
  上書きされた端末で同期する前に、ほかの端末の自動同期が止まっているか確かめる
- **Calendared が届かない**: 「設定フォルダも同期する」がオンか、正規表現が `plugins/calendared/` を外していないかを確かめる。
  正規表現の「〜以外」（`(?!…)`）が効かない場合は、ほかのプラグインのフォルダを 1 つずつ外す書き方に変える
- **届いたが動かない**: Obsidian を再起動する。プラグインのバージョン（`manifest.json`）が Mac と同じか確かめる。
  iPhone なら、開発者向けのログが見られないので、Mac で同じ操作をして再現するか確かめる

## 端末ごとに確かめること

- **Windows**: 見た目（フォントや拡大率でヘッダーの幅やタイムラインが崩れないか）、ファイル名（Windows で使えない文字 `: ? * " < > |` が書式に入っていないか）、
  ショートカット（Mac の Cmd は Windows の Ctrl。ホットキーは端末ごとに設定が要る場合がある）
- **iPhone**: 狭い画面での見た目、タップ・長押し（右クリックの代わり）、ホバーを前提にした機能（Hover preview など）が使えるか
