# 実装ギャップ分析: oshi-list-user-registration-registered-only

## 分析サマリー
- 既存実装は「作品ページ内の推し登録トグル」とSupabase RLSに偏っており、推しリストページ自体は未実装で大部分が欠落。
- DBには`episode_oshi`/`series_favorite`があるが、公開/非公開・推しリストお気に入り・お気に入り数表示のためのテーブルとRLSが存在しない。
- 認証導線は`authGate`/`LoginPage`/`AppShell`で整備済みで、推しリストページにも再利用可能。
- 既存のデータ取得/エラー表現パターン（dataProvider + `ok/error`）を踏襲できるためUI実装方針は明確。
- 設計フェーズでは「推しリストのデータモデル定義」と「公開設定/お気に入り集計の実装方式」が主要論点。

## ドキュメントステータス
- 参照済み: `spec.json`, `requirements.md`, `.kiro/steering/*`, `.kiro/settings/rules/gap-analysis.md`
- 調査対象: `src/`の画面/データプロバイダ/認証関連、`supabase/migrations`の既存テーブル/RLS
- 既存実装のパターン（dataProvider、認証ゲート、ロード/エラー表示）に基づいてギャップを整理

## 現状調査（Current State Investigation）
### アーキテクチャ/構成
- Vite + React、Supabaseクライアントは`src/supabaseClient.js`で環境変数があれば有効化
- 画面: `TopPage`, `WorkPage`, `OshiListsPage`（プレースホルダー）、`LoginPage`
- ルーティング: `/oshi-lists/` ルートあり（`AppRouter.jsx`）
- 認証: `authGate.js`でセッション確認し未認証なら`/login/`へ誘導

### 既存コンポーネント/データプロバイダ
- 推し登録トグル: `WorkPage.jsx` + `EpisodeListItem.jsx` + `createWorkPageDataProvider`
- `toggleEpisodeOshi`は`episode_oshi`を対象にトグル（ユーザーIDはRLS+`auth.uid()`依存）
- ロード/エラー表示は`EpisodeListPanel`等で明示的に表現

### 既存DB/ポリシー
- `episode_oshi`（user_id + movie_id, RLSで本人のみ）
- `series_favorite`（user_id + series_id, RLSで本人のみ）
- `users`は公開読み取りのみ（認証ユーザーとの関連仕様が不明）
- 公開/非公開、推しリストお気に入り、集計系のテーブルやポリシーは未整備

### テスト/規約
- `WorkPage`とdataProviderのテストがあり、成功/未認証動作を検証
- 新機能も同様の`ok/error`戻り値パターンとテスト構造に合わせるのが自然

## 要件実現性とギャップ（Requirement-to-Asset Map）
### Requirement 1: 推し登録のユーザー紐づけ
- 既存資産: `episode_oshi`テーブル + RLS、`toggleEpisodeOshi`
- ギャップ: 推し登録時のID妥当性エラー表示が未実装（現在は汎用エラーのみ）
- 追加考慮: 既存UIは登録済み状態を「取得して反映」しておらず、初期状態は常に未登録
- ステータス: **Partial（Missing/Unknown）**

### Requirement 2: 登録済み推しのみの一覧表示
- 既存資産: `/oshi-lists/`ルートのみ（UIなし）
- ギャップ: 推し一覧取得のデータプロバイダ・UI・認証未済表示の全てが未実装
- ステータス: **Missing**

### Requirement 3: 登録結果の反映と通知
- 既存資産: WorkPageでトグル結果をローカル状態に反映
- ギャップ: 登録失敗時のメッセージ表示、推しリスト一覧側の反映
- ステータス: **Partial（Missing）**

### Requirement 4: データ取得とエラー処理
- 既存資産: `EpisodeListPanel`等のロード/エラー表示パターン
- ギャップ: 推しリストページでのロード/エラー表示が未実装
- ステータス: **Missing**

