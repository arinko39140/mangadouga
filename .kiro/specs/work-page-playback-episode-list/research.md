# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `work-page-playback-episode-list`
- **Discovery Scope**: Extension
- **Key Findings**:
  - 作品ページ向けのルートとUIは未実装だが、`TopPage`の状態分岐・データプロバイダ注入のパターンが再利用できる。
  - Supabaseの`movie`テーブルは`series_id`を持つため、話数（エピソード）として流用しつつ`series`を追加する設計が最短経路になる。
  - 認証・ユーザー文脈が未整備のため、推し/お気に入り操作は「ログイン導線の契約」を先に定義する必要がある。

## Research Log

### 作品ページの統合ポイント
- **Context**: 既存ルーティングとUI構成に統合するための拡張点確認。
- **Sources Consulted**: `src/AppRouter.jsx`, `src/TopPage.jsx`, `src/TopPage.test.jsx`
- **Findings**:
  - `/series/:seriesId/` のルートが未追加。
  - `TopPage`は`dataProvider`を注入可能で、状態分岐（loading/error/empty）とアクセシビリティを備える。
- **Implications**: 作品ページも同一の状態分岐・DIパターンで設計し、テスト容易性を確保する。

### データ取得とスキーマ現状
- **Context**: 作品/話数データの取得方式を既存のSupabase設計に合わせる必要がある。
- **Sources Consulted**: `src/weekdayDataProvider.js`, `supabase/migrations/20260113150000_create_movie.sql`
- **Findings**:
  - `movie`テーブルは`movie_id`, `movie_title`, `url`, `favorite_count`, `update`, `series_id`, `weekday`を保持。
  - 作品情報（タイトル）や推し/お気に入りのユーザー別状態は存在しない。
- **Implications**: `movie`をエピソードとして扱い、`series`テーブル追加とユーザー状態テーブルの新設が必要。

### UI仕様の前提
- **Context**: 画面仕様と要件の整合を把握する。
- **Sources Consulted**: `screen-spec.md`, `.kiro/specs/work-page-playback-episode-list/requirements.md`
- **Findings**:
  - 作品ページは動画再生、話数一覧、推しバッジ、ソートを含む構成。
  - 最新話は公開日で判定する前提が要件に含まれる。
- **Implications**: 公開日ソートと「最新話の初期選択」を仕様化する必要がある。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
| --- | --- | --- | --- | --- |
| 既存パターン拡張 | `TopPage`と同様にUI + データプロバイダで構成 | 既存設計に整合、実装コスト低 | 作品/話数ドメインが曖昧になりやすい | ルート追加と新規UIが主作業 |
| 新規ドメイン分離 | 作品/話数専用のデータ層とUIを構築 | 境界明確、拡張性高い | 初期設計とスキーマの負荷 | 中長期の拡張に適合 |
| ハイブリッド | UIは新規、データは既存`movie`を流用 | 早期にUI検証が可能 | 将来的に移行が必要 | 今回の設計方針として採用 |

## Design Decisions

### Decision: 作品ページはハイブリッド構成
- **Context**: 既存のSupabaseスキーマが最小限で、UI検証を優先したい。
- **Alternatives Considered**:
  1. 既存パターン拡張
  2. 新規ドメイン分離
- **Selected Approach**: UIは新規で作成し、データ取得は`movie`テーブルをエピソードとして利用する。
- **Rationale**: ルーティングとUI追加を最短で進め、スキーマの再設計を段階的に進められる。
- **Trade-offs**: 長期的には`movie`と`episode`の命名差異が負債になり得る。
- **Follow-up**: `series`テーブル追加とデータ移行方針の検討。

### Decision: 推し/お気に入りはログイン必須の契約を先行定義
- **Context**: 認証基盤がまだ整備されていない。
- **Alternatives Considered**:
  1. ログイン無しでローカル保存
  2. ログイン導線の契約を設計し将来接続
- **Selected Approach**: UIはログイン誘導前提とし、操作時に認証ガードの契約を呼び出す。
- **Rationale**: 要件に沿った挙動を保ちつつ、認証の実装待ちが可能。
- **Trade-offs**: 実際の認証実装が遅れると機能が限定的になる。
- **Follow-up**: 認証方式と`/login/`への遷移実装を設計フェーズで決定。

## Risks & Mitigations
- 認証未実装で推し/お気に入り操作が未完結 — UIは導線のみ提供し、API契約を後続実装へ引き継ぐ。
- `movie`テーブル流用によるドメインの曖昧化 — `series`追加と将来的な`episode`への移行計画を設計に明記する。
- 公開日未設定データの扱い — `published_at`未設定表示の規約をUIで統一する。

## References
- `screen-spec.md` — 作品ページの画面構成前提
- `src/TopPage.jsx` — 既存UI/状態分岐の基準
- `supabase/migrations/20260113150000_create_movie.sql` — 既存データモデル
- `.kiro/steering/tech.md` — 技術スタック方針
