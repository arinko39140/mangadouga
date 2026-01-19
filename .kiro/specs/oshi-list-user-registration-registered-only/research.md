# リサーチと設計判断ログ

---
**目的**: 発見事項、設計に影響する調査、意思決定の根拠を記録する。
---

## Summary
- **Feature**: oshi-list-user-registration-registered-only
- **Discovery Scope**: Extension
- **Key Findings**:
  - 推し登録は`movie_oshi`でユーザー単位に保持され、RLSで`auth.uid()`に制限されている。
  - 推し一覧は`movie_oshi`を起点に`movie`を参照することで、登録済みのみをユーザー単位で取得できる。
  - 既存の`AuthGate`と`LoginPage`のリダイレクト構成により、未認証時の誘導を統一できる。

## Research Log
### 既存データモデルとRLS
- **Context**: 推し登録のユーザー紐づけと一覧取得の根拠確認が必要。
- **Sources Consulted**: `supabase/migrations/20260115125500_create_episode_oshi.sql`, `supabase/migrations/20260115130000_rename_episode_oshi_to_movie_oshi.sql`, `supabase/migrations/20260115123000_update_read_policies.sql`
- **Findings**:
  - `movie_oshi`は`user_id` + `movie_id`の複合主キーで重複登録を防止。
  - `user_id`は`auth.uid()`がデフォルトで入り、RLSで本人のみ読取/挿入/削除を許可。
  - `movie`は`anon`/`authenticated`に公開され、参照は結合で可能。
- **Implications**: 推し一覧は`movie_oshi`を起点に`movie`を結合する構成が最短で要件適合。

### 既存フロント構成の拡張ポイント
- **Context**: ページ実装の責務分割とパターン踏襲を確認。
- **Sources Consulted**: `src/WorkPage.jsx`, `src/workPageDataProvider.js`, `src/AuthGate.js`, `src/OshiListsPage.jsx`
- **Findings**:
  - データ取得は`create*DataProvider`で抽象化、UIはページ単位で状態管理。
  - 認証判定は`AuthGate`で統一され、未認証時に`/login/`へ遷移。
  - 推し一覧ページはプレースホルダーで拡張余地が大きい。
- **Implications**: 新規`OshiListDataProvider`と`OshiListsPage`拡張で統一パターンを維持できる。

### 外部依存と最新情報
- **Context**: 外部依存や新規ライブラリ導入の有無を確認。
- **Sources Consulted**: `package.json`
- **Findings**:
  - 新規依存は不要。既存の`@supabase/supabase-js`とReact構成で対応可能。
  - 実行環境制約によりWebSearch/WebFetchは未実施。
- **Implications**: 技術選定は既存スタック維持とし、追加調査が必要な場合は実装前に補完する。

## Architecture Pattern Evaluation
| Option | Description | Strengths | Risks / Limitations | Notes |
| --- | --- | --- | --- | --- |
| クライアント直結BaaS | ReactからSupabaseを直接呼び出す | 既存構成と一貫、実装量が最小 | クエリ設計の誤りがUI直結 | 既存のデータプロバイダと合致 |
| 独自API層追加 | APIサーバを挟む | 集中管理・将来拡張性 | 現状スコープ超過 | 本機能では非採用 |

## Design Decisions
### Decision: 推し一覧は`movie_oshi`起点で取得
- **Context**: 登録済み推しのみ表示（2.1, 2.2, 2.5）を満たす必要がある。
- **Alternatives Considered**:
  1. `movie`起点で`movie_oshi`を左結合しフィルタ
  2. `movie_oshi`起点で`movie`を参照
- **Selected Approach**: `movie_oshi`を基点に`movie`を結合し、登録済みのみ取得する。
- **Rationale**: RLSと複合主キーによりユーザー単位の絞り込みが自然に担保される。
- **Trade-offs**: `movie`詳細の取得は結合に依存するため、クエリ設計の検証が必要。
- **Follow-up**: 実装時に取得フィールドと結合方法の検証を行う。

### Decision: 未認証時はAuthGateで一律リダイレクト
- **Context**: 未認証時に登録/一覧を拒否しログイン誘導（1.2, 2.3）。
- **Alternatives Considered**:
  1. ページ毎に`supabase.auth.getSession`で判定
  2. 既存`AuthGate`で共通化
- **Selected Approach**: `AuthGate`を利用し、未認証時は`/login/`へ誘導。
- **Rationale**: 既存のWorkPageと同じ認証フローを維持できる。
- **Trade-offs**: `AuthGate`のコンテキスト引数の拡張が必要になる可能性。
- **Follow-up**: 推し一覧のリダイレクト先を設計時に固定する。

### Decision: 推しボタンの初期状態は取得データに基づく
- **Context**: 登録済み状態の反映（3.1, 3.3）。
- **Alternatives Considered**:
  1. 画面初期描画時に常に未登録表示
  2. `movie_oshi`連動で`isOshi`を初期化
- **Selected Approach**: 認証済みの場合は`movie_oshi`結合で`isOshi`を算出。
- **Rationale**: 登録状態とUIの整合性を維持できる。
- **Trade-offs**: 未認証時は常に未登録表示となる。
- **Follow-up**: 実装時に未認証時の挙動をUI文言で補足する。

## Risks & Mitigations
- 未認証で一覧取得が試行される — `AuthGate`で早期判定しリダイレクト。
- 取得クエリの結合ミスで一覧が空になる — 事前に結合クエリのテストを追加。
- 登録直後の一覧反映が遅延する — 登録成功後に一覧再取得またはローカル更新。

## References
- `supabase/migrations/20260115125500_create_episode_oshi.sql` — 推し登録テーブルとRLS（リネーム前）
- `supabase/migrations/20260115130000_rename_episode_oshi_to_movie_oshi.sql` — テーブル名の統一
- `src/workPageDataProvider.js` — 既存のデータプロバイダパターン
- `src/AuthGate.js` — 認証ゲートの共通化
