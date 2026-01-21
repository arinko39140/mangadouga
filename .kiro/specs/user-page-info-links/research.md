# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: user-page-info-links
- **Discovery Scope**: Extension
- **Key Findings**:
  - `target="_blank"`で開く外部リンクは`rel="noopener noreferrer"`を付与し、`window.opener`経由のリスクを回避する必要がある。
  - `URL` APIでURLの構文検証と`http/https`判定が可能であり、無効なリンクは表示前に除外できる。
  - Supabase JSのフィルタ・並び替えは`select()`後にチェーンし、取得対象テーブルとRLSに合わせた呼び出し順が必要。

## Research Log

### 外部リンクの安全な新規タブ表示
- **Context**: 外部リンクを新規タブで開く要件がある。
- **Sources Consulted**: MDN `target="_blank"`、Chrome Developers `rel="noopener"`
- **Findings**:
  - `target="_blank"`は`window.opener`を利用した攻撃の経路になりうるため、`rel="noopener noreferrer"`の付与が推奨される。
  - `noreferrer`は参照元情報も抑制するため、`noopener`と併用する運用が一般的。
- **Implications**: 外部リンクUIは`target="_blank"`と`rel="noopener noreferrer"`を必須属性とする。

### 外部リンクURLの検証
- **Context**: 無効なURLは表示しない要件がある。
- **Sources Consulted**: MDN URL API
- **Findings**:
  - `new URL(value)`で構文検証ができ、`url.protocol`で`http:`/`https:`のみ許可できる。
- **Implications**: UI表示前に`URL` APIで検証し、無効なリンクは一覧から除外する。

### Supabase JSのクエリチェーン
- **Context**: 既存のSupabaseクライアントパターンに合わせた取得が必要。
- **Sources Consulted**: Supabase JS `select` とフィルタのドキュメント
- **Findings**:
  - `from(...).select(...).eq(...).order(...)`のように`select`の後でフィルタ・並び替えを行う。
- **Implications**: DataProviderは既存パターンに合わせて`select`後に条件を適用する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| UI + DataProvider分離 | UIは表示と状態管理、DataProviderはSupabaseアクセスを担当 | 既存パターンと整合、テスト容易 | Provider追加が増える | 既存のOshiList系と整合 |
| UI直結アクセス | UIから直接Supabaseを呼ぶ | 実装が最短 | 境界が曖昧、再利用困難 | Steeringに非準拠 |

## Design Decisions

### Decision: ユーザーページ専用DataProviderの追加
- **Context**: `/users/:userId/` と `/users/:userId/oshi-series/` の双方で共通のユーザー情報とリンクを扱う。
- **Alternatives Considered**:
  1. 既存Providerの流用 — `oshiListCatalogProvider`や`oshiListPageProvider`を流用
  2. 専用Providerを新設 — ユーザー情報・外部リンク・推し作品を統合
- **Selected Approach**: 専用の`UserPageProvider`と補助Providerを定義し、取得契約を明確化する。
- **Rationale**: 既存Providerは`listId`中心であり`userId`中心の要件に不適合。
- **Trade-offs**: 新規ファイル追加が増えるが責務分離が明確になる。
- **Follow-up**: 実装時は既存のerror正規化ユーティリティの流用可否を確認する。

### Decision: 外部リンクはUIでURL検証してから表示
- **Context**: 無効URLを非表示にする要件。
- **Alternatives Considered**:
  1. DB保存時に検証 — 登録時にバリデーション
  2. 表示時に検証 — UI側でURL検証
- **Selected Approach**: 表示時に`URL` APIで検証し、無効なリンクは除外。
- **Rationale**: 現状は表示機能が主であり、保存ロジックが未確定。
- **Trade-offs**: 表示時に判定するため、保存時の不正URLは残る。
- **Follow-up**: 画像アップロード機能と合わせて保存時検証も検討。

## Risks & Mitigations
- RLSにより非公開リストが取得できず区別できない — 公開状態判定の専用ビュー/ポリシー追加を設計に含める
- `users`テーブルのリンク情報が不足する — 表示名カラム追加または`user_links`テーブル導入を検討
- 認証必須ページで`series`テーブルが読めない — `authenticated`向けのRLSポリシーを追加

## References
- https://developer.mozilla.org/en-US/docs/Web/HTML/Element/a#target
- https://web.dev/external-anchors-use-rel-noopener/
- https://developer.mozilla.org/en-US/docs/Web/API/URL
- https://supabase.com/docs/reference/javascript/select
- https://supabase.com/docs/reference/javascript/using-filters
