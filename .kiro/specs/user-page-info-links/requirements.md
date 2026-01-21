# Requirements Document

## Introduction
ユーザーマイページ（他者ユーザーのページ）およびユーザーの推し作品一覧において、ユーザー情報・推しリスト・推し作品・外部リンクを閲覧し、推しリストをお気に入り登録できるようにするための要件を定義する。

## Clarifications
- ユーザーマイページのURLは `/users/:userId/` とする。
- ユーザーの推し作品一覧のURLは `/users/:userId/oshi-series/` とする。
- 推しリストは「1ユーザーにつき1つ」を前提とする。
- 対象ページの閲覧はログイン必須とする（未ログイン時はログイン画面へ誘導）。
- 外部リンクの表示は `サイト画面/他マイページ.png` の見た目を踏襲する。
- 推し作品は「作品（シリーズ）単位」の一覧を指す。
- ユーザーアイコンは画像アップロードで設定し、表示時は円形に切り抜く。
- ユーザーアイコンの容量上限は2MB、推奨サイズは512×512px（正方形）とする。

## Requirements

### Requirement 1: 他者ユーザー情報の表示
**Objective:** As a 閲覧者, I want 他者ユーザーの情報を確認できる, so that ユーザーの人物像を把握できる

#### Acceptance Criteria
1. When ユーザーマイページが表示される, the User Page UI shall 他者ユーザーのユーザーネームを表示する
2. When 他者ユーザーにアイコンが設定されている, the User Page UI shall ユーザーアイコンを表示する
3. If 他者ユーザーにアイコンが設定されていない, the User Page UI shall アイコンの空状態を表示する
4. While ユーザー情報が読み込み中, the User Page UI shall 読み込み状態を表示する
5. The User Page UI shall ユーザー情報セクションの見出しを表示する
6. The User Page UI shall ユーザーアイコンを円形に切り抜いて表示する
7. The User Page UI shall ユーザーアイコンにPNGまたはJPEG（可能ならGIF/APNG）を使用できる

### Requirement 2: 推しリストと推し作品の表示
**Objective:** As a 閲覧者, I want 他者ユーザーの推しリストと推し作品を確認できる, so that 推し傾向を把握できる

#### Acceptance Criteria
1. When ユーザーマイページが表示される, the User Page UI shall 他者ユーザーの推しリストを表示する
2. When ユーザーマイページが表示される, the User Page UI shall 他者ユーザーの推し作品を表示する
3. If 推しリストが存在しない, the User Page UI shall 推しリストの空状態を表示する
4. If 推し作品が存在しない, the User Page UI shall 推し作品の空状態を表示する
5. While 推しリストまたは推し作品が読み込み中, the User Page UI shall 読み込み状態を表示する

### Requirement 3: 外部リンクの表示
**Objective:** As a 閲覧者, I want 外部リンクをたどれる, so that 追加情報にアクセスできる

#### Acceptance Criteria
1. When 外部リンクが登録されている, the User Page UI shall 外部リンク一覧を表示する
2. When 外部リンクに表示名が含まれる, the User Page UI shall 表示名を表示する
3. If 外部リンクのURLが無効, the User Page UI shall そのリンクを表示しない
4. If 外部リンクが0件, the User Page UI shall 外部リンクセクションに空状態を表示する
5. The User Page UI shall 外部リンクをクリック可能なリンクとして表示する
6. The User Page UI shall 外部リンクを「X / YouTube / その他」のカテゴリ表示で示す
7. The User Page UI shall 外部リンクを新規タブで開く
8. The User Page UI shall 外部リンクに `rel="noopener noreferrer"` を付与する
9. The User Page UI shall `http` または `https` のURLのみを表示し、その他は無効として扱う

### Requirement 4: 対象ページへの適用
**Objective:** As a 閲覧者, I want 対象ページで同じユーザー情報と外部リンクを確認できる, so that ページ間で情報の一貫性を保てる

