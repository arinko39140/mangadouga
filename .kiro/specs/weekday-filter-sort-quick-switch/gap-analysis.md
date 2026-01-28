# Gap Analysis: weekday-filter-sort-quick-switch

## Analysis Summary
- トップページには曜日タブと当日デフォルトが既にあり、フィルタ基盤は実装済みだが、解除（すべて）とソートUIが不足している。
- みんなの推しリスト一覧と作品ページはソートUIがあるが、要件の「投稿日/人気」と一致していない。
- 作品ページの人気順は推しリスト登録数ベースのため、movie側の人気カウント取得が不足している。

## Current State Investigation
### Top Page (weekday filter)
- `src/TopPage.jsx` に曜日ナビゲーション（タブ/ボタン）とJST基準の当日デフォルトがある。
- `src/weekdayDataProvider.js` はmovieを `favorite_count` 降順で取得し、過去1週間のupdateのみを対象にしている。
- フィルタ解除（すべて）操作やソートUIは未実装。

### Oshi Lists Catalog (みんなの推しリスト一覧)
- `src/OshiListsPage.jsx` にお気に入り数の昇降順トグルがある（favorite_desc/asc）。
- `src/oshiListCatalogProvider.js` は `list.favorite_count` で並び替えのみ。
- 要件上、投稿日ソートは不要。

### Work Page (作品ページ)
- `src/WorkPage.jsx` に `SortControl` があり、`latest/oldest` の並び替えを提供。
- `src/workPageDataProvider.js` は `movie.update` で並び替え（投稿日相当）を実施。
- `favorite_count` を取得しておらず、人気順ソートは未対応。

## Requirement-to-Asset Map (with gaps)
### Requirement 1: 曜日別フィルタのクイック切替
- Existing: `src/TopPage.jsx` の曜日タブ、選択状態、当日デフォルト。
- Gap:
  - Missing: 「すべて/解除」操作（全件表示に戻す）
  - Constraint: 取得対象は過去1週間に限定（要件に未記載）

### Requirement 2: ソート機能（投稿日/人気）
- Top Page:
  - Existing: `weekdayDataProvider` が人気順（favorite_count）で取得
  - Missing: 「投稿日」ソートとソートUI
- Oshi Lists Page:
  - Existing: 人気順トグル（favorite_desc/asc）
  - Missing: 要件に沿う文言/基準名の統一
- Work Page:
  - Existing: 投稿日順（latest/oldest）
  - Missing: 人気順ソート、人気用データ取得（推しリスト登録数）

### Requirement 3: 対象ページへの適用範囲
- Existing: トップページの曜日UI、みんなの推しリスト一覧と作品ページのソートUI
- Gap:
  - Missing: ソートの基準名と意味の統一（UI文言と内部キーが不一致）

### Requirement 4: フィルタとソートの組み合わせ
- Existing: フィルタ（曜日）と人気順取得はあるが、ソート切替がない
- Gap:
  - Missing: フィルタ結果に対するソート切替のUIと状態管理

### Requirement 5: 空状態と表示整合性
- Existing: `TopPage.jsx` と `OshiListsPage.jsx` で空状態メッセージあり
- Unknown: 作品ページの空状態が要件どおりか（`EpisodeListPanel` 依存）

### Requirement 6: 既定値と初期表示
- Existing:
  - トップページ当日曜日デフォルト（JST）
  - みんなの推しリスト一覧の既定ソートが人気降順
- Gap:
  - Missing: 作品ページの既定ソートが人気になっていない
  - Missing: ソートUI初期選択の明示（人気が選択状態に見えること）

## Implementation Approach Options
### Option A: Extend Existing Components
- Extend `TopPage.jsx`, `OshiListsPage.jsx`, `WorkPage.jsx`, `SortControl.jsx` を直接拡張。
- Pros: 既存パターンに沿って最小変更で実装可能。
- Cons: SortControlがページ固有のスタイル/語彙に依存しており、汎用化に制約。

### Option B: Create New Components
- 新規に共通ソートUI（例: `SortControlPopularDate.jsx`）と共通ロジックを作成し各ページで利用。
- Pros: 要件に合わせた語彙・状態管理を統一できる。
- Cons: 既存のSortControlとの重複・置き換えコストが増える。

### Option C: Hybrid Approach
- 共通ソートUIを新設し、WorkPageのみ既存SortControlを段階的に置換。
- Pros: 影響範囲を小さく保ちつつ統一を進められる。
- Cons: 短期的にUIが二系統になりやすい。

## Effort & Risk
- Effort: M (3-7 days)
  - UI/状態/データ取得の改修が複数ページにまたがるため。
- Risk: Medium
  - 作品ページの人気順ソートに必要なデータ取得と整合確認が必要なため。

## Research Needed
- 「人気」の定義（movie.favorite_count / list.favorite_count で統一して良いか）。
- トップページの「すべて」解除時の表示内容（全曜日を混ぜるか、未選択にするか）。
- WorkPageの人気順ソートに必要なデータ取得項目（movie.favorite_count など）。

## Design Phase Recommendations
- 要件通りの語彙統一（「投稿日」「人気」）を前提にUI/状態/クエリの命名を整理する。
- 作品ページの人気定義（推しリスト登録数）に合わせて、取得データと並び替えの整合性を設計で詰める。
