# 実装ギャップ分析: oshi-list-favorites-registered-only

## 分析サマリー
- 既存実装は「作品ページ内の推し登録」と「登録済み推しのみ表示（/oshi-lists/）」が中心で、**みんなの推しリスト一覧**と**公開/非公開UI**が未実装。
- `movie_oshi`/`series_favorite`はRLSでユーザー紐づけが可能だが、**公開リストの集計・並び替え・お気に入り数更新**に必要なモデル/集計ロジックが不足。
- 認証導線は`authGate`/`LoginPage`で整備済みで、未認証時の表示要件は**現状リダイレクトのみ**。
- 既存のdataProvider + `ok/error`パターンを踏襲すればUI/データ層は整理しやすい。
- 設計フェーズでは「公開リストの定義（誰の何を一覧にするか）」と「お気に入り数集計方式」が主要論点。

## ドキュメントステータス
- 参照済み: `spec.json`, `requirements.md`, `.kiro/steering/*`, `.kiro/settings/rules/gap-analysis.md`
- 調査対象: `src/`の画面/データプロバイダ/認証関連、`supabase/migrations`の既存テーブル/RLS
- 要件は未承認だが、ギャップ分析は継続（要件の見直し材料として活用）

## 現状調査（Current State Investigation）
### アーキテクチャ/構成
- Vite + React、Supabaseは`src/supabaseClient.js`で環境変数がある場合のみ有効化
- 画面: `TopPage`, `WorkPage`, `OshiListsPage`, `LoginPage`
- ルーティング: `/oshi-lists/`（推しリスト）、`/series/:seriesId/`（作品）
- 認証: `authGate.js`でセッション確認し未認証は`/login/`へ誘導

### 既存コンポーネント/データプロバイダ
- 推し登録トグル: `WorkPage.jsx` + `EpisodeListItem.jsx` + `createWorkPageDataProvider`
- お気に入り推し一覧: `OshiListsPage.jsx` + `createOshiListDataProvider`
- `toggleMovieOshi`は`movie_oshi`を対象にトグル（ユーザーIDはRLS+`auth.uid()`）
- 取得結果の反映は`OSHI_LIST_UPDATED_EVENT`で同期

### 既存DB/ポリシー
- `movie_oshi`（user_id + movie_id, RLSで本人のみ）
- `series_favorite`（user_id + series_id, RLSで本人のみ）
- `movie.favorite_count` / `series.favorite_count`は存在するが更新トリガーなし
- `users`は公開読取のみで、認証ユーザーとの紐づけは未定義

### テスト/規約
- `WorkPage`/`OshiListsPage`/dataProviderのテストが存在
- `ok/error`戻り値とロード/空/エラー表示のパターンが確立

## 要件実現性とギャップ（Requirement-to-Asset Map）
### Requirement 1: ログインユーザーの識別とアクセス制御
- 既存資産: `authGate.js`、`LoginPage.jsx`、`movie_oshi`/`series_favorite`のRLS
- ギャップ: 未認証時の**「お気に入り推しリストでの説明表示」**は未実装（現状はリダイレクトのみ）
- ギャップ: 未認証時に**お気に入り操作を無効/非表示**にするUI制御が未整備
- ステータス: **Partial（Missing）**

### Requirement 2: お気に入り登録と解除
- 既存資産: `toggleMovieOshi`、`toggleSeriesFavorite`、RLS/PKによる重複防止
- ギャップ: 「みんなの推しリスト一覧」からの登録導線が未実装
- ギャップ: 存在しない対象時の詳細エラー表示は未整備（汎用エラーのみ）
- ステータス: **Partial（Missing）**

### Requirement 3: お気に入り推しリストの登録済みのみ表示
- 既存資産: `OshiListsPage` + `createOshiListDataProvider`（`movie_oshi`起点）
- 既存挙動: 空状態・更新イベントでの再取得は実装済み
- ギャップ: なし（ログイン前提の導線と表示要件は未対応）
- ステータス: **Mostly Covered / Partial**