#### Acceptance Criteria
1. When ユーザーマイページ（`/users/:userId/`）が表示される, the User Page UI shall ユーザー情報セクションと外部リンクセクションを表示する
2. When ユーザーの推し作品一覧ページ（`/users/:userId/oshi-series/`）が表示される, the User Page UI shall ユーザー情報セクションと外部リンクセクションを表示する
3. While 対象ページ以外が表示される, the User Page UI shall これらのセクションを表示しない
4. When 対象ページ間を遷移する, the User Page UI shall 同一ユーザーの情報を表示する

### Requirement 5: 他者ユーザーの推し作品一覧ページ
**Objective:** As a 閲覧者, I want 他者ユーザーの推し作品一覧を閲覧できる, so that そのユーザーの推し傾向を把握できる

#### Acceptance Criteria
1. When 他者ユーザーの推し作品一覧ページ（`/users/:userId/oshi-series/`）が表示される, the User Page UI shall 当該ユーザーの推し作品一覧を表示する
2. When 推し作品一覧に項目が含まれる, the User Page UI shall 各推し作品項目（作品/シリーズ単位）を表示する
3. If 推し作品が存在しない, the User Page UI shall 推し作品一覧の空状態を表示する
4. While 推し作品一覧が読み込み中, the User Page UI shall 読み込み状態を表示する
5. The User Page UI shall 推し作品一覧ページの見出しを表示する

### Requirement 6: 他者ユーザーの推しリスト公開状態
**Objective:** As a 閲覧者, I want 公開設定された他者ユーザーの推しリストだけ閲覧できる, so that 公開範囲を尊重できる

#### Acceptance Criteria
1. When 他者ユーザーの推しリストが公開設定である, the User Page UI shall 推しリスト（リスト詳細）を表示する
2. If 他者ユーザーの推しリストが非公開設定である, the User Page UI shall 非公開状態の案内を表示する
3. While 公開状態の判定が完了していない, the User Page UI shall 読み込み状態を表示する
4. The User Page UI shall 公開状態の有無を推しリストの閲覧可否に反映する

### Requirement 7: 推しリストのお気に入り登録
**Objective:** As a ログインユーザー, I want 他者ユーザーの推しリストをお気に入り登録できる, so that 後で参照しやすくなる

#### Acceptance Criteria
1. When ログインユーザーが他者ユーザーの推しリストを閲覧している, the User Page UI shall お気に入り登録の操作手段を表示する
2. When ログインユーザーがお気に入り登録を実行する, the User Page UI shall 登録済みの状態を表示する
3. If ログインユーザーが未ログイン, the User Page UI shall お気に入り登録を無効化する
4. If お気に入り登録が失敗する, the User Page UI shall エラー状態を表示する
5. The User Page UI shall お気に入り登録の状態をページ再表示後も反映する

### Requirement 8: ナビゲーションと参照導線
**Objective:** As a 閲覧者, I want みんなの推しリストからユーザーマイページへ移動できる, so that 関連情報をすぐに確認できる

#### Acceptance Criteria
1. When みんなの推しリストにユーザーネームが表示される, the User Page UI shall `/users/:userId/` へのリンクを提供する
2. When 閲覧者がユーザーネームのリンクを選択する, the User Page UI shall 該当ユーザーのユーザーマイページを表示する
3. If リンク先ユーザーが存在しない, the User Page UI shall エラー状態を表示する

### Requirement 9: データ整合性とエラー状態
**Objective:** As a 閲覧者, I want 正しい状態が表示される, so that 情報の信頼性を判断できる

#### Acceptance Criteria
1. When ユーザー情報または外部リンクが更新された後にページが再表示される, the User Page UI shall 最新の情報を表示する
2. If 表示対象のユーザーが存在しない, the User Page UI shall エラー状態を表示する
3. While データ取得に失敗している, the User Page UI shall 再試行ボタンと案内を表示する
4. The User Page UI shall エラー状態と空状態を区別して表示する
