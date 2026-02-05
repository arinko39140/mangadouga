# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `sitewide-ui-polish-accessibility`
- **Discovery Scope**: Extension
- **Key Findings**:
  - `prefers-reduced-motion` はOSの設定に合わせて非必須アニメーションを減らすための標準的なCSSメディア機能として定義されている。
  - コントラスト比は本文4.5:1、ラージテキスト3:1、UIコンポーネント3:1がAA基準として整理されている。
  - `:focus-visible` は入力モダリティに応じてフォーカス表示を制御し、視認性確保を前提にカスタムリングを設計できる。

## Research Log

### Reduced Motion の適用範囲
- **Context**: 要件4.4/4.5で動きの抑制を明確化する必要があるため。
- **Sources Consulted**: [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion)
- **Findings**:
  - `prefers-reduced-motion: reduce` は非必須アニメーションを減らす意図を示す。
  - すべてのアニメーションを完全停止するのではなく、必要性に応じて削減/置換することが推奨される。
- **Implications**: 初回ロード/カード出現/ホバーに対して「非必須」判定を行い、reduce時の代替表現を定義する。

### コントラスト基準の明確化
- **Context**: 要件2.5/7.1/7.4で基準値の明示が必要。
- **Sources Consulted**: [MDN: Color contrast](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable/Color_contrast)、[WebAIM: Contrast and Color](https://webaim.org/articles/contrast/)
- **Findings**:
  - 通常テキストは4.5:1、ラージテキストは3:1、UIコンポーネントは3:1がAA基準。
  - 非テキスト要素（フォーカスリングなど）も3:1が推奨される。
- **Implications**: デザイン・トークンのコントラスト検証対象（本文/見出し/補足/ボタンラベル/フォーカスリング）を明記する。

### フォーカス可視化の標準化
- **Context**: 要件6.2/6.5でフォーカスリングの共通規則が必要。
- **Sources Consulted**: [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/%3Afocus-visible)
- **Findings**:
  - `:focus-visible` はキーボード操作時のフォーカス表示に適する。
  - `outline` を除去するとキーボード利用者の操作性が低下するため、視認性の高いリング設計が必要。
- **Implications**: 全体のフォーカスリングは `:focus-visible` を基準にし、UIトークンで色/太さを統一する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 既存CSS拡張 | 既存ページCSSに変数と共通ルールを追加 | 影響範囲が小さい | 統一感が弱い | 短期導入向き |
| 共通UI新設 | 共通コンポーネント/トークンを新設し置換 | 一貫性が高い | 改修範囲が広い | 長期整備向き |
| ハイブリッド | トークンと重点ページから段階適用 | バランスが良い | 一時的に差異が残る | 推奨 |

## Design Decisions

### Decision: ハイブリッド移行を採用
- **Context**: ページ単位CSSが多く全面置換はリスクが高い。
- **Alternatives Considered**:
  1. 既存CSS拡張のみ
  2. 共通UI全面置換
- **Selected Approach**: トークン化 + 重点ページ適用 + 段階移行
- **Rationale**: 影響を抑えつつサイト全体の一貫性を向上できる。
- **Trade-offs**: 移行期間中はページ差異が残る。
- **Follow-up**: 適用対象ページの優先順位を設計で決定。

### Decision: `prefers-reduced-motion` で非必須動作を抑制
- **Context**: 要件4.4/4.5の動き抑制を具体化する必要。
- **Alternatives Considered**:
  1. reduce時に全アニメーション停止
  2. 非必須のみ停止/軽減
- **Selected Approach**: 非必須のみ停止/軽減
- **Rationale**: ユーザー体験と機能性を両立できる。
- **Trade-offs**: 「必須」の定義を設計で明確化する必要。
- **Follow-up**: 初回ロード/カード出現/ホバーの扱いを設計で確定。

### Decision: `:focus-visible` を基準とするフォーカスリング
- **Context**: キーボード操作時のフォーカス可視化を統一する必要。
- **Alternatives Considered**:
  1. `:focus` ですべて表示
  2. `:focus-visible` で必要時のみ表示
- **Selected Approach**: `:focus-visible` を採用
- **Rationale**: マウス操作時の過剰表示を避けつつ、必要時に視認性を担保できる。
- **Trade-offs**: 一部要素で `:focus-visible` の挙動差を考慮する必要。
- **Follow-up**: カスタムリングの色/太さ/影をトークン化。

### Decision: コントラスト基準はWCAG AA相当を採用
- **Context**: 要件2.5/7.4で基準値の明示が必要。
- **Alternatives Considered**:
  1. AA基準
  2. AAA基準
- **Selected Approach**: AA基準
- **Rationale**: 実装負荷と可読性のバランスが取れる。
- **Trade-offs**: AAA相当の視認性には届かないケースがある。
- **Follow-up**: フォーカスリング/非テキスト要素の3:1を適用対象に含める。

## Risks & Mitigations
- 既存CSSの分散により統一感が不十分になる — トークン化 + 優先ページ移行計画を明確化
- `content/` 配下の静的ページが別トーンで残る — 適用範囲の合意を先に取る
- フォーカスリングが既存デザインと衝突する — 視認性と調和の両立を検証する

## References
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) — reduced motionの意図と適用範囲
- [MDN: Color contrast](https://developer.mozilla.org/en-US/docs/Web/Accessibility/Guides/Understanding_WCAG/Perceivable/Color_contrast) — WCAG AAのコントラスト比
- [WebAIM: Contrast and Color](https://webaim.org/articles/contrast/) — 非テキスト要素のコントラスト基準
- [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/%3Afocus-visible) — フォーカス表示の標準指針
