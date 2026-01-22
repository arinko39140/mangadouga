# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: mypage-oshi-sections
- **Discovery Scope**: Extension
- **Key Findings**:
  - ユーザーマイページは`UserPage`を起点に`UserOshiListPanel`と`UserOshiSeriesPanel`で推し関連の概要を表示しており、推しリスト/推し作品は既存パネルの拡張で対応できる。
  - お気に入り推しリストは専用ページ`/oshi-lists/favorites/`が既に存在するが、マイページにサマリー表示するUIは未整備のため新規パネルが必要。
  - SupabaseのRLSは匿名アクセスを含む公開/非公開制御の基盤となるため、ユーザー本人と他者閲覧での表示条件をRLSとアプリ側の両方で整合させる設計が必須。

## Research Log

### 既存UIとルーティングの確認
- **Context**: マイページの既存セクション構成と導線を把握するため。
- **Sources Consulted**: `src/UserPage.jsx`, `src/UserOshiListPanel.jsx`, `src/UserOshiSeriesPanel.jsx`, `src/UserOshiSeriesPage.jsx`, `src/OshiFavoritesPage.jsx`, `src/AppRouter.jsx`
- **Findings**:
  - マイページはプロフィール/外部リンクに加え、推しリストと推し作品のサマリーを表示している。
  - 推し作品の専用ページは`/users/:userId/oshi-series/`に存在し、一覧は`UserOshiSeriesPanel`を再利用している。
  - お気に入り推しリストは`/oshi-lists/favorites/`に専用ページがある。
- **Implications**: マイページに「お気に入り推しリスト」サマリーを追加し、既存導線と整合するリンクを配置する。

### Supabase RLSと公開/非公開の整合
- **Context**: 他ユーザー閲覧時の非公開セクション非表示要件を満たすため。
- **Sources Consulted**: Supabase RLSドキュメント、APIセキュリティガイド
- **Findings**:
  - RLSはテーブルアクセス時に自動的に条件が追加されるため、表示制御の防御層になる。
  - 認証されていない場合は`auth.uid()`が`null`になり、明示的な認証条件が必要になる。
- **Implications**: `can_display`の判定はアプリ側のUI制御とRLSポリシーの双方で整合させる必要がある。

### リレーション取得とサマリー表示
- **Context**: 推し作品一覧が`user_series`と`series`の結合に依存するため。
- **Sources Consulted**: Supabase JavaScript `select()` ドキュメント（外部テーブル取得）
- **Findings**:
  - Supabaseの`select()`でリレーションを展開できるため、`user_series`から`series`の主要情報を取得できる。
- **Implications**: 推し作品の概要表示と一覧ページで同じデータ取得パターンを使い、サマリー用に件数制限・ソート条件を追加する。

### データモデル確認
- **Context**: `user_series`/`user_list`の公開フラグや作成時刻を使った並び替えに対応するため。
- **Sources Consulted**: `supabase/migrations/20260201090000_create_user_list_series_history.sql`, `supabase/migrations/20260115120000_create_series.sql`, `supabase/migrations/20260113150000_create_movie.sql`
- **Findings**:
  - `user_series`には`can_display`と`created_at`があり、公開制御と新着順の基準に利用可能。
  - `series`には`favorite_count`と`update`があり、一覧表示や並べ替えに利用できる。
  - `movie`に`thumbnail_url`があり、推し作品の代表サムネイルとして利用できる。
- **Implications**: サマリー表示は`created_at`降順・最大3件、一覧の並べ替えは`favorite_count`基準を設計に含める。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| UIに直接取得ロジックを集約 | `UserPage`内でSupabase呼び出しを直接実装 | 実装が短い | 既存のProvider分離パターンと不整合 | 既存構成と衝突するため不採用 |
| Provider分離を維持 | 既存Providerにサマリー/操作APIを追加し、UIは表示に集中 | 既存パターンと整合、テスト容易 | Providerの責務が増える | 現行構成に合致し採用 |

## Design Decisions

### Decision: 推しセクション専用の表示コンテナを導入
- **Context**: セクション順序と独立性の要件を明確化する必要がある。
- **Alternatives Considered**:
  1. `UserPage`内に直接3セクションを並べる
  2. `UserOshiSections`コンテナで順序と表示制御を集約
- **Selected Approach**: `UserOshiSections`を新設し、推しリスト/推し作品/お気に入り推しリストの順序と表示条件をここで統一する。
- **Rationale**: セクション順序の維持と公開/非公開の一貫制御を担保できる。
- **Trade-offs**: 新規コンポーネント増加。
- **Follow-up**: セクションの非表示条件がアクセシビリティに与える影響をテストで確認する。

### Decision: 推し作品サマリーは`created_at`降順で最大3件
- **Context**: 「新しく追加された順で最大3件程度」の要件に対応する必要がある。
- **Alternatives Considered**:
  1. 取得後にUIでソート/スライス
  2. Providerでクエリ時に順序/件数を制御
- **Selected Approach**: Providerで件数制御し、UIは受け取った順序を表示する。
- **Rationale**: データ取得量を抑制し、UIの責務を簡潔にする。
- **Trade-offs**: Providerに追加の引数/メソッドが必要。
- **Follow-up**: `created_at`のインデックス追加可否を検討する。

### Decision: 非公開セクションは他ユーザー閲覧時に非表示
- **Context**: 要件4で他ユーザー閲覧時の非表示が必須。
- **Alternatives Considered**:
  1. 非公開でもセクションを表示しメッセージで説明
  2. 他ユーザー閲覧時はセクション自体を描画しない
- **Selected Approach**: セクション非表示（コンテナでの条件分岐）。
- **Rationale**: 要件の「表示しない」に厳密に一致。
- **Trade-offs**: 何が非公開かの説明は減る。
- **Follow-up**: 代替の説明テキストが必要かUX検証。

## Risks & Mitigations
- 公開/非公開の表示条件がUIとRLSで不整合になる — RLSポリシーとUI条件を併記しテストで両方を検証する。
- 推し作品サムネイル取得がN+1になりやすい — 代表サムネイル取得はバッチクエリで集約し、上限件数を設ける。
- セクション非表示により情報量が減る — 非公開時の空状態との切り分けを明確にし、必要なら説明文を追加検討する。

## References
- Supabase RLS Guide — https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Securing your API — https://supabase.com/docs/guides/api/securing-your-api
- Supabase JavaScript `select()` (foreign tables) — https://supabase.com/docs/reference/javascript/v1/select
