# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `top-page-search-title`
- **Discovery Scope**: Extension
- **Key Findings**:
  - トップページは`src/TopPage.jsx`内で曜日別一覧と過去100件一覧を描画しており、検索結果は曜日別一覧枠内に統合するのが最小変更。
  - 既存データ取得は`fetchWeekdayLists`(直近7日)と`fetchWeekdayItems`(過去100件)のみで、要件の「過去分を含む全一覧」に対応するには全件取得の拡張が必要。
  - 入力正規化は`NFKC`正規化 + 小文字化 + 空白整形で「大文字/小文字」「全角/半角」「連続空白」を同時に扱える。

## Research Log

### 既存トップページ構造
- **Context**: 検索UIの配置と検索結果の表示領域を確定するため。
- **Sources Consulted**: `src/TopPage.jsx`, `src/TopPage.css`
- **Findings**:
  - 曜日別一覧は`top-page__list`セクションで描画され、状態表示や一覧表示ロジックが集中している。
  - 過去100件一覧は独立セクションで、検索適用中でも維持する要件に合致。
- **Implications**: 検索UIは`top-page__list`内に追加し、検索適用中は同セクションの一覧レンダリング分岐を切り替える。

### データ取得と制限
- **Context**: 検索対象が「過去分を含む全一覧」であるため。
- **Sources Consulted**: `src/weekdayDataProvider.js`
- **Findings**:
  - 既存APIは週次一覧と過去100件のみに限定され、全件検索には不足。
  - 取得フィールドは`movie_id, movie_title, url, thumbnail_url, favorite_count, update, series_id, weekday`。
- **Implications**: `fetchAllItems`相当の軽量取得を追加し、検索時に全件タイトルを取得してキャッシュする設計が必要。

### 入力正規化方針
- **Context**: 大文字/小文字、全角/半角、空白整形の要件を満たすため。
- **Sources Consulted**: 既存の検索ユーティリティなし (`rg` で該当なし)、`src/App.css`の`.search`スタイル
- **Findings**:
  - 既存に検索の正規化ユーティリティはなく、新規のポリシー関数が必要。
  - `.search`のUIスタイルが既存で、検索入力の見た目は共通化できる。
- **Implications**: `normalizeSearchText`/`matchesTitle`のような純関数を定義し、UIは`.search`スタイルを再利用する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Client-side filter | 検索時に全件タイトルを取得し、クライアントで正規化・部分一致 | 実装が単純、要件の正規化に柔軟対応 | データ量が増えると初回検索が重い | プロトタイプ向け。要件満足を優先。 |
| Server-side search | Supabaseで`ilike`や正規化済み列による検索 | 通信量削減、スケールに強い | 正規化列の導入やDB変更が必要 | 将来的な拡張候補。 |

## Design Decisions

### Decision: 検索クエリの正規化をクライアントで統一
- **Context**: 2.2〜2.5の一致判定要件を同時に満たす必要がある。
- **Alternatives Considered**:
  1. サーバー側で正規化済みカラムを追加
  2. クライアント側で`NFKC`正規化と空白処理を適用
- **Selected Approach**: クライアント側で`NFKC`正規化 + `toLowerCase` + 空白整形を実施し、タイトル側も同処理で比較。
- **Rationale**: 既存構成を保ちつつ要件を満たせるため。
- **Trade-offs**: 大量データ時のCPU負荷が増える。
- **Follow-up**: データ件数が増えた場合、正規化列導入の再検討を行う。

### Decision: 検索開始時の全件取得は遅延取得＋キャッシュ
- **Context**: 検索適用時に過去分を含む全件が必要。
- **Alternatives Considered**:
  1. 初期ロード時に全件取得
  2. 検索実行時に取得し、以降はキャッシュ
- **Selected Approach**: 検索実行時に一度取得し、メモリにキャッシュする。
- **Rationale**: 初期表示の負荷を抑えつつ要件を満たせる。
- **Trade-offs**: 初回検索の待ちが発生する。
- **Follow-up**: 必要に応じてローディング表示と再試行導線を追加。

### Decision: 検索適用状態は入力値と適用値を分離
- **Context**: 入力保持(1.1)と検索実行(1.2)を分離する必要。
- **Alternatives Considered**:
  1. 入力変更のたびに即時検索
  2. 入力値と適用値を分け、ボタン/Enterで適用
- **Selected Approach**: 入力値と適用クエリを分離し、明示操作で検索を開始。
- **Rationale**: 要件に最も近く、UIの意図が明確。
- **Trade-offs**: 1ステップ多い操作になる。
- **Follow-up**: 将来、即時検索の要望が出た場合は方針変更を検討。

## Risks & Mitigations
- 大量データで初回検索が重い — 取得フィールドを最小化し、遅延取得を採用。
- Supabase未設定時に検索が機能しない — 既存エラー表示と同じトーンで検索専用の状態表示を追加。
- 正規化で取りきれない表記揺れが残る — 将来的な正規化列や別名対応を検討。

## References
- `src/TopPage.jsx` — 検索UIの統合位置とレンダリング分岐の確認
- `src/weekdayDataProvider.js` — データ取得インターフェースの確認
- `src/TopPage.css` / `src/App.css` — 検索UIスタイルの再利用検討
