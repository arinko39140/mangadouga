# Requirements Document

## Project Description (Input)
みんなの推しリスト系 - 対象ページ: トップページ, みんなの推しリスト一覧, お気に入り推しリスト - お気に入り登録（ログインユーザーに紐づけ） - 登録済みのみ表示（お気に入り推しリスト） - 推しリストページの公開/非公開UI - トップページからの導線追加

## Introduction
本仕様は「みんなの推しリスト一覧」と「お気に入り推しリスト」における、お気に入り登録のユーザー紐づけと登録済みのみ表示の振る舞いを定義する。対象はログインユーザーの操作と表示であり、公開リストの閲覧体験を損なわない前提で要件化する。

## Requirements

### Requirement 1: ログインユーザーの識別とアクセス制御
**Objective:** As a ログインユーザー, I want お気に入り操作が自分のアカウントに紐づくこと, so that 他人の状態と混ざらず安全に管理できる

#### Acceptance Criteria
1. When ユーザーが未ログインでお気に入り推しリストにアクセスする, the Oshi List UI shall ログインが必要である旨を表示する
2. While ユーザーが未ログインである, the Oshi List UI shall お気に入り登録/解除の操作を無効または非表示にする
3. The Oshi List UI shall お気に入り登録/解除の操作を現在のログインユーザーに紐づける
4. If お気に入り操作中に認証状態が無効になった, the Oshi List UI shall 操作を完了せず認証が必要である旨を表示する
5. The Oshi List UI shall お気に入り推しリストで他ユーザーの登録結果を表示しない

### Requirement 2: お気に入り登録と解除
**Objective:** As a ログインユーザー, I want 推しリストをお気に入り登録/解除できること, so that 自分の推しだけを管理できる

#### Acceptance Criteria
1. When ログインユーザーが推しリストをお気に入り登録する操作を行う, the Oshi List UI shall 当該推しリストをそのユーザーのお気に入りとして登録する
2. When ログインユーザーが推しリストのお気に入り解除を行う, the Oshi List UI shall 当該推しリストをそのユーザーのお気に入りから解除する
3. While 推しリストがお気に入り登録済みである, the Oshi List UI shall お気に入り状態であることを示す
4. If 推しリストが特定できないまたは利用不可である, the Oshi List UI shall お気に入り登録/解除を行わずエラーを表示する
5. The Oshi List UI shall 同一ユーザーの同一推しリストに対して重複したお気に入り登録を作成しない
6. When ログインユーザーがみんなの推しリスト一覧の推しリストをお気に入り推しリストに登録する操作を行う, the Oshi List UI shall 当該推しリストをそのユーザーのお気に入り推しリストに登録する

### Requirement 3: お気に入り推しリストの登録済みのみ表示
**Objective:** As a ログインユーザー, I want 自分の登録済み推しリストだけが一覧表示されること, so that すぐに見返せる

#### Acceptance Criteria
1. When ログインユーザーがお気に入り推しリストを開く, the Oshi List UI shall そのユーザーが登録した推しリストのみを表示する
2. While ログインユーザーにお気に入り登録が存在しない, the Oshi List UI shall 空状態であることを表示する
3. When お気に入り登録/解除が行われた, the Oshi List UI shall お気に入り推しリストの表示内容を最新状態に更新する
4. The Oshi List UI shall お気に入り推しリストに重複した推しリストを表示しない

### Requirement 4: みんなの推しリスト一覧での表示整合
**Objective:** As a 利用者, I want みんなの推しリスト一覧を閲覧できること, so that 推しリストを探せる

#### Acceptance Criteria
1. The Oshi List UI shall みんなの推しリスト一覧をログイン状態に関わらず表示する
2. When ログインユーザーがみんなの推しリスト一覧を閲覧する, the Oshi List UI shall 当該ユーザーのお気に入り登録状態を表示する
3. While 未ログインユーザーがみんなの推しリスト一覧を閲覧する, the Oshi List UI shall 個人に紐づくお気に入り状態を表示しない
4. When ログインユーザーがみんなの推しリスト一覧の推しリストをお気に入り推しリストに登録する操作を行う, the Oshi List UI shall 当該推しリストをそのユーザーのお気に入り推しリストに登録する
5. The Oshi List UI shall みんなの推しリスト一覧にお気に入り登録数を表示する
6. When みんなの推しリスト一覧で並び替え条件を選択する, the Oshi List UI shall お気に入り登録数が多い順または少ない順で表示する
7. The Oshi List UI shall みんなの推しリスト一覧の初期表示をお気に入り登録数が多い順とする

### Requirement 5: 推しリストページの公開/非公開UI
**Objective:** As a ログインユーザー, I want 推しリストページを公開/非公開に切り替えられること, so that 公開範囲をコントロールできる

#### Acceptance Criteria
1. The Oshi List UI shall 推しリストページ内に公開/非公開を切り替えるUIを表示する
2. When ログインユーザーが公開設定を選択する, the Oshi List UI shall 推しリストページを公開状態として扱う
3. When ログインユーザーが非公開設定を選択する, the Oshi List UI shall 推しリストページを非公開状態として扱う
4. While 推しリストページが非公開である, the Oshi List UI shall 未ログインユーザーに当該ページの内容を表示しない
5. If ログインユーザーが推しリストの所有者でない, the Oshi List UI shall 公開/非公開の操作UIを表示しない
6. The Oshi List UI shall 公開/非公開の操作を推しリストの所有者にのみ許可する

### Requirement 6: 推しリスト登録アイコンとバッジ表示
**Objective:** As a 利用者, I want 推しリストに登録状態が分かる表示があること, so that 登録状況を把握できる

#### Acceptance Criteria
1. The Oshi List UI shall 推しリストにお気に入り登録アイコンを表示する
2. When 公開されている他ユーザーの推しリストページを表示する, the Oshi List UI shall 星アイコンの登録バッジを表示する
3. While 推しリストがお気に入り登録済みである, the Oshi List UI shall 登録済みであることが分かる表示にする
4. The Oshi List UI shall 推しリストページにお気に入り登録数を表示する
5. When お気に入り登録数に変更があった, the Oshi List UI shall 推しリストページとみんなの推しリスト一覧の登録数表示を最新状態に更新する

### Requirement 7: トップページからみんなの推しリストページへの導線
**Objective:** As a 利用者, I want トップページからみんなの推しリストページへ移動できること, so that 迷わず一覧にアクセスできる

#### Acceptance Criteria
1. The Oshi List UI shall トップページにみんなの推しリストページへ移動できるUIを表示する
2. When 利用者がトップページの導線を選択する, the Oshi List UI shall みんなの推しリストページへ遷移する
