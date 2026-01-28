# 研究と設計判断ログ

---
**目的**: Discoveryで得た事実、設計判断の根拠、代替案を記録する。
---

## サマリー
- **機能**: weekday-filter-sort-quick-switch
- **調査範囲**: 拡張
- **主要な知見**:
  - Supabase JavaScript クライアントは `order()` と `range()` を組み合わせて並び順と取得件数を制御できるため、「最新100件」の要件をサーバー側で満たせる。
  - React Router の検索パラメータ操作は `useSearchParams` で管理でき、ページ間で `sortOrder` のキーを統一する設計方針に適合する。
  - PostgREST は HTTP Range/limit をサポートしており、Supabase の `range()` は並び順の指定と組み合わせる前提で利用する必要がある。

## 調査ログ

### Supabase の並び替えと件数制限
- **背景**: 「最新100件」を確実に返すため、クエリ側で並び順と範囲指定を行う必要がある。
- **参照ソース**: Supabase JavaScript `select` / `range` ドキュメント、PostgREST の Pagination 仕様
- **知見**:
  - `range(from, to)` は 0-based の inclusive 範囲で取得件数を制限する。
  - `order()` と `range()` は組み合わせて使用することが前提であり、並び順が未指定の場合は期待しない結果になり得る。
  - PostgREST はクエリパラメータや Range ヘッダでページング可能で、Supabase はそれをラップしている。
- **影響**: すべてのソートで `order()` を先に定義し、`range(0, 99)` によって「最新100件」または「人気100件」を確定させる。

### URL クエリの統一キー
- **背景**: 要件 3.6 が「ページ間で同一キーと意味を保持」と規定している。
- **参照ソース**: React Router `useSearchParams` ドキュメント
- **知見**:
  - `useSearchParams` は URL の検索パラメータと更新関数を提供し、変更はナビゲーションとして反映される。
  - `URLSearchParams` は安定参照だが mutable であり、更新は setter を通すべきと明記されている。
- **影響**: `sortOrder` を URL の単一キーとして統一し、TopPage / WorkPage / OshiListsPage の UI とデータ取得に同じ意味付けを使う。

## アーキテクチャパターン評価

| 選択肢 | 説明 | 強み | リスク / 制約 | 補足 |
| --- | --- | --- | --- | --- |
| UI State + Data Provider | 既存のページコンポーネントに状態とデータ取得アダプタを追加 | 既存構成と整合、変更範囲が限定的 | ページごとに状態管理が分散 | 既存パターンを継続しやすい |
| Global Store | 共通ストアでフィルタ/ソート状態を集中管理 | 状態共有が容易 | 既存構成から逸脱、導入コスト増 | 本機能では過剰 |

## 設計判断

### 判断: sortOrder の標準化
- **背景**: 要件 3.5, 3.6 でページ間のソート名と意味の統一が求められる。
- **代替案**:
  1. ページごとにローカルなキーを持つ
  2. `sortOrder` を全ページで共有する
- **採用方針**: `sortOrder` を全ページ共通のクエリキーとし、値は `popular` / `latest` の 2 種に統一する。
- **理由**: UI と URL の整合性を保ち、要件 3.5/3.6 を満たす。
- **トレードオフ**: 一部ページで使わない値が存在するが、未対応の場合はフォールバックする。
- **フォローアップ**: 未対応の値受信時のフォールバックをユーティリティに集約する。

### 判断: 「人気」ソートの指標
- **背景**: 要件 2.4/2.6 が list_movie 件数に基づく人気順を定義している。
- **代替案**:
  1. list_movie を集計して都度計算する
  2. movie.favorite_count を参照する
- **採用方針**: 既存トリガーで更新される `movie.favorite_count` を利用して人気順を表現する。
- **理由**: 集計クエリを避け、既存スキーマと整合する。
- **トレードオフ**: トリガーの正確性に依存する。
- **フォローアップ**: 既存トリガーの監視とテストで整合性を担保する。

### 判断: TopPage の取得件数制限
- **背景**: 要件 1.5/1.6/1.7 で「最新100件」を定義。
- **代替案**:
  1. 全件取得後にフロントで絞り込み
  2. Supabase クエリで 100 件に制限
- **採用方針**: `order()` + `range(0, 99)` によってクエリ側で制限。
- **理由**: 通信量を抑制し、パフォーマンスを改善。
- **トレードオフ**: 各切替時のクエリが必要になる。
- **フォローアップ**: 連続切替時の UX を考慮し、必要ならキャッシュを追加。

## リスクと緩和策
- URL と UI の状態不整合 — クエリ更新を単一ユーティリティに統一し、初期化は URL ではなく日付基準で行う。
- 人気順の正確性 — トリガー更新の前提を明示し、テストで favorite_count 更新を検証する。
- 切替時の再取得による遅延 — ローディング表示と空状態文言を明確化する。

## 参考資料
- Supabase JavaScript `select` ドキュメント: https://supabase.com/docs/reference/javascript/select
- Supabase JavaScript `range` ドキュメント: https://supabase.com/docs/reference/javascript/range
- Supabase JavaScript `gte` ドキュメント: https://supabase.com/docs/reference/javascript/gte
- PostgREST Pagination: https://postgrest.org/en/v10/api.html
- React Router `useSearchParams`: https://reactrouter.com/api/hooks/useSearchParams
