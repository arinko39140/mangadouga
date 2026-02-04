# Requirements Document

## Introduction
閲覧履歴ページで、閲覧履歴（動画のみ）を簡易的に一覧表示するための要件を定義する。

## Requirements

### Requirement 1: 閲覧履歴の一覧表示
**Objective:** As a ログイン済みユーザー, I want 閲覧履歴を一覧で見たい, so that 直近に見た動画へ素早く戻れる

#### Acceptance Criteria
1. When 閲覧履歴ページを開いたとき, the Webアプリケーション shall 閲覧履歴の一覧を表示する
2. While 閲覧履歴が存在する, the Webアプリケーション shall 各履歴項目（動画）のタイトルを表示する
3. While 閲覧履歴が存在する, the Webアプリケーション shall 各履歴項目（動画）のサムネイルを表示する
4. While 閲覧履歴が存在する, the Webアプリケーション shall 各履歴項目（動画）の最終閲覧日時を表示する
5. While 閲覧履歴が存在する, the Webアプリケーション shall 閲覧日時の新しい順に並べて表示する
6. While 閲覧履歴が存在する, the Webアプリケーション shall 直近30件までを表示する
7. If ユーザーがログインしていない, the Webアプリケーション shall 閲覧履歴を表示しない

### Requirement 2: 空状態の表示
**Objective:** As a ユーザー, I want 履歴がないことを確認したい, so that 次の行動を選べる

#### Acceptance Criteria
1. If 閲覧履歴が存在しない, the Webアプリケーション shall 空状態メッセージを表示する
2. If 閲覧履歴が存在しない, the Webアプリケーション shall 「閲覧履歴がありません」に相当する文言を表示する
3. When 空状態が表示されている, the Webアプリケーション shall 閲覧履歴の一覧を表示しない

### Requirement 3: 履歴項目からの遷移
**Objective:** As a ログイン済みユーザー, I want 履歴項目から対象ページへ戻りたい, so that 続きの閲覧を再開できる

#### Acceptance Criteria
1. When ユーザーが履歴項目を選択したとき, the Webアプリケーション shall 対応する話数（動画）のページへ遷移する
2. While 履歴項目が話数に紐づく場合, the Webアプリケーション shall 該当話数のページへ遷移する

### Requirement 4: 閲覧の記録タイミング
**Objective:** As a ログイン済みユーザー, I want 閲覧の記録が適切なタイミングで行われる, so that 後から閲覧履歴に戻れる

#### Acceptance Criteria
1. When 任意のページから動画をクリックして作品ページ（話数ページ）へ遷移したとき, the Webアプリケーション shall その動画を閲覧として記録する
2. When 作品ページで動画の切り替え（選択）を行ったとき, the Webアプリケーション shall その動画を閲覧として記録する
3. If ユーザーがログインしていない, the Webアプリケーション shall 閲覧を記録しない
4. When 動画クリックで作品ページへ遷移しない, the Webアプリケーション shall 閲覧を記録しない
5. When 直近の閲覧履歴と同一の動画が選択された場合, the Webアプリケーション shall 新しい履歴を作成しない
