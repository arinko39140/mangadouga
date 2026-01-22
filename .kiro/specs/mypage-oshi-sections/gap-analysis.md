# ギャップ分析: mypage-oshi-sections

## 分析サマリー
- マイページに「推しリスト」「推し作品」「お気に入り推しリスト」の3セクションを並べる要件に対し、現状は推しリスト/推し作品のみで、お気に入り推しリストが欠落している。
- 推しリスト/推し作品の“一覧表示”と“項目数表示”は、マイページ上では要件を満たしておらず、詳細ページに分散している。
- 公開/非公開の制御は推しリストと推し作品で部分的に実装されているが、セクション非表示の仕様とは一致せず、一覧への適用も不足している。
- 推し作品ページ（/users/{userId}/oshi-series/）の一覧仕様・管理操作は未実装が多く、特にサムネイルと登録/解除/並べ替えはギャップが大きい。
- 既存のページ/プロバイダ/イベント通知のパターンが明確で、拡張・新規双方の実装余地はあるが、要件解釈の不明点が残る。

## ドキュメントステータス
- 参照: `.kiro/specs/mypage-oshi-sections/spec.json`, `.kiro/specs/mypage-oshi-sections/requirements.md`, `.kiro/steering/*`, `.kiro/settings/rules/gap-analysis.md`
- 要件承認ステータス: requirements 未承認（spec.json）
- 調査範囲: `src/` のページ/パネル/プロバイダ/テスト、`supabase/migrations/` の関連テーブル

## 現状調査

### 主要な構成・パターン
- React + Vite 構成で、ページ単位のコンポーネントにCSSを並置（例: `src/UserPage.jsx` + `src/UserPage.css`）。
- Supabaseアクセスは `create*Provider` で抽象化（例: `createUserOshiListProvider`, `createUserSeriesProvider`, `createOshiFavoritesProvider`）。
- 認証ガードは `authGate` で統一し、未認証時はログイン誘導。
- 更新通知は `oshiListEvents` を利用（推し登録/お気に入り変更の再取得）。

### 関連ページ/ルート
- マイページ: `/users/:userId/` → `UserPage.jsx`
- 推し作品一覧: `/users/:userId/oshi-series/` → `UserOshiSeriesPage.jsx`
- 推しリスト（自分）: `/oshi-lists/` → `OshiMyListPage.jsx`
- 推しリスト詳細: `/oshi-lists/:listId/` → `OshiListPage.jsx`
- お気に入り推しリスト: `/oshi-lists/favorites/` → `OshiFavoritesPage.jsx`

### 関連データ
- `list`, `list_movie`（推しリスト）
- `user_list`（お気に入り推しリストの関係）
- `user_series`（ユーザー×シリーズの公開リスト）
- `series`（series_id, title, favorite_count, update）
- `movie`（thumbnail_url 等）

## 要件別マッピングとギャップ

| 要件 | 既存資産 | ギャップ (Missing / Unknown / Constraint) |
| --- | --- | --- |
| R1 セクション構成の表示 | `UserPage.jsx`, `UserOshiListPanel.jsx`, `UserOshiSeriesPanel.jsx` | Missing: お気に入り推しリストセクションが未実装 / 3セクション順序の定義が不足 | 
| R2 セクション内容の概要表示 | `UserOshiSeriesPanel.jsx`（一覧）/ `UserOshiListPanel.jsx`（要約のみ） | Missing: 推しリスト一覧表示がない / 項目数が分かる情報がない / お気に入り推しリスト一覧がない |
| R3 空状態の表示 | `UserOshiListPanel.jsx`, `UserOshiSeriesPanel.jsx` | Missing: お気に入り推しリストの空状態が未実装 |
| R4 公開設定に応じた表示制御 | `userOshiListProvider.js`（list.can_display）, `userSeriesProvider.js`（user_series.can_display） | Constraint: 非公開時に“セクション非表示”ではなくメッセージ表示/空表示 / お気に入り推しリストの公開設定が未定義 | 
| R5 推し作品セクションの項目遷移 | `UserOshiSeriesPanel.jsx`（/series/:seriesId/）, `UserOshiSeriesPage.jsx` | Unknown: /users/:userId/ での遷移先が「推し作品ページ」= `/users/:userId/oshi-series/` か `/series/:seriesId/` か不明 | 
| R6 お気に入り推しリストの項目遷移（任意） | `OshiFavoritesPage.jsx`（/oshi-lists/favorites/） | Missing: マイページ内セクションおよび専用ページ導線の定義/実装 |
| R7 推しリストセクションの項目遷移 | `UserOshiListPanel.jsx`（/oshi-lists/:listId/） | Missing: 一覧項目が未表示のため項目遷移が成立しない / 遷移先が自分の推しリストページ(`/oshi-lists/`)か詳細ページか不明 |
| R8 推し作品ページの一覧表示内容 | `UserOshiSeriesPage.jsx`, `userSeriesProvider.js` | Missing: サムネイル表示、全カラム表示（update等）、表示形式切替 / seriesテーブルにサムネイルがない可能性 | 
| R9 推し作品ページの管理操作 | `WorkPage.jsx`（シリーズお気に入り/推し登録） | Missing: 推し作品ページ内の登録/解除/並べ替え（お気に入り数順、昇降順） | 