### Requirement 4: みんなの推しリスト一覧での表示整合
- 既存資産: TopPageの並び替え（`favorite_count`）や`weekdayDataProvider`
- ギャップ: **公開一覧ページ自体が未実装**（UI/ルート/データ取得）
- ギャップ: 未ログイン時の非表示/ログイン時の登録状態表示の切り替え未実装
- ギャップ: お気に入り登録数の表示と並び替えUIが未実装
- ステータス: **Missing**

### Requirement 5: 推しリストページの公開/非公開UI
- 既存資産: なし（React側にトグルUI/保存先が存在しない）
- ギャップ: 保存先テーブル、RLS、所有者判定、UI制御が未実装
- ステータス: **Missing**

### Requirement 6: 推しリスト登録アイコンとバッジ表示
- 既存資産: `OshiListsPage`の「推」バッジ、`EpisodeListItem`の推しボタン
- ギャップ: 他ユーザーの推しリストページでの星バッジ表示は未実装
- ギャップ: 推しリストページ/一覧でのお気に入り登録数表示が未実装
- ステータス: **Partial（Missing）**

### Requirement 7: トップページからみんなの推しリストページへの導線
- 既存資産: `TopPage.jsx`の導線（`/oshi-lists/`）
- ギャップ: 導線先が**公開一覧ではなく登録済み一覧**になっている
- ステータス: **Partial（Missing）**

## 実装アプローチの選択肢
### Option A: 既存コンポーネント拡張
- 方向性: `/oshi-lists/`を「みんなの推しリスト一覧」に転用し、登録済み一覧は別ビューで切替
- 追加対象: `OshiListsPage.jsx`、`oshiListDataProvider.js`の拡張
- メリット: 既存UI/ルーティングを活用できる
- デメリット: 公開/個人の責務が混在し肥大化しやすい

### Option B: 新規ページ/コンポーネント作成
- 方向性: 公開一覧ページを新規で作成し、登録済み一覧は既存を維持
- 追加対象: 新規ページ + dataProvider + ルート + DB拡張
- メリット: 役割分離が明確で要件整理がしやすい
- デメリット: 実装量が増え、設計コストが上がる

### Option C: ハイブリッド
- 方向性: 認証・dataProviderは共通化しつつ、公開/個人ページは別コンポーネントで分離
- メリット: 既存パターン活用と責務分離の両立
- デメリット: データ取得の分岐設計が必要

## 実装上のギャップと制約
- 公開リストの定義不在: 何を「みんなの推しリスト」とするか（ユーザー単位/作品単位/シリーズ単位）が未確定
- 公開/非公開の保存先不在: DB設計・RLS・所有者判定が必要
- お気に入り数の更新方法: `favorite_count`が固定値のため集計/更新方式が未定
- 未認証時の表示要件: 現在はリダイレクトのみで要件未充足

## 実装規模・リスク評価
- **Effort: L** — 新規ページ/DB/RLS/集計/並び替えUIが必要
- **Risk: Medium-High** — 公開/非公開や集計ロジックの仕様が未確定

## 設計フェーズへの提案（情報提供）
- 候補アプローチ: Option C（共通dataProvider + ページ分離）
- 主要な設計判断: 「公開一覧の単位」「お気に入り数の集計方式」「未認証時の表示/操作制御」
- 推奨方針: ユーザー別の推しリスト単位 / 推しリストに公開フラグ / お気に入り数はDBトリガーで更新

## Research Needed（設計フェーズでの追加調査）
- 公開リストのドメインモデル定義（推しリスト単位/作品単位/シリーズ単位）
- 公開/非公開の保存先とRLSルール（所有者・閲覧者の制御）
- お気に入り数の集計方式（トリガー/ビュー/クエリ集計）
- 未認証時のUI挙動（リダイレクト vs. インライン説明表示）

## 次のステップ
- `/prompts:kiro-spec-design oshi-list-favorites-registered-only` で設計書作成
- 要件を即時承認して進める場合は `/prompts:kiro-spec-design oshi-list-favorites-registered-only -y`
