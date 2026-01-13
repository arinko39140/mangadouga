# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `top-page-layout-weekday-list`
- **Discovery Scope**: Extension
- **Key Findings**:
  - 既存構成は`src/App.jsx`に単一ページが集約され、ルーティング基盤が存在しない。
  - スタイルはグローバルCSSで運用されており、ページ分割時の責務整理が必要。
  - Supabaseクライアントは用意済みだが、曜日別一覧のデータモデルは未定義。

## Research Log

### 既存UI構成と拡張点
- **Context**: 既存実装を無視して再構成する方針のため、最低限の制約だけ把握する。
- **Sources Consulted**: `src/App.jsx`, `src/App.css`, `src/index.css`
- **Findings**:
  - UIは単一コンポーネントで完結しており、共有コンポーネントは存在しない。
  - CSSはBEM風クラスをApp.cssに集約している。
- **Implications**: 新規トップページ構成はコンポーネント分割を前提に設計する必要がある。

### ナビゲーション導線の現状
- **Context**: 曜日ナビとリスト導線の要件に合わせて、導線実装の起点を決める。
- **Sources Consulted**: `src/` 内検索（`rg "router|route|Routes|Link" src`）
- **Findings**:
  - ルーティングやリンクコンポーネントは未導入。
- **Implications**: ルーティングは新規導入か、簡易リンクで暫定対応する設計判断が必要。

### データ取得とSupabase連携
- **Context**: 動的サイト方針と、曜日別一覧のデータ供給方法を検討する。
- **Sources Consulted**: `src/supabaseClient.js`, `package.json`
- **Findings**:
  - `@supabase/supabase-js` が依存に含まれ、環境変数ベースで初期化される。
- **Implications**: データ取得はSupabase前提で抽象化し、未設定時のフォールバックを考慮する必要がある。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| SinglePageMonolith | 既存Appに全機能を追加 | 追加ファイルが少ない | 肥大化し保守性が低い | 要件拡大に不向き |
| ComponentizedPage | トップページを分割しUI責務を整理 | 拡張性と可読性が高い | 追加設計が必要 | 今後の機能増加に適合 |
| RoutedPages | ルーティングでページ境界を確立 | 導線が明確、拡張しやすい | 追加依存と設定が必要 | 導線要件と相性良い |

## Design Decisions

### Decision: トップページを専用コンポーネントに分割
- **Context**: 既存Appの単一構成を前提にしない方針。
- **Alternatives Considered**:
  1. SinglePageMonolith
  2. ComponentizedPage
- **Selected Approach**: ComponentizedPage
- **Rationale**: レイアウト・ナビ・一覧表示の責務分離が必要。
- **Trade-offs**: 実装コストは上がるが、拡張性と再利用性を優先。
- **Follow-up**: ルーティング導入の要否を設計内で明確化する。

### Decision: 推しリストページは別ルートで提供する
- **Context**: トップページ導線から推しリストページへ遷移させる要件がある。
- **Alternatives Considered**:
  1. 同一ページ内の表示切替
  2. 別ルートへの遷移
- **Selected Approach**: 別ルートへの遷移
- **Rationale**: ページ境界を明確にし、導線要件と将来的な拡張に備える。
- **Trade-offs**: ルート切替の制御が必要になる。
- **Follow-up**: `screen-spec.md` に合わせて `/oshi-lists/` を採用する。

### Decision: 曜日選択はクライアント状態で管理
- **Context**: 曜日切替の即時性とUI反応性が重要。
- **Alternatives Considered**:
  1. クエリパラメータで管理
  2. ローカル状態で管理
- **Selected Approach**: ローカル状態で管理
- **Rationale**: 要件はトップページ内の切替で完結している。
- **Trade-offs**: URL共有性は低いが、UI実装は簡潔。
- **Follow-up**: リストページ導線と整合するURL設計を設計で検討する。

### Decision: データ供給は抽象化しSupabaseをデフォルトにする
- **Context**: Supabase方針に合わせつつ、未設定時の動作を確保する。
- **Alternatives Considered**:
  1. Supabase直結
  2. データソース抽象化
- **Selected Approach**: データソース抽象化
- **Rationale**: 環境変数未設定時の動作とテスト容易性を担保。
- **Trade-offs**: 抽象化レイヤーの追加が必要。
- **Follow-up**: データモデルと取得条件を設計で確定する。

### Decision: 曜日別一覧は人気順で取得する
- **Context**: 曜日別一覧の並び順を人気順にしたい方針が共有された。
- **Alternatives Considered**:
  1. 新着順
  2. 人気順
- **Selected Approach**: 人気順
- **Rationale**: 目的の一覧を見つけやすく、トップページの訴求力が高い。
- **Trade-offs**: 人気指標の更新ロジックが必要になる。
- **Follow-up**: 人気指標の算出方法を別途定義する。

## Risks & Mitigations
- ルーティング導入方針が未確定 — 設計段階で導線要件に合わせて決定する。
- 曜日別一覧のデータモデルが未定義 — 早期に最低限の属性セットを合意する。
- Supabase未設定時の空表示 — 空状態UIとエラーメッセージの設計で補完する。
- 人気指標の更新方法が未定義 — バッチ更新か手動設定かを検討する。

## References
- `src/App.jsx`
- `src/App.css`
- `src/supabaseClient.js`
- `package.json`
