# Requirements Document

## Introduction
本仕様は、全ページを対象としたUI仕上げ（タイポグラフィ、配色、カード強調、アニメーション）と、データ更新フローの整理、アクセシビリティ調整を定義する。

## Requirements

### Requirement 1: サイト全体の視覚的一貫性
**Objective:** As a サイト閲覧者, I want 全ページで一貫した視覚表現が提供される, so that コンテンツに集中しやすい

#### Acceptance Criteria
1.1. When 任意のページがレンダリングされるとき, the MangaDouga UI shall ページ間で統一されたタイポグラフィと色のトーンを適用する
1.2. When ナビゲーション要素が表示されるとき, the MangaDouga UI shall 全ページで同一の視覚ルールとレイアウト規則に従って表示する
1.3. The MangaDouga UI shall 見出し、本文、補足情報の階層が視覚的に区別できるようにする
1.4. While ダーク/ライトなどのテーマ切替が存在しない場合, the MangaDouga UI shall 既定テーマ内で統一された配色体系を維持する
1.5. The MangaDouga UI shall 「全ページ」の対象範囲を明示し、その範囲内で一貫性を担保する（対象はReactページのみで、`content/` 配下の静的ページと `LoginPage` / `NotFound` は除外）

### Requirement 2: タイポグラフィと配色の強化
**Objective:** As a サイト閲覧者, I want 文字の読みやすさと配色の可読性が高い, so that 情報を迷わず理解できる

#### Acceptance Criteria
2.1. The MangaDouga UI shall 本文テキストが長文でも読みやすい字間・行間を維持する
2.2. When 重要情報（タイトル、作者名、カテゴリ）が表示されるとき, the MangaDouga UI shall 視覚的に強調されたタイポグラフィを適用する
2.3. If 背景色と前景色のコントラストが不足する状態が検出される場合, then the MangaDouga UI shall 視認性が確保される配色に調整する
2.4. While 画像やカード背景の上にテキストが重なる場合, the MangaDouga UI shall テキストの可読性を損なわない表示にする
2.5. The MangaDouga UI shall テキストと背景のコントラスト基準（例: WCAG AA 相当など）を明記し、その基準に準拠する

### Requirement 3: カード表示の強調とレイアウト
**Objective:** As a サイト閲覧者, I want 作品やクリエイターのカードが視覚的に際立つ, so that 推し情報を素早く把握できる

#### Acceptance Criteria
3.1. When カード一覧が表示されるとき, the MangaDouga UI shall カード間隔と配置が整理され、一覧性が保たれる
3.2. The MangaDouga UI shall 主要カードと補助カードの重要度が視覚的に区別できるようにする
3.3. When カードにホバーまたはフォーカスが当たるとき, the MangaDouga UI shall 視覚的な反応が一貫したルールで提示される
3.4. While 画面幅が変化する場合, the MangaDouga UI shall カード配置が読みやすさを維持するように再配置される
3.5. The MangaDouga UI shall 主要コンポーネント（カード/ボタン/バッジ/タグ）の共通スタイル規則を定義し、全ページで遵守する

### Requirement 4: アニメーションと初回ロード体験
**Objective:** As a サイト閲覧者, I want 自然なアニメーションで内容が提示される, so that 体験が心地よく感じられる

#### Acceptance Criteria
4.1. When ページの初回ロードが完了したとき, the MangaDouga UI shall コンテンツが段階的に表示されるアニメーションを提供する
4.2. When カードが画面内に出現するとき, the MangaDouga UI shall カード出現アニメーションを適用する
4.3. While アニメーションが再生される場合, the MangaDouga UI shall 読みやすさや操作性を阻害しない速度と動きにする
4.4. If ユーザーが簡易表示や動きの抑制を希望する設定を利用している場合, then the MangaDouga UI shall アニメーションを最小限に抑える
4.5. The MangaDouga UI shall `prefers-reduced-motion` を検知し、初回ロード/カード出現/ホバーの動きを抑制する具体範囲を定義する

### Requirement 5: データ更新フローの整理
**Objective:** As a コンテンツ更新担当者, I want CSV/JSONの更新手順が明確, so that 誤更新を防ぎつつ効率的に更新できる

#### Acceptance Criteria
5.1. The project documentation shall CSVおよびJSONの更新手順を手順化して記載する
5.2. When コンテンツ更新手順を参照するとき, the project documentation shall 必要な入力項目、形式、配置場所を明示する
5.3. If 更新に失敗する典型例がある場合, then the project documentation shall 代表的なエラー原因と対処方法を記載する
5.4. The project documentation shall 更新後に確認すべき表示結果のチェック項目を含める
5.5. The project documentation shall CSV/JSONの対象データ範囲（静的データ / Supabase連携データなど）と反映先（ビルド/DB/画面）を明示する。正の情報源（SSOT）はSupabaseとし、CSV/JSONは補助資料であることを明記する

### Requirement 6: アクセシビリティ（キーボード操作とフォーカス）
**Objective:** As a キーボード利用者, I want 主要操作をキーボードだけで完結できる, so that マウスがなくても利用できる

#### Acceptance Criteria
6.1. The MangaDouga UI shall 主要なナビゲーションとカード操作がキーボードで到達可能である
6.2. When フォーカスが移動するとき, the MangaDouga UI shall フォーカス位置が視認できる状態で表示される
6.3. If 操作不能な要素にフォーカスが到達する場合, then the MangaDouga UI shall その要素をフォーカス順から除外する
6.4. While モーダルやポップアップが表示される場合, the MangaDouga UI shall フォーカスがその領域内に留まる
6.5. The MangaDouga UI shall `:focus-visible` を基準に、フォーカスリングの色/太さ/表示規則を明示し、全ページで統一する

### Requirement 7: アクセシビリティ（コントラストと可視性）
**Objective:** As a 低視力の閲覧者, I want 重要情報が見やすいコントラストで表示される, so that 内容を読み取れる

#### Acceptance Criteria
7.1. The MangaDouga UI shall テキストと背景のコントラストが可読性を満たす状態で表示される
7.2. When 状態変化（選択、エラー、警告）が表示されるとき, the MangaDouga UI shall 色だけに依存しない視覚的手がかりを提供する
7.3. While 画像や装飾要素が多い場合, the MangaDouga UI shall 重要情報の可視性を維持する
7.4. The MangaDouga UI shall コントラスト基準の測定方法と対象（本文/見出し/補足/ボタンラベル）を明示する
