# Gap Analysis: top-page-search-title

## Analysis Summary
- トップページは曜日別一覧/過去100件の表示基盤とソートUIが既にあり、検索はクライアント側フィルタで実装可能。
- 検索入力・実行・未適用状態のUIと状態管理が存在せず、検索0件時の表示も不足している。
- 検索対象の範囲（曜日別一覧のみ/過去100件も含む/両方）と一致条件（部分一致/完全一致/大小区別）が要件上不明確で、設計フェーズでの確認が必要。

## Current State Investigation
### Top Page UI/State
- `src/TopPage.jsx` に曜日別一覧・過去100件一覧・並び替え（人気/最新/最古）の状態とUIがある。
- 一覧は `selectedList`（曜日別）と `recentListItems`（過去100件）でメモ化され、各セクションで空/エラー/ローディングを表示する。
- 検索入力や検索状態の概念は存在しない。

### Data Providers
- `src/weekdayDataProvider.js` が movie テーブルを読み込み、アイテムに `title` を提供する。
- 曜日別一覧は「過去1週間」フィルタを前提に `fetchWeekdayLists` で取得する。
- 過去100件は `fetchWeekdayItems` で取得し、上限100件の範囲で並び替えを行う。

### UI Patterns & Styling
- `src/App.css` に `.search` と `input` の共通スタイルが存在するが、トップページでは未使用。
- 一覧の空状態は「一覧がありません。」で既に表示されるが、検索0件に特化したメッセージはない。

### Testing
- `src/TopPage.test.jsx` に曜日タブ/一覧/ソート/エラー/空状態のテストがある。
- 検索に関するテストは存在しない。

## Requirement-to-Asset Map (with gaps)
### Requirement 1: 検索入力と実行
- Existing: なし
- Gap:
  - Missing: 検索入力UI（入力保持/実行トリガ）
  - Missing: 検索クエリ状態（保持/クリア/未適用判定）
  - Unknown: 実行トリガ（Enter/ボタン/リアルタイム）の定義

### Requirement 2: タイトル一致判定
- Existing: `selectedList` / `recentListItems` が `title` を保持
- Gap:
  - Missing: タイトル一致ロジック（文字列一致の仕様）
  - Unknown: 一致条件（部分一致/完全一致/大文字小文字/全角半角/空白の扱い）
  - Constraint: 一覧データは現在「過去1週間/過去100件」に限定される

### Requirement 3: 結果表示と状態の明示
- Existing: 一覧の空/エラー/ローディング表示
- Gap:
  - Missing: 検索適用中の状態表示（検索結果一覧/検索中ラベル）
  - Missing: 検索0件時の専用メッセージ
  - Unknown: 検索対象の一覧範囲（曜日別のみ/過去100件のみ/両方）

## Implementation Approach Options
### Option A: Extend Existing Components
- `src/TopPage.jsx` に検索入力・検索状態・フィルタ処理を直接追加し、`selectedList` / `recentListItems` の派生に検索を組み込む。
- Pros: 既存の状態管理とUI構造に最小変更で実装できる。
- Cons: トップページの責務が肥大化しやすく、テスト範囲が増える。

### Option B: Create New Components
- 例: `TopPageSearchBar.jsx` や `useTitleSearch` フックを新設し、検索状態/一致ロジックを分離。
- Pros: 検索ロジックの再利用・テストが容易、TopPageの見通しが改善。
- Cons: 新規ファイルが増え、インタフェース設計が必要。

### Option C: Hybrid Approach
- まず TopPage に最小限の検索状態を追加し、タイトル一致ロジックのみ独立ユーティリティへ分離。
- Pros: 影響範囲を抑えつつ拡張性を確保できる。
- Cons: 短期的に責務境界が曖昧になりやすい。

## Effort & Risk
- Effort: S (1–3 days)
  - 既存一覧へのクライアント側フィルタとUI追加が中心で、外部連携は不要。
- Risk: Low
  - 既存コンポーネントの拡張で完結する可能性が高いが、検索仕様の不明点が残る。

## Research Needed
- 検索対象の範囲（曜日別一覧/過去100件/両方）と表示優先度。
- 一致条件の定義（部分一致/完全一致/大小区別/全角半角/空白除去）。
- 検索実行の操作仕様（Enter/ボタン/リアルタイム）と未適用状態のUI表現。
- 検索結果が「100件制限」の前後どちらで適用されるべきか。

## Design Phase Recommendations
- まず検索仕様（対象範囲・一致条件・実行方法）を決め、UI配置と表示文言を設計で固定する。
- TopPageの既存状態（sortOrder/weekday選択）との優先関係を明示し、検索適用時の空/エラー表示を整理する。
- テスト追加の観点で、検索適用/解除/0件/空クエリのケースを設計段階で洗い出す。
