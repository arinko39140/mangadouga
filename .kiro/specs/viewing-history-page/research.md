# Research & Design Decisions Template

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

**Usage**:
- Log research activities and outcomes during the discovery phase.
- Document design decision trade-offs that are too detailed for `design.md`.
- Provide references and evidence for future audits or reuse.
---

## Summary
- **Feature**: `viewing-history-page`
- **Discovery Scope**: Extension
- **Key Findings**:
  - Supabaseの`range()`は0始まりのインデックスで上限を制御でき、並び順に依存するため`order()`と組み合わせた履歴30件取得が適合する。
  - RLSのINSERTは`with check`で`auth.uid()`一致を明示する必要があり、未認証時は`auth.uid()`が`null`になるため明示チェックが推奨される。
  - `insert()`は戻り値の`select`が暗黙に発生し得るため、履歴記録の書き込みは最小戻り値に抑える設計が安全。

## Research Log

### Supabase履歴取得の範囲制御
- **Context**: 直近30件のみを表示する要件のため、取得件数制限の正確性を確認。
- **Sources Consulted**: Supabase JavaScript `range()` リファレンス
- **Findings**:
  - `range(from, to)`は0始まり・上限含みで、並び順に依存する。
  - `order()`を併用しないと結果が不定になる可能性がある。
- **Implications**: `clicked_at`降順の`order()`と`range(0, 29)`を組み合わせて履歴取得を設計する。

### RLSと履歴INSERTの許可条件
- **Context**: 履歴記録はログインユーザー本人のみを許可する必要がある。
- **Sources Consulted**: Supabase RLSガイド
- **Findings**:
  - `auth.uid()`は未認証時に`null`となるため、`auth.uid() IS NOT NULL AND auth.uid() = user_id`の明示条件が推奨される。
  - INSERTは`with check`で条件を定義する。
- **Implications**: `history`にINSERTポリシーと`grant insert`を追加し、未認証書き込みを防止する。

### Supabase insertの戻り値挙動
- **Context**: 履歴記録は書き込みのみで十分であり、戻り値の取得が不要。
- **Sources Consulted**: Supabase JavaScript `insert()` リファレンス
- **Findings**:
  - `insert()`は既定でSELECTを伴う可能性があり、RLS条件次第で失敗する。
- **Implications**: 履歴記録は戻り値最小化（`returning: 'minimal'`相当）か、SELECT不要な書き込み方針を採用する。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
| --- | --- | --- | --- | --- |
| Layered UI + Provider | Reactページとデータプロバイダを分離する既存パターンを踏襲 | 既存コードと整合、依存が明確 | ページ間の履歴記録呼び出しが分散しやすい | 既存の`create*Provider`と同型で拡張可能 |
| Central History Service | ルート全体で履歴記録を集中処理 | 重複排除や一元監視が容易 | 既存構造に新たなイベント層が必要 | 本機能では過剰な変更量 |

## Design Decisions

### Decision: 履歴取得は履歴→動画→推し判定の二段フェッチ
- **Context**: 表示には動画タイトル・サムネイル・推し数・推し状態が必要。
- **Alternatives Considered**:
  1. Supabaseの埋め込みselectで1回取得
  2. 履歴を取得し、必要な動画と推し情報を追加フェッチ
- **Selected Approach**: 履歴30件取得後に`movie`と`list_movie`をIN句で追加取得し、履歴順を保持して合成する。
- **Rationale**: 既存のデータプロバイダ構造と互換性が高く、履歴順保持が容易。
- **Trade-offs**: クエリ回数は増えるが、件数が30件と小さいため許容。
- **Follow-up**: 実装時にIN句の配列制限と型整合を確認。

### Decision: 履歴記録はUIイベントごとに呼び出す
- **Context**: 要件で「遷移」「話数切替」「再生開始」の3タイミングが指定されている。
- **Alternatives Considered**:
  1. WorkPageのみでまとめて記録
  2. 各ページから履歴記録サービスを直接呼び出し
- **Selected Approach**: クリック遷移と話数切替、再生ボタン押下それぞれから履歴記録を呼び出す。
- **Rationale**: 要件のタイミングを明確に満たし、履歴の粒度がブレない。
- **Trade-offs**: 呼び出しポイントが増えるため重複記録の調整が必要。
- **Follow-up**: 連続クリック時の抑制戦略（最低間隔）を実装時に検討。

### Decision: `history`テーブルにINSERT用RLSと索引を追加
- **Context**: 履歴書き込みは本人のみ、取得はユーザーID+日付順が主要パス。
- **Alternatives Considered**:
  1. 既存RLSのまま、フロントで制御
  2. RLSポリシーと索引を追加
- **Selected Approach**: INSERT用RLSを追加し、`(user_id, clicked_at desc)`索引を設計。
- **Rationale**: セキュリティと性能の両立。
- **Trade-offs**: マイグレーション作業が増える。
- **Follow-up**: 実DBに適用する際は既存データの型整合を確認。

## Risks & Mitigations
- 履歴記録が多重に発火するリスク — UI側で発火条件を明確化し、同一操作内の二重記録を抑制する。
- `history.movie_id`型不整合のリスク — 型をuuidに寄せるか、文字列として統一運用する判断を明確化する。
- RLS設定漏れにより記録不可となるリスク — `insert`用ポリシーと`grant insert`を設計に含める。

## References
- [Supabase JavaScript: Limit the query to a range](https://supabase.com/docs/reference/javascript/range)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase JavaScript: Insert data](https://supabase.com/docs/reference/javascript/insert)
