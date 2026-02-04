# Gap Analysis: viewing-history-page

## Analysis Summary
- `history` テーブルは存在するが、閲覧履歴の取得・表示・記録のUI/データ層が未実装。
- `/history/` ルートとページコンポーネントが未整備で、要件の一覧・空状態・遷移が実現できない。
- 履歴記録のタイミング（作品ページ遷移/話数切替）を満たすためのフックとデータ保存手段が不足。
- `history` テーブルは公開読み取りのみで、ユーザー単位のRLS/書き込みポリシーが欠落。
- 直近30件・重複抑止（直近同一動画の再記録禁止）を実現するデータ取得/保存ロジックが不足。

## Current State Investigation
### Routing / Pages
- `src/AppRouter.jsx` に `/history/` ルートが存在しない。
- 履歴ページ用のコンポーネント・CSS・テストが存在しない。

### Work Page / Episode Selection
- `src/WorkPage.jsx` は `selectedMovieId` を状態管理し、`EpisodeListItem` クリックで話数を切り替える。
- `src/EpisodeListItem.jsx` のクリックは `onSelect(episode.id)` のみで、閲覧履歴の記録は行っていない。
- 作品ページ遷移用のリンクは `TopPage.jsx` 等で `/series/:seriesId/` を生成するが、`selectedMovieId` を明示していない。

### Data Providers / Auth
- `src/workPageDataProvider.js` は `movie`/`series`/`list_movie` を操作するが、履歴取得や記録処理はない。
- 認証判定は `src/authGate.js` と `src/supabaseSession.js` に実装済み。

### Supabase Schema / Policies
- `supabase/migrations/20260201090000_create_user_list_series_history.sql` に `history` テーブルあり。
  - `history_id bigint primary key` だが `default` やシーケンスがない。
  - RLSは有効だが `select` のみで `insert`/`delete`/`update` ポリシーなし。
  - `select` は `anon, authenticated` に対し `using (true)` で公開読み取り。
- `history.csv` / `supabase/seed.sql` に最小サンプルあり。

## Requirement-to-Asset Map (with gaps)
### Requirement 1: 閲覧履歴の一覧表示
- Existing:
  - `history` テーブル（`user_id`, `movie_id`, `clicked_at`）は存在。
- Gap:
  - Missing: `/history/` ルート、履歴ページUI、取得用データプロバイダ。
  - Missing: `movie` と結合してタイトル/サムネ/シリーズIDを取得するクエリ。
  - Missing: `clicked_at` 降順・直近30件取得の実装。
  - Constraint: 現在は履歴が公開読み取りで、ユーザー単位の閲覧制限がない。

### Requirement 2: 空状態の表示
- Existing:
  - 他ページで空状態メッセージ表示のパターンあり（`TopPage.jsx`, `OshiFavoritesPage.jsx` など）。
- Gap:
  - Missing: 履歴ページの空状態UIと文言。

### Requirement 3: 履歴項目からの遷移
- Existing:
  - `react-router-dom` で `Link` による遷移パターンあり。
- Gap:
  - Missing: 履歴項目 -> `/series/:seriesId/?selectedMovieId=...` へのリンク生成。
  - Unknown: `series_id` を履歴取得でどう取得するか（`history` には `movie_id` のみ）。

### Requirement 4: 閲覧の記録タイミング
- Existing:
  - `WorkPage.jsx` で `selectedMovieId` を更新する流れはある。
- Gap:
  - Missing: 作品ページ遷移時・話数切替時の履歴記録ロジック。
  - Missing: 未ログイン時は記録しない判定（`authGate`/`supabaseSession` の接続）。
  - Missing: 「直近の履歴と同一なら新規作成しない」判定。
  - Unknown: 「動画クリックで作品ページへ遷移しない」ケースの判定基準（どのUIが対象か）。

## Implementation Approach Options
### Option A: Extend Existing Components
- 既存の `WorkPage.jsx` と `EpisodeListItem.jsx` に履歴記録処理を直接追加し、`AppRouter.jsx` に `/history/` を追加して新規ページを作成。
- Pros: 既存の状態管理/認証フローに直接接続でき、改修箇所が少ない。
- Cons: `WorkPage` がさらに肥大化し、履歴ロジックがページ内に散在しやすい。

### Option B: Create New Components/Providers
- 履歴専用の `historyDataProvider.js` と `ViewingHistoryPage.jsx` を新設し、`WorkPage` 側は `recordHistory` などの薄い呼び出しに留める。
- Pros: 履歴の責務が独立し、テスト/再利用が容易。
- Cons: 新規ファイルが増え、導入設計が必要。

### Option C: Hybrid Approach
- 履歴取得は専用プロバイダ・新規ページで実装し、記録は `WorkPage` 内に最小限のフックを追加。
- Pros: 既存のUI/状態を活かしつつ責務分離できる。
- Cons: 記録タイミングの設計が曖昧だと分散しやすい。

## Effort & Risk
- Effort: M (3-7 days)
  - 新規ページ追加、Supabaseポリシー/クエリ設計、記録タイミング実装が必要。
- Risk: Medium
  - RLS/履歴ID生成/重複抑止の設計次第で挙動が大きく変わるため。

## Research Needed
- `history` のRLS方針（ユーザー本人のみ閲覧・挿入可にするか）。
- `history_id` の採番方式（シーケンス/UUID/サーバー側生成）。
- 「動画クリックで作品ページへ遷移」対象UIの定義（TopPage/検索結果/リストページ等）。
- 履歴記録時の重複抑止ロジック（直近1件比較 vs DB制約/トリガ）。
- 履歴一覧で必要な表示項目（推しバッジ、推し数の要否）とデータ取得元。

## Design Phase Recommendations
- `/history/` ルートと履歴ページUIの骨組みを先に定義し、表示要素と必要データを明確化する。
- `history` のRLSとID生成を設計で確定し、記録APIの責務（クライアント/DB）を整理する。
- `selectedMovieId` を含む遷移パスの標準化（リンク生成・WorkPage初期選択・記録タイミング）。
