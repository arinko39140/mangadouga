# Requirements Document

## Introduction
本書はトップページにおける「タイトル検索」機能の要件を定義する。対象はトップページ上の一覧からタイトルで絞り込み、利用者が目的の作品や項目を素早く見つけられることを目的とする。

## Requirements

### Requirement 1: 検索入力と実行
**Objective:** As a 訪問者, I want タイトル検索を実行できる, so that 目的の作品を素早く見つけられる

#### Acceptance Criteria
1. When ユーザーがトップページの検索入力に文字列を入力する, the Top Page Search shall 入力内容を検索クエリとして保持する
2. When ユーザーが検索を実行する操作を行う, the Top Page Search shall 現在の検索クエリでタイトル検索を開始する
3. If 検索クエリが空のまま検索が実行された場合, the Top Page Search shall 検索未適用状態として扱う

### Requirement 2: タイトル一致判定
**Objective:** As a 訪問者, I want タイトルで絞り込まれた結果を見られる, so that 該当する作品だけを確認できる

#### Acceptance Criteria
1. When タイトル検索が開始されたとき, the Top Page Search shall 対象ページの一覧データのタイトルを検索対象とする
2. The Top Page Search shall 検索クエリに一致するタイトルのみを検索結果として扱う
3. When ユーザーが検索クエリを更新して再検索を実行したとき, the Top Page Search shall 新しい検索クエリで結果を更新する

### Requirement 3: 結果表示と状態の明示
**Objective:** As a 訪問者, I want 検索結果の状態が分かる, so that 次の行動を判断できる

#### Acceptance Criteria
1. While 検索クエリが適用中である, the Top Page Search shall 検索結果一覧を表示する
2. When 検索結果が0件の場合, the Top Page Search shall 該当する結果がないことを表示する
3. When 検索未適用状態に戻ったとき, the Top Page Search shall 通常の一覧を表示する