## 実装アプローチ案

### Option A: 既存コンポーネント拡張
- **対象**: `UserPage.jsx`, `UserOshiListPanel.jsx`, `UserOshiSeriesPanel.jsx`, `UserOshiSeriesPage.jsx`
- **内容**: 
  - UserPageに「お気に入り推しリスト」セクションを追加
  - 推しリストセクションに「一覧（簡易）」を追加（`OshiListPage`/`OshiListPageProvider` の再利用）
  - 推し作品セクションに項目数と詳細カラム表示を追加
  - 推し作品ページに表示形式切替/並べ替え/登録解除UIを追加
- **利点**: 既存のUI/スタイル/テストに沿うため影響が限定的
- **欠点**: UserPageが肥大化し、責務が増加

### Option B: 新規パネル/プロバイダ作成
- **対象**: 新しい `UserOshiFavoritesPanel` / `UserOshiListItemsPanel` / `mypageOshiProvider`
- **内容**:
  - マイページ専用の統合プロバイダでセクションデータを集約取得
  - パネルごとに責務分離し、一覧/件数/空状態/導線を統一
- **利点**: 責務が明確で拡張しやすい
- **欠点**: 新規ファイル増加、インターフェース設計が必要

### Option C: ハイブリッド
- **対象**: 既存ページ拡張 + 不足セクションは新規追加
- **内容**:
  - `UserPage.jsx`は既存パネルのまま、Favoritesのみ新規パネル
  - 推し作品ページは新規の一覧コンポーネントを導入して拡張
- **利点**: 影響範囲を抑えつつ不足分を補える
- **欠点**: UI/データ取得の一貫性確保が必要

## 実装難易度とリスク
- **Effort: M** — 既存ページ拡張と新規セクション追加で中規模。
  - ただし、seriesにサムネイル追加などスキーマ変更が必要なら **L** に上振れ。
- **Risk: Medium** — 要件の解釈不明点と公開設定の扱いが残るため。

## デザインフェーズへの推奨（決定ではなく検討優先）
- **優先候補**: Option C（ハイブリッド）
  - 既存のUserPage/SeriesPageの拡張に加え、お気に入り推しリストは専用パネル化で整理しやすい。
- **主要意思決定ポイント**:
  - 「推し作品ページ」の定義（/users/:userId/oshi-series/ か /series/:seriesId/）
  - 推しリストセクションは“要約”か“一覧”か
  - 公開/非公開の扱いを「非表示」仕様に合わせるか

## Research Needed
- seriesサムネイルのソース（seriesテーブル拡張 vs movieから代表サムネイル抽出）
- 推し作品の登録/解除対象（user_series か series_favorite か）
- マイページの閲覧者定義（公開前提かログイン必須か）
- 推しリスト項目遷移の正しい遷移先（/oshi-lists/ vs /oshi-lists/:listId/）

## Next Steps
- ギャップ分析の内容を前提に `/prompts:kiro-spec-design mypage-oshi-sections` を実行
- 迅速に進める場合は `/prompts:kiro-spec-design mypage-oshi-sections -y`
