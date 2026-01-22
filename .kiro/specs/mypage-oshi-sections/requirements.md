# Requirements Document

## Introduction
本仕様はマイページ内の「推しリスト」「推し作品」「お気に入り推しリスト」各セクションの表示要件を定義し、閲覧者が目的の一覧へ迷わず到達できることを目的とする。

## Requirements

### Requirement 1: セクション構成の表示
**Objective:** As a 閲覧者, I want マイページに推し関連のセクションが整理された状態で表示される, so that 目的の一覧へ素早くアクセスできる

#### Acceptance Criteria
1. When マイページが表示される, the マイページUI shall 推しリスト・推し作品・お気に入り推しリストの3セクションを表示する
2. When 各セクションが表示される, the マイページUI shall セクション名を示す見出しを表示する
3. The マイページUI shall セクションを一貫した順序で表示する
4. While マイページが表示されている, the マイページUI shall 各セクションが独立した領域として識別できる状態を維持する

### Requirement 2: セクション内容の概要表示
**Objective:** As a 閲覧者, I want 各セクションの内容が概要として表示される, so that 内容の概要を把握できる

#### Acceptance Criteria
1. When 推しリストセクションが表示される, the マイページUI shall 推しリストの概要を表示する
2. When 推し作品セクションが表示される, the マイページUI shall 推し作品の概要を表示する
3. When お気に入り推しリストセクションが表示される, the マイページUI shall お気に入り推しリストの概要を表示する
4. When 推し作品セクションが表示される, the マイページUI shall 新しく追加された順で最大3件程度の推し作品を表示する
5. When 一覧項目が表示される, the マイページUI shall 各項目の名称を表示する
6. The マイページUI shall 項目数の表示を必須としない

### Requirement 3: 空状態の表示
**Objective:** As a 閲覧者, I want 項目がない場合でも状態が分かる, so that 期待と実態の差分を理解できる

#### Acceptance Criteria
1. If 推しリストが0件である, the マイページUI shall 空状態メッセージを表示する
2. If 推し作品が0件である, the マイページUI shall 空状態メッセージを表示する
3. If お気に入り推しリストが0件である, the マイページUI shall 空状態メッセージを表示する
4. While 空状態メッセージが表示されている, the マイページUI shall 当該セクションに項目がないことが分かる文言を表示する

### Requirement 4: 公開設定に応じた表示制御
**Objective:** As a ログインユーザー, I want 公開設定に応じて他ユーザーからの表示が制御される, so that 表示範囲を管理できる

#### Acceptance Criteria
1. Where 公開/非公開の設定が有効な場合, the マイページUI shall 他ユーザーからの閲覧時に設定に従って各セクションの表示可否を決定する
2. When 非公開に設定されたセクションがある, the マイページUI shall 他ユーザー閲覧時に当該セクションを表示しない
3. When 公開に設定されたセクションがある, the マイページUI shall 他ユーザー閲覧時に当該セクションを表示する
4. The マイページUI shall 本人閲覧時には公開/非公開の設定によって表示内容を変更しない
5. While 非公開セクションが非表示である, the マイページUI shall 他のセクションの表示に影響を与えない

### Requirement 5: 推し作品セクションの項目遷移
**Objective:** As a 閲覧者, I want 推し作品の詳細一覧へ遷移できる, so that 追加した作品を確認できる

#### Acceptance Criteria
1. When 推し作品セクションが表示される, the マイページUI shall 推し作品ページへの導線を表示する
2. When ユーザーページ（/users/{userId}/）上で導線を選択する, the マイページUI shall 当該ユーザーのuserIdに紐づく推し作品ページ（/users/{userId}/oshi-series/）へ遷移できる導線を表示する

### Requirement 6: お気に入り推しリストの専用ページ
**Objective:** As a 閲覧者, I want お気に入り推しリストの専用ページを閲覧できる, so that 推しの詳細を閲覧できる

#### Acceptance Criteria
1. The マイページUI shall お気に入り推しリストの専用ページへの導線を表示する
2. When お気に入り推しリストの専用ページが表示される, the 専用ページUI shall ユーザーの推しリストをグリッド形式で表示する

### Requirement 7: 推しリストセクションの項目遷移
**Objective:** As a 閲覧者, I want 推しリストの各項目から専用ページへ遷移できる, so that 推しの詳細を閲覧できる

#### Acceptance Criteria
1. When 推しリストセクションの項目が表示される, the マイページUI shall 各項目から推しリストページへ遷移できる導線を表示する

### Requirement 8: 推し作品ページの一覧表示内容
**Objective:** As a ログインユーザー, I want 推し作品ページで登録済み作品を一覧表示できる, so that 自分の推し作品を把握できる

#### Acceptance Criteria
1. When 推し作品ページ（/users/{userId}/oshi-series/）が表示される, the 推し作品ページUI shall Supabaseのuser_seriesとseriesテーブル情報を用いて登録済み作品の一覧を表示する
2. When 一覧項目が表示される, the 推し作品ページUI shall seriesテーブルの主要情報（series_id, title, favorite_count, update）を表示する
3. When 一覧項目が表示される, the 推し作品ページUI shall movieから代表サムネイルを取得して表示する
4. When 一覧項目が表示される, the 推し作品ページUI shall 作品名を表示する
5. When 一覧項目が表示される, the 推し作品ページUI shall 作品ページへ遷移できる導線を表示する
6. Where 表示形式の切り替え機能が提供される場合, the 推し作品ページUI shall リスト形式とグリッド形式の表示を切り替えられる

### Requirement 9: 推し作品ページの管理操作
**Objective:** As a ログインユーザー, I want 推し作品ページで登録・解除・並べ替えができる, so that 推し作品を管理できる

#### Acceptance Criteria
1. When 登録操作を行う, the 推し作品ページUI shall user_seriesに推し作品として登録される
2. When 解除操作を行う, the 推し作品ページUI shall user_seriesの推し作品登録を解除する
3. When 並べ替え操作を行う, the 推し作品ページUI shall お気に入り数順で一覧を並べ替える
4. When 並べ替えの昇順/降順を選択する, the 推し作品ページUI shall 選択された順序で一覧を並べ替える
