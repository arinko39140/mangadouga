# 研究と設計判断ログ

---
**目的**: Discoveryで得た事実、設計判断の根拠、代替案を記録する。
---

## サマリー
- **機能**: weekday-filter-sort-quick-switch
- **調査範囲**: 拡張
- **主要な知見**:
  - 既存のTopPage/WorkPage/OshiListsPageはそれぞれ異なるsortOrder値を使用しており、統一には正規化ポリシーが必要。
  - Supabaseの`order()`と`range()`を併用することで並び順と取得件数をサーバー側で制御できるため、「最新100件」制約に適合する。
  - React Routerの`useSearchParams`はURLクエリの更新をナビゲーションとして反映するため、`sortOrder`のURL同期に適合する。

## 調査ログ

### 既存ソートキーの分散
- **背景**: 要件 3.5/3.6 でソート名と意味の統一が必要。
- **参照ソース**: `src/WorkPage.jsx`, `src/SortControl.jsx`, `src/OshiListsPage.jsx`
- **知見**:
  - WorkPageは`latest/oldest`を使用している。
  - OshiListsPageは`favorite_desc/favorite_asc`を使用している。
- **影響**: `sortOrder`を`popular/latest`に統一し、既存値は正規化ポリシーで変換する。

### Supabaseの並び替えと件数制限
- **背景**: 「最新100件」を常に保証する必要がある。
- **参照ソース**: Supabase JavaScript `range`, `select` ドキュメント
- **知見**:
  - `range(from, to)`は0-basedのinclusive範囲で取得件数を制限する。
  - `range()`は`order()`と併用する前提であり、並び順が未指定の場合は期待通りの結果にならない。
- **影響**: TopPageの「最新100件」は`order(update desc)` + `range(0, 99)`で確定させる。

### URLクエリの統一キー
- **背景**: ページ間で同一キーと意味を保つ必要がある。
- **参照ソース**: React Router `useSearchParams` ドキュメント
- **知見**:
  - `useSearchParams`はURLクエリと更新関数のタプルを返し、更新はナビゲーションとして反映される。
  - `searchParams`は安定参照だがmutableであり、更新は`setSearchParams`経由が推奨される。
- **影響**: `sortOrder`のURL同期は`useSearchParams`を用いた一貫した更新ルールで行う。

## アーキテクチャパターン評価

| 選択肢 | 説明 | 強み | リスク / 制約 | 補足 |
| --- | --- | --- | --- | --- |
| UI State + Data Provider | 既存のページコンポーネントに状態とデータ取得アダプタを追加 | 既存構成と整合、変更範囲が限定的 | ページごとに状態管理が分散 | 既存パターンの踏襲 |
| 集約サービス導入 | 集計・ソートを共通サービスへ集約 | 実装の再利用性 | 新規境界の追加コスト | 今回は非目標 |

## 設計判断

### 判断: sortOrder の標準化
- **背景**: 要件 3.5/3.6 でページ間のソート名と意味の統一が求められる。
- **代替案**:
  1. ページごとにローカルなキーを持つ
  2. `sortOrder` を全ページで共有する
- **採用方針**: `sortOrder` を全ページ共通のクエリキーとし、値は `popular` / `latest` の 2 種に統一する。
- **理由**: UI と URL の整合性を保ち、要件 3.5/3.6 を満たす。
- **トレードオフ**: 一部ページで使わない値が存在するが、未対応の場合はフォールバックする。
- **フォローアップ**: 既存の`favorite_desc/favorite_asc/oldest`は正規化で`popular/latest`に変換する。

### 判断: 人気順の厳密保証
- **背景**: 要件 2.4/2.6 が list_movie / user_list 件数に基づく人気順を要求。
- **代替案**:
  1. list_movie / user_list を都度集計して並び替える
  2. `favorite_count` を参照する
- **採用方針**: **常に集計値で人気順を決定**し、`favorite_count`は参照しない。
- **理由**: 正確性を最優先とする要件解釈に一致する。
- **トレードオフ**: 追加クエリによる負荷が増える。
- **フォローアップ**: TopPageは100件に限定し、WorkPageは件数が多い場合にページング検討。

### 判断: TopPage の「最新100件」保証
- **背景**: 要件 1.5/1.6/1.7 で「最新100件」を定義。
- **代替案**:
  1. 全件取得後にフロントで絞り込み
  2. Supabase クエリで 100 件に制限
- **採用方針**: `order(update desc)` + `range(0, 99)` によってクエリ側で制限。
- **理由**: 通信量を抑制し、要件の「最新100件」を満たす。
- **トレードオフ**: 切替時に都度クエリが必要。
- **フォローアップ**: 連続切替の競合対策（requestId/abort）を設計に組み込む。

## リスクと緩和策
- 二段階取得による遅延 — TopPageは100件制限を維持し、UIはローディング/空状態を明示する。
- 人気順の集計コスト増 — WorkPageは必要に応じてページングや取得上限を検討する。
- URLとUIの不整合 — `SortOrderPolicy`で正規化し、URL更新は単一路線に統一する。

## 参考資料
- Supabase JavaScript `range`: https://supabase.com/docs/reference/javascript/range
- Supabase JavaScript `select`: https://supabase.com/docs/reference/javascript/select
- Supabase JavaScript `filter`: https://supabase.com/docs/reference/javascript/filter
- React Router `useSearchParams`: https://reactrouter.com/api/hooks/useSearchParams
- PostgREST Pagination: https://docs.postgrest.org/en/v12/references/api/pagination_count.html
