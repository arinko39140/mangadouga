# Gap Analysis: Work Page Playback + Episode List

## Summary
- **Feature**: `work-page-playback-episode-list`
- **Scope**: 作品ページ（動画再生・話数一覧・ソート・推し/お気に入り）
- **Key Findings**:
  - 作品ページ専用のルート/コンポーネント/データ取得層が未実装。
  - Supabaseの`movie`テーブルは存在するが、シリーズ/推し/お気に入りのデータモデルが不足。
  - 既存UIは`TopPage`のBEM風クラスとデータプロバイダ抽象化が指針となる。
  - 最新話は「投稿された時間が最も新しい動画」で判定する方針を採用する。
  - 登録状態の保存先は「推しリスト」とする方針を採用する。

## Current State Investigation
- **Routing**: `src/AppRouter.jsx` に `/` と `/oshi-lists/` のみ。
- **UI**: `src/TopPage.jsx` と `src/OshiListsPage.jsx` が存在、作品ページは未実装。
- **Data Access**: `src/supabaseClient.js` + `src/weekdayDataProvider.js` の抽象化パターン。
- **Schema**: `supabase/migrations/20260113150000_create_movie.sql` に `movie` テーブルのみ。`series` や `list_movie` 相当は未定義。
- **Specs/Routes**: `screen-spec.md` に `/series/{seriesId}/` が定義。

## Requirement-to-Asset Map (Gaps)
| Requirement Area | Existing Assets | Gap Tag | Notes |
| --- | --- | --- | --- |
| 動画再生領域 | なし | Missing | `movie.url` を再生領域に表示するUIが必要。 |
| 初期表示=最新話 | `movie.update` カラム | Constraint | 最新話は投稿時間（`update`）が最も新しい動画。 |
| 話数一覧表示 | なし | Missing | `TopPage`のリストUIを参考に新規実装が必要。 |
| 話数ソート（最新/古い） | なし | Missing | クライアントソート or クエリソートの設計が必要。 |
| 作品タイトル表示 | `series.csv` | Missing | DBに `series` テーブルがなく取得経路未確定。 |
| 作品お気に入り（スター） | なし | Missing | データ保存先・ユーザー識別が未定義。 |
| 話数数表示（全N話） | なし | Missing | 話数データ件数の算出が必要。 |
| 推し登録（推/済） | `list_movie.csv` | Constraint | 登録状態の保存先は推しリスト。 |

## Data Model Additions (Requested)
以下は要件を満たすために追加が必要なデータ領域。
- **series**: 作品（シリーズ）情報（例: `series_id`, `title`, `favorite_count`）
- **favorites (series)**: 作品お気に入り（スター）用の関連（例: `user_id`, `series_id`）
- **oshi list linkage**: 推しリスト登録状態（例: `list_id`, `movie_id`）は既存`list_movie`相当を前提に拡張
※具体的なスキーマ定義は設計フェーズで決定する。

## Implementation Approach Options

### Option A: Extend Existing Components
- **Approach**: `TopPage`のUI/データ取得パターンを拡張し、`WorkPage`を同様の構成で追加。
- **Pros**: 既存のデータプロバイダ抽象化を流用できる。
- **Cons**: データモデル不足の影響を強く受ける。

### Option B: Create New Components
- **Approach**: `WorkPage.jsx` + `workPageDataProvider.js` を新規で設計し、UIと取得ロジックを分離。
- **Pros**: 作品ページに必要な責務を明確化でき、テストしやすい。
- **Cons**: 新規構成の設計コストが増える。

### Option C: Hybrid
- **Approach**: UIは新規、データ取得は `weekdayDataProvider` のパターンを踏襲し抽象化のみ流用。
- **Pros**: 既存の接続方針を守りつつ責務分割が可能。
- **Cons**: 中途半端に見えるリスクがあるため命名/配置を明確化する必要。

## Effort & Risk
- **Effort**: M（3–7日）
  - UI追加とルーティング増設に加え、データモデル検討が必要。
- **Risk**: Medium
  - 作品/話数/推し/お気に入りの保存先が未定義で、要件確認が必要。

## Research Needed (Design Phase)
- 作品（series）と話数（movie）の関係・取得方法の確定。
- 推しリストの識別方法（ユーザーごとのリストIDや作成ルール）。
- 作品ページのURLパラメータ（`/series/{seriesId}/`）に対するデータ取得方針。

## Recommendations for Design Phase
- **Preferred Approach**: Option C（UIは新規、取得層は既存パターン踏襲）。
- **Key Decisions**:
  - `series`/`list_movie`/お気に入りのデータモデルをSupabaseに追加するか。
  - 未ログイン時の登録操作をどう扱うか。
- **Follow-ups**:
  - 取得失敗時の空状態/エラーメッセージ（`TopPage`の扱いに準拠）。
