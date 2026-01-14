# Requirements Document

## Introduction
本仕様は、作品ページの動画再生領域と話数一覧（サムネイル・タイトル・日付・推しバッジ）に関する表示と操作の要件を定義する。

## Requirements

### Requirement 1: 動画再生領域の基本表示
**Objective:** As a 閲覧ユーザー, I want 選択した話数を再生できる, so that 作品を連続して視聴できる

#### Acceptance Criteria
1. The Work Page UI shall 動画再生領域を作品ページ内に表示する
2. When 作品ページが初期表示され話数一覧が存在する場合, the Work Page UI shall 最新話を既定の選択として扱う
3. When 作品ページが初期表示され話数一覧が存在する場合, the Work Page UI shall 最新話の動画を再生領域に表示する
4. When 話数が選択されたとき, the Work Page UI shall 選択された話数の動画を再生領域に表示する
5. While 選択された話数の再生準備中である間, the Work Page UI shall 再生準備中であることを示す状態を表示する

### Requirement 2: 話数一覧の表示
**Objective:** As a 閲覧ユーザー, I want 話数を一覧で確認できる, so that 視聴したい話数を選べる

#### Acceptance Criteria
1. The Work Page UI shall 話数一覧を表示する
2. When 話数一覧が表示されるとき, the Work Page UI shall 各話数にサムネイル、タイトル、公開日を表示する
3. The Work Page UI shall 話数一覧の並び順として「最新話」「古い順」を選択できるようにする
4. When 作品ページが初期表示されるとき, the Work Page UI shall 話数一覧の並び順を「最新話」に設定する
5. When ユーザーが「最新話」を選択したとき, the Work Page UI shall 公開日が新しい順に話数を表示する
6. When ユーザーが「古い順」を選択したとき, the Work Page UI shall 公開日が古い順に話数を表示する
7. If 話数一覧が空である場合, the Work Page UI shall 話数が存在しないことを示す状態を表示する

### Requirement 3: 作品タイトルの表示
**Objective:** As a 閲覧ユーザー, I want 作品のタイトルを確認できる, so that 視聴対象を把握できる

#### Acceptance Criteria
1. The Work Page UI shall 作品タイトルを作品ページ上で表示する
2. While 作品情報が取得中である間, the Work Page UI shall タイトルの読み込み状態を示す表示を行う

### Requirement 4: 作品お気に入り（スター）登録
**Objective:** As a 閲覧ユーザー, I want 作品をお気に入り登録できる, so that 後で見返しやすくなる

#### Acceptance Criteria
1. The Work Page UI shall 作品のお気に入り登録用のスター表示を行う
2. When ユーザーがスター表示を選択したとき, the Work Page UI shall 作品をお気に入りに登録する
3. If ユーザーが未ログインの状態でスター表示を選択したとき, the Work Page UI shall ログイン画面へ誘導する
4. When 作品がお気に入りに登録されている場合, the Work Page UI shall 登録済みであることを示す状態を表示する

### Requirement 5: 話数選択と再生領域の連動
**Objective:** As a 閲覧ユーザー, I want 話数一覧から再生対象を切り替えられる, so that 視聴したい話数へ素早く移動できる

#### Acceptance Criteria
1. When ユーザーが話数一覧の項目を選択したとき, the Work Page UI shall 選択状態を話数一覧に反映する
2. When 話数の選択が変更されたとき, the Work Page UI shall 再生領域の表示内容を新しい話数に更新する
3. While 話数が再生領域に表示されている間, the Work Page UI shall 該当話数を一覧で選択状態として保持する

### Requirement 6: 話数メタ情報の扱い
**Objective:** As a 閲覧ユーザー, I want 話数の情報を理解できる, so that 視聴対象を判断できる

#### Acceptance Criteria
1. The Work Page UI shall 話数タイトルをユーザーが判別できる形で表示する
2. The Work Page UI shall 話数の公開日をユーザーが判別できる形で表示する
3. If 話数の公開日が未設定の場合, the Work Page UI shall 公開日が未設定であることを示す表示を行う

### Requirement 7: 話数数の表示
**Objective:** As a 閲覧ユーザー, I want 作品の話数が全何話か把握できる, so that 視聴範囲を把握できる

#### Acceptance Criteria
1. The Work Page UI shall 話数一覧に登録されている話数の総数を「全12話」のような表記で表示する
2. When 話数一覧の内容が更新されたとき, the Work Page UI shall 表示している話数の総数を更新する

### Requirement 8: 推し登録済み（済）表示
**Objective:** As a 閲覧ユーザー, I want 推しリストに登録済みの話数をひと目で識別できる, so that 視聴対象を判断しやすい

#### Acceptance Criteria
1. Where 話数が推しリストに登録されている場合, the Work Page UI shall 該当話数に「済」表示を行う
2. If 話数が推しリストに登録されていない場合, the Work Page UI shall 該当話数に「推」表示を行う
3. When ユーザーが「推」表示を選択したとき, the Work Page UI shall 話数を推しリストに登録する
4. If ユーザーが未ログインの状態で「推」表示を選択したとき, the Work Page UI shall ログイン画面へ誘導する
5. When 推しリストへの登録が完了したとき, the Work Page UI shall 「推」表示を「済」表示に切り替える
6. The Work Page UI shall 話数一覧上で登録済みの話数を識別できるようにする
