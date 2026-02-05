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
  - `prefers-reduced-motion` はOS設定に連動し、非必須モーションを削減・置換するための標準的なメディア機能である。
  - WCAG 2.1のコントラスト基準は本文4.5:1、ラージテキスト3:1を要求し、非テキスト要素（フォーカスリングなど）は3:1を求める。
  - WCAG 2.2ではフォーカスがコンテンツに隠れないことがAA要件として追加され、フォーカス可視性の検証項目に含める必要がある。

## Research Log

### Reduced Motion の適用範囲
- **Context**: 要件4.4/4.5で動きの抑制を具体化する必要があるため。
- **Sources Consulted**: MDN `prefers-reduced-motion`
- **Findings**:
  - `prefers-reduced-motion: reduce` は非必須アニメーションを削減・置換する意図を示す。
  - すべてのアニメーションを完全停止するのではなく、必須/非必須の区分が必要。
- **Implications**: 初回ロード/カード出現/ホバーは「非必須」扱いを基本とし、reduce時は移動や拡大を抑える指針を設ける。

### コントラスト基準の明確化
- **Context**: 要件2.5/7.1/7.4で基準値の明示が必要。
- **Sources Consulted**: W3C Understanding SC 1.4.3, W3C Understanding SC 1.4.11
- **Findings**:
  - 通常テキストは4.5:1、ラージテキストは3:1がAA基準。
  - UIコンポーネントやフォーカスリングなどの非テキスト要素は3:1が基準。
- **Implications**: トークン設計とQAで本文/見出し/補足/ボタンラベル/フォーカスリングの測定対象を明示する。

### フォーカス可視化の標準化
- **Context**: 要件6.2/6.5でフォーカスリングの共通規則が必要。
- **Sources Consulted**: MDN `:focus-visible`
- **Findings**:
  - `:focus-visible` は入力モダリティに応じてフォーカス表示を制御できる。
  - `outline` を除去する場合は代替リングが必須であり、視認性を担保する必要がある。
- **Implications**: `:focus-visible` を基準に共通フォーカスリングを定義し、色/太さをトークン化する。

### フォーカス非遮蔽の検証
- **Context**: 要件6.2/6.4の「フォーカス位置の視認性」を補強する観点。
- **Sources Consulted**: W3C WAI "What’s New in WCAG 2.2"
- **Findings**:
  - WCAG 2.2ではフォーカス要素が作者コンテンツに隠れないことがAA要件として追加された。
- **Implications**: ナビゲーションやカードのフォーカスがヘッダー/フッターに隠れないかをQAチェックに追加する。

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
- フォーカスが固定ヘッダー等に隠れる — QAでフォーカス非遮蔽の確認項目を追加する

## References
- [MDN: prefers-reduced-motion](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion) — reduced motionの意図と適用範囲
- [W3C: Understanding SC 1.4.3 Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum) — テキストのコントラスト比
- [W3C: Understanding SC 1.4.11 Non-text Contrast](https://w3c.github.io/wcag21/understanding/non-text-contrast) — 非テキスト要素のコントラスト比
- [MDN: :focus-visible](https://developer.mozilla.org/en-US/docs/Web/CSS/%3Afocus-visible) — 入力モダリティに応じたフォーカス表示
- [W3C WAI: What's New in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/) — フォーカス非遮蔽の追加要件
