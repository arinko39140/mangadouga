# Requirements Document

## Introduction
本仕様は、推しリストページにおける推し登録をログインユーザーに紐づけ、登録済みのみ表示する振る舞いを定義する。

## Requirements

### Requirement 1: 推し登録のユーザー紐づけ
**Objective:** As a ログインユーザー, I want 推しを自分のアカウントに紐づけて登録したい, so that 自分の推しリストを管理できる

#### Acceptance Criteria
1. When 推し登録が実行されたとき, the 推しリスト機能 shall ログインユーザーIDと推しを紐づけて登録する
2. If ログインユーザーが未認証のとき, then the 推しリスト機能 shall 登録処理を行わずログインを促す
3. If 推しの識別情報が無効または不足しているとき, then the 推しリスト機能 shall 登録を拒否し理由を表示する
4. The 推しリスト機能 shall 同一ユーザーの同一推しの重複登録を防止する

### Requirement 2: 登録済み推しのみの一覧表示
**Objective:** As a ログインユーザー, I want 登録済みの推しだけを一覧で見たい, so that 自分の推し状況を確認できる

#### Acceptance Criteria
1. When 推しリストページを表示するとき, the 推しリスト機能 shall ログインユーザーに紐づく登録済み推しのみを一覧表示する
2. While ログインユーザーが未認証のとき, the 推しリスト機能 shall 登録済み推し一覧を表示しない
3. If 登録済み推しが0件のとき, then the 推しリスト機能 shall 空状態であることを表示する
4. The 推しリスト機能 shall 他ユーザーに紐づく登録済み推しを表示しない

### Requirement 3: 登録結果の反映と通知
**Objective:** As a ログインユーザー, I want 登録結果が画面に反映されてほしい, so that 登録状態を把握できる

#### Acceptance Criteria
1. When 推し登録が成功したとき, the 推しリスト機能 shall 登録済みであることを示す状態を表示する
2. When 推し登録が成功したとき, the 推しリスト機能 shall 登録済み推し一覧に対象を反映する
3. If 推し登録が失敗したとき, then the 推しリスト機能 shall 失敗した旨を表示する

### Requirement 4: データ取得とエラー処理
**Objective:** As a ログインユーザー, I want 一覧取得の状況や失敗が分かるようにしたい, so that 迷わず操作できる

#### Acceptance Criteria
1. When 登録済み推しの取得処理を開始したとき, the 推しリスト機能 shall 読み込み中であることを表示する
2. If 登録済み推しの取得に失敗したとき, then the 推しリスト機能 shall エラーが発生した旨を表示する
3. The 推しリスト機能 shall 取得失敗時に登録済み推し一覧を表示しない

### Requirement 5: 推しリストの公開/非公開設定
**Objective:** As a ログインユーザー, I want 自分の推しリストを公開/非公開に切り替えたい, so that 見せたい相手にだけ共有できる

#### Acceptance Criteria
1. When ログインユーザーが公開/非公開を切り替えたとき, the 推しリスト機能 shall その設定を保存する
2. While 推しリストが非公開のとき, the 推しリスト機能 shall 他ユーザーに推しリスト内容を表示しない
3. While 推しリストが公開のとき, the 推しリスト機能 shall 他ユーザーに推しリスト内容を表示する

### Requirement 6: 公開推しリストのお気に入り登録
**Objective:** As a 他ユーザー, I want 公開されている推しリストをお気に入り登録したい, so that 後で見返せる

#### Acceptance Criteria
1. When 他ユーザーが公開推しリストのお気に入り登録を実行したとき, the 推しリスト機能 shall そのユーザーに紐づけてお気に入り登録する
2. If 推しリストが非公開のとき, then the 推しリスト機能 shall 他ユーザーによるお気に入り登録を許可しない
3. The 推しリスト機能 shall 同一ユーザーによる同一推しリストの重複お気に入り登録を防止する

### Requirement 7: 推しリストのお気に入り数表示
**Objective:** As a 閲覧ユーザー, I want 推しリストのお気に入り数を知りたい, so that 人気度を把握できる

#### Acceptance Criteria
1. When 推しリストを表示するとき, the 推しリスト機能 shall お気に入り登録されたユーザー数を表示する
2. While 推しリストが非公開のとき, the 推しリスト機能 shall お気に入り数を表示しない

### Requirement 8: 推しリストの表示形式切り替え
**Objective:** As a ログインユーザー, I want 推しリスト内の動画表示形式を切り替えたい, so that 見やすい形式で確認できる

#### Acceptance Criteria
1. When ログインユーザーが表示形式を切り替えたとき, the 推しリスト機能 shall 選択された形式で動画一覧を表示する
2. The 推しリスト機能 shall 表示形式の変更後も推しリストの内容を維持する