### Requirement 5: 推しリストの公開/非公開設定
- 既存資産: 該当テーブル/設定UIなし
- ギャップ: 設定保存先（DB設計/RLS）とUI、他ユーザー閲覧制御が未実装
- ステータス: **Missing**

### Requirement 6: 公開推しリストのお気に入り登録
- 既存資産: `series_favorite`は作品お気に入りであり、推しリストお気に入りには未対応
- ギャップ: 推しリストお気に入り用テーブル、重複防止、非公開時の禁止制御が未実装
- ステータス: **Missing**

### Requirement 7: 推しリストのお気に入り数表示
- 既存資産: `favorite_count`は作品テーブルのみ
- ギャップ: 推しリスト単位の集計・表示が未実装
- ステータス: **Missing**

### Requirement 8: 推しリストの表示形式切り替え
- 既存資産: `SortControl`などUI制御パターン
- ギャップ: 表示形式の状態管理と切り替えUIが未実装
- ステータス: **Missing**

## 実装アプローチの選択肢
### Option A: 既存コンポーネント拡張
- 方向性: `EpisodeListPanel/Item`とdataProviderのパターンを流用し、`OshiListsPage`に最小のUI追加
- 追加対象: `OshiListsPage.jsx`、新規dataProvider（`createOshiListDataProvider`）
- メリット: 既存UI/ロジックへの変更量が小さい
- デメリット: 公開/非公開やお気に入り機能を同一画面に詰め込むと肥大化しやすい

### Option B: 新規コンポーネント分離
- 方向性: 推しリスト専用ページ/カード/空状態/表示切替UIを新規で設計
- 追加対象: ページ専用コンポーネント群 + dataProvider + Supabaseテーブル/ポリシー
- メリット: 責務分離が明確、公開/非公開・お気に入り機能を拡張しやすい
- デメリット: 新規ファイルが増え、設計コストが高い

### Option C: ハイブリッド
- 方向性: dataProvider・認証ゲートは既存を拡張、UIは推しリスト専用で新規
- メリット: 既存パターン活用と責務分離の両立
- デメリット: 影響範囲が広く、設計調整が必要

## 実装上のギャップと制約
- 認証前提の一覧取得: `authGate`はWorkPage専用導線。推しリストでの未認証表示/誘導は設計が必要
- 取得時の「登録済み状態」: `episode_oshi`をjoinして初期表示に反映する仕組みが必要
- 公開/非公開: 現行DBに保持先がないため、新規テーブル・RLS・API設計が必須
- お気に入り数: 集計更新方法（トリガー/ビュー/クエリ集計）を決める必要
- UI状態設計: ロード/空/エラー表示と表示形式切替の状態管理が未整備

## 実装規模・リスク評価
- **Effort: L** — 新規ページ+DBテーブル/RLS/集計+UI状態管理が必要
- **Risk: Medium-High** — 認証/RLS/集計の設計が未確定で、要件解釈に依存

## 設計フェーズへの提案（情報提供）
- 候補アプローチ: Option C（dataProvider/認証は既存流用、推しリストUIは専用化）
- 主要な設計判断: 推しリストの単位（ユーザー単位/シリーズ単位/エピソード単位）、公開設定の保存先、集計方式

## Research Needed（設計フェーズでの追加調査）
- 推しリストのドメインモデル: `episode_oshi`をそのまま一覧化するか、別エンティティを設けるか
- 公開/非公開の保存先とRLSルール（他ユーザー閲覧、非公開時の非表示）
- 推しリストお気に入りのテーブル設計と重複防止戦略
- お気に入り数の集計方式（ビュー/マテビュー/トリガー/クエリ集計）
- 推し登録の初期状態取得（WorkPageでの`isOshi`取得）を拡張するか

## 次のステップ
- `/prompts:kiro-spec-design oshi-list-user-registration-registered-only` で設計書作成
- 要件を即時承認して進める場合は `/prompts:kiro-spec-design oshi-list-user-registration-registered-only -y`
