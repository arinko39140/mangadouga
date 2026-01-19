# Research & Design Decisions Template

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `oshi-list-favorites-registered-only`
- **Discovery Scope**: Extension
- **Key Findings**:
  - 既存のUIは`OshiListsPage`が`movie_oshi`を参照しており、要件にある「みんなの推しリスト一覧/お気に入り推しリスト」の分離が未実装。
  - SupabaseのRLSは`series_favorite`/`movie_oshi`で`auth.uid()`に基づくユーザー単位制御が可能だが、`series`は匿名に全面公開のため公開/非公開要件を満たさない。
  - お気に入り登録数は`series.favorite_count`を参照可能だが、更新契約が未定義のためトリガー/集計ビューの整備が必要。

## Research Log

### 既存アーキテクチャと拡張点
- **Context**: 推しリストの公開/お気に入り状態の表示と登録動線を既存画面へ統合する必要がある。
- **Sources Consulted**: `src/OshiListsPage.jsx`, `src/workPageDataProvider.js`, `src/WorkPage.jsx`, `src/authGate.js`
- **Findings**:
  - 認証は`AuthGate`で`supabase.auth.getSession()`を用いたガード。
  - `OshiListsPage`は`movie_oshi`のみを取得し、未ログイン時はログイン画面へ遷移する挙動。
  - 作品ページ(`WorkPage`)は`series_favorite`と`movie_oshi`のトグルが分離されている。
- **Implications**: 「みんなの推しリスト一覧」と「お気に入り推しリスト」を分離し、一覧側は未ログインでも閲覧可能にする設計が必要。

### データモデルとRLSの適合性
- **Context**: 公開/非公開UIとユーザー単位のお気に入りを安全に扱う必要がある。
- **Sources Consulted**: `supabase/migrations/20260115120000_create_series.sql`, `supabase/migrations/20260115125000_create_series_favorite.sql`, `supabase/migrations/20260115130000_rename_episode_oshi_to_movie_oshi.sql`
- **Findings**:
  - `series_favorite`/`movie_oshi`はユーザー単位のRLSが設定済み。
  - `series`は匿名に全件公開のため非公開制御に未対応。
  - `series.favorite_count`は存在するが更新プロセスが明確でない。
- **Implications**: `series`に`owner_user_id`と`visibility`を追加し、公開/非公開に基づくRLSを設計する必要がある。`favorite_count`はトリガーまたは集計ビューで整合性を担保する必要がある。

### 依存関係と技術確認
- **Context**: 新規依存の追加可否と互換性確認。
- **Sources Consulted**: `package.json`
- **Findings**:
  - `@supabase/supabase-js`と`react-router-dom`が既存の主要依存であり、新規ライブラリの追加は不要。
- **Implications**: 既存スタック内でデータ取得と状態管理を行う方針が妥当。

### 外部調査の制約
- **Context**: 指示によりWebSearch/WebFetchで公式ドキュメント調査が求められている。
- **Sources Consulted**: なし（実行不可）
- **Findings**:
  - 現環境では外部ネットワークへのWebSearch/WebFetchが利用できない。
- **Implications**: Supabaseの最新仕様確認は実装段階で改めて実施する必要がある。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存UI + DataProvider分離 | 画面ごとにDataProviderを持ちSupabaseへ直結 | 既存構造との整合、責務分離が明確 | 境界が増えすぎると重複実装 | 現行実装に合わせて拡張 |
| 単一DataProvider統合 | お気に入り/公開制御を一つに集約 | 実装点の集中 | 画面固有の最適化がしづらい | 要件分離に不向き |

## Design Decisions

### Decision: 公開/非公開制御のデータモデル追加
- **Context**: 5.x の公開/非公開要件を満たすためにデータ保持が必要。
- **Alternatives Considered**:
  1. `series`に`visibility`と`owner_user_id`を追加
  2. 別テーブルで公開設定を管理
- **Selected Approach**: `series`に`owner_user_id`と`visibility`を追加しRLSを調整する。
- **Rationale**: 参照対象が`series`でありUIと連携しやすい。
- **Trade-offs**: 既存データへの移行方針が必要。
- **Follow-up**: 既存サンプルデータへのデフォルト値設定を検討。

### Decision: みんなの推しリスト一覧の表示用ビュー
- **Context**: 4.x と 6.x の表示要件を満たしつつ個人情報を露出しない必要がある。
- **Alternatives Considered**:
  1. `series`に直接`is_favorited`を計算しない
  2. `series`と`series_favorite`のセキュアなビューを用意する
- **Selected Approach**: `series_with_favorite_state`ビューで`auth.uid()`に基づく`is_favorited`を返す。
- **Rationale**: 匿名利用時でも一覧取得が可能で、ログイン時は状態が付加される。
- **Trade-offs**: ビューのRLS/権限設計を明確化する必要。
- **Follow-up**: Supabaseのセキュアビューに関する最新ドキュメント確認。

### Decision: お気に入り登録数の整合性
- **Context**: 4.5, 6.4, 6.5 の登録数表示を最新に保つ必要。
- **Alternatives Considered**:
  1. `series_favorite`の集計を都度クエリ
  2. `series.favorite_count`をトリガーで更新
- **Selected Approach**: トリガー更新を基本とし、一覧は`favorite_count`を参照。
- **Rationale**: 一覧の並び替えや表示のレスポンスが安定する。
- **Trade-offs**: トリガー未設定時は整合が崩れる。
- **Follow-up**: 実装フェーズで移行SQLとテストを追加。

## Risks & Mitigations
- 未ログイン閲覧時の`series_favorite`参照がRLSで失敗する可能性 — ビューで`auth.uid()`に依存し、匿名は`false`扱いにする。
- 既存`series`の匿名公開ポリシーが要件に反する — `visibility`条件を追加し、移行時に既存データを公開扱いに設定する。
- `favorite_count`の更新が二重計上される — DBトリガー側で重複排除とトランザクション整合性を確保する。

## References
- `src/OshiListsPage.jsx` — 既存一覧のUI構造
- `src/workPageDataProvider.js` — お気に入りトグルの既存契約
- `supabase/migrations/20260115120000_create_series.sql` — `series`テーブル定義
- `supabase/migrations/20260115125000_create_series_favorite.sql` — `series_favorite`のRLS
- `supabase/migrations/20260115130000_rename_episode_oshi_to_movie_oshi.sql` — `movie_oshi`のRLS
