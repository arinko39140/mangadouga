# Requirements Document

## Introduction
閲覧履歴ページで、閲覧履歴（動画のみ）を簡易的に一覧表示するための要件を定義する。

## Requirements

### Requirement 1: 閲覧履歴の一覧表示
**Objective:** As a ログイン済みユーザー, I want 閲覧履歴を一覧で見たい, so that 直近に見た動画へ素早く戻れる

#### Acceptance Criteria
1. When 閲覧履歴ページを開いたとき, the Webアプリケーション shall 閲覧履歴の一覧を表示する
2. When ユーザーが閲覧履歴ページにアクセスしたいとき, the Webアプリケーション shall `/history/` で閲覧履歴ページへアクセスできる
3. While 閲覧履歴が存在する, the Webアプリケーション shall 各履歴項目（動画）のタイトルを表示する
4. While 閲覧履歴が存在する, the Webアプリケーション shall 各履歴項目（動画）のサムネイルを表示する
5. While 閲覧履歴が存在する, the Webアプリケーション shall 各履歴項目（動画）の最終閲覧日時を表示する
6. While 閲覧履歴が存在する, the Webアプリケーション shall 閲覧日時の新しい順に並べて表示する
7. While 閲覧履歴が存在する, the Webアプリケーション shall 直近30件までを表示する
8. If ユーザーがログインしていない, the Webアプリケーション shall 閲覧履歴を表示しない
9. While 閲覧履歴が存在する, the Webアプリケーション shall 各履歴項目（動画）の推しバッジ表示状態を表示する
10. While 閲覧履歴が存在する, the Webアプリケーション shall 各履歴項目（動画）の推し数を表示する
11. While 閲覧履歴が存在する, the Webアプリケーション shall 最終閲覧日時の基準としてクリック日時（clicked_at）を用いる
12. While 閲覧履歴が存在する, the Webアプリケーション shall ログインユーザー本人の履歴のみを表示する
13. While 閲覧履歴が存在する, the Webアプリケーション shall 取得対象をログインユーザー本人の履歴に限定する

### Requirement 2: 空状態の表示
**Objective:** As a ユーザー, I want 履歴がないことを確認したい, so that 次の行動を選べる

#### Acceptance Criteria
1. If 閲覧履歴が存在しない, the Webアプリケーション shall 空状態メッセージを表示する
2. If 閲覧履歴が存在しない, the Webアプリケーション shall 「閲覧履歴がありません」に相当する文言を表示する
3. When 空状態が表示されている, the Webアプリケーション shall 閲覧履歴の一覧を表示しない
4. When 空状態が表示されている, the Webアプリケーション shall トップページへの導線を表示する

### Requirement 3: 履歴項目からの遷移
**Objective:** As a ログイン済みユーザー, I want 履歴項目から対象ページへ戻りたい, so that 続きの閲覧を再開できる

#### Acceptance Criteria
1. When ユーザーが履歴項目を選択したとき, the Webアプリケーション shall 対応する話数（動画）のページへ遷移する
2. While 履歴項目が話数に紐づく場合, the Webアプリケーション shall 該当話数のページへ遷移する
3. When 履歴項目から遷移するとき, the Webアプリケーション shall 該当話数（動画）が選択済み状態で表示されるように遷移する
4. While 該当話数（動画）が選択済み状態で表示される必要がある場合, the Webアプリケーション shall `/series/{seriesId}/?selectedMovieId={movieId}` の形式で遷移する
5. While 履歴項目からの遷移に `seriesId` が必要な場合, the Webアプリケーション shall `movie` から `series_id` を取得して遷移に利用する

### Requirement 4: 閲覧の記録タイミング
**Objective:** As a ログイン済みユーザー, I want 閲覧の記録が適切なタイミングで行われる, so that 後から閲覧履歴に戻れる

#### Acceptance Criteria
1. When 任意のページから動画をクリックして作品ページ（話数ページ）へ遷移したとき, the Webアプリケーション shall その動画を閲覧として記録する
2. When 作品ページで動画の切り替え（選択）を行ったとき, the Webアプリケーション shall その動画を閲覧として記録する
3. When 再生領域が存在するページで動画の再生を開始したとき, the Webアプリケーション shall その動画を閲覧として記録する
4. When 再生開始の操作が行われたとき, the Webアプリケーション shall 「再生ボタン押下」を再生開始として扱う
5. If ユーザーがログインしていない, the Webアプリケーション shall 閲覧を記録しない
6. When 同一の動画を繰り返し閲覧した場合, the Webアプリケーション shall その都度新しい履歴を記録する
7. While 閲覧履歴を記録する場合, the Webアプリケーション shall ログインユーザー本人の履歴のみを作成できる

### Requirement 5: 未ログイン時の導線
**Objective:** As a 未ログインユーザー, I want 閲覧履歴ページにアクセスしたときに適切に案内されたい, so that ログインして履歴を確認できる

#### Acceptance Criteria
1. If ユーザーが未ログインの状態で閲覧履歴ページにアクセスしたとき, the Webアプリケーション shall ログイン画面へ誘導する
2. While ログイン誘導中, the Webアプリケーション shall 閲覧履歴の一覧を表示しない

### Requirement 6: 導線（マイページからの遷移）
**Objective:** As a ログイン済みユーザー, I want マイページから閲覧履歴へ移動したい, so that 履歴を簡単に確認できる

#### Acceptance Criteria
1. When マイページを表示しているとき, the Webアプリケーション shall 閲覧履歴ページへの導線を表示する

### Requirement 7: 履歴の保持と更新
**Objective:** As a ログイン済みユーザー, I want 履歴が最新30件に保たれる, so that 古い履歴に埋もれない

#### Acceptance Criteria
1. When 新しい履歴が記録される, the Webアプリケーション shall 直近30件を超える古い履歴を履歴一覧の対象外とする
2. While 直近30件を超える履歴が存在しても, the Webアプリケーション shall データ自体は削除しない
3. When 同一の動画を繰り返し閲覧した場合, the Webアプリケーション shall 履歴をまとめずに時系列で保持する
