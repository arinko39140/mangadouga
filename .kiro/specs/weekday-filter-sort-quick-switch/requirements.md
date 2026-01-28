# Requirements Document

## Introduction
本仕様は、トップページにおける曜日別フィルタのクイック切替（タブ/ボタン）と、各ページに応じた投稿日時/人気によるソート機能の強化を定義する。

## Requirements

### Requirement 1: 曜日別フィルタのクイック切替
**Objective:** As a 利用者, I want 曜日別のフィルタを素早く切り替える, so that 目的の作品や推しをすぐに見つけられる

#### Acceptance Criteria
1. When 利用者が曜日タブ/ボタンを選択したとき, the Oshi Web App shall 選択された曜日で一覧表示対象を絞り込む
2. When 利用者が「すべて」またはフィルタ解除操作を選択したとき, the Oshi Web App shall 曜日フィルタを解除して全件表示に戻す
3. While 曜日フィルタが有効なとき, the Oshi Web App shall 現在選択中の曜日を判別可能な状態で表示する
4. If 利用者が同一の曜日タブ/ボタンを再選択したとき, the Oshi Web App shall 現在のフィルタ状態を維持する

### Requirement 2: ソート機能（投稿日/人気）
**Objective:** As a 利用者, I want 表示順を切り替える, so that 関心の高い順序で情報を確認できる

#### Acceptance Criteria
1. When 利用者がソート基準「投稿日」を選択したとき, the Oshi Web App shall 投稿日順に並び替える
2. When 利用者がソート基準「人気」を選択したとき, the Oshi Web App shall 人気順に並び替える
3. If 未対応のソート基準が指定されたとき, the Oshi Web App shall 既定のソートにフォールバックする
4. The Oshi Web App shall 作品ページの人気順ソートを推しリスト登録数に基づいて計算する

### Requirement 3: 対象ページへの適用範囲
**Objective:** As a 利用者, I want ページごとに適切な機能が提供される, so that 必要な操作だけを迷わず使える

#### Acceptance Criteria
1. The Oshi Web App shall トップページで曜日別フィルタのクイック切替を提供する
2. The Oshi Web App shall トップページで「投稿日」「人気」のソート切替を提供する
3. The Oshi Web App shall みんなの推しリスト一覧で「人気」のソート切替を提供する
4. The Oshi Web App shall 作品ページで「投稿日」「人気」のソート切替を提供する
5. When 利用者が対象ページ間を移動したとき, the Oshi Web App shall ソートの基準名と意味を統一して用いる

### Requirement 4: フィルタとソートの組み合わせ
**Objective:** As a 利用者, I want フィルタとソートを併用する, so that 条件に合う結果を適切な順序で見られる

#### Acceptance Criteria
1. When 曜日フィルタが有効な状態でソート基準を変更したとき, the Oshi Web App shall フィルタ結果に対して並び替えを適用する
2. When ソート基準が選択されている状態で曜日を変更したとき, the Oshi Web App shall 選択中のソート基準を維持したまま結果を更新する
3. While フィルタとソートの両方が有効なとき, the Oshi Web App shall それぞれの選択状態を同時に表示する

### Requirement 5: 空状態と表示整合性
**Objective:** As a 利用者, I want 結果がない場合も状況を理解する, so that 操作が正しく反映されたか判断できる

#### Acceptance Criteria
1. If フィルタ条件に一致する項目が存在しないとき, the Oshi Web App shall 空状態であることを表示する
2. The Oshi Web App shall 表示中の件数が変化したときに一覧の整合性を保って更新する
3. While フィルタやソートを切り替える操作中, the Oshi Web App shall 直前の選択が反映された結果を表示する

### Requirement 6: 既定値と初期表示
**Objective:** As a 利用者, I want 初期表示が分かりやすい, so that 迷わず操作を開始できる

#### Acceptance Criteria
1. The Oshi Web App shall 初期表示時の既定ソート基準を「人気」に設定する
2. The Oshi Web App shall 初期表示時に当日の曜日を既定の曜日フィルタとして選択する
3. When ページを再読み込みしたとき, the Oshi Web App shall 当日の曜日フィルタと既定ソート（人気）で表示する
