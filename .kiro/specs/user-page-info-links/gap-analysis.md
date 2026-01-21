# 実装ギャップ分析: user-page-info-links

## 分析サマリー
- 他者ユーザーページ/推し作品一覧ページ自体が未実装で、ルーティング・UI・データ取得が新規で必要。
- `users` テーブルに外部リンク列はあるがUI/データプロバイダが未整備で、アイコン用の永続化も存在しない。
- 既存は「データプロバイダ注入」「loading/error/empty分岐」「Supabase + RLS」パターンが確立しており、これを踏襲できる。
- 既存のRLSは読み取りが authenticated 前提で、未ログイン閲覧や「非公開表示」の要件にはポリシー/設計の整理が必要。

## ドキュメント状況
- 参照: `.kiro/specs/user-page-info-links/requirements.md`（未承認）
- 参照: `.kiro/steering/` 全ファイル、`.kiro/settings/rules/gap-analysis.md`
- ギャップ分析フレームワークに従って現状調査・要件適合性・選択肢評価を実施

## 1. 現状調査

### 1.1 既存アセット/構成
- ルーティング: `src/AppRouter.jsx` は `/oshi-lists/` 系のみ（ユーザーページ未定義）。
- 既存UI: `src/OshiListsPage.jsx`（みんなの推しリスト）、`src/OshiListPage.jsx`（単一リスト表示）、`src/OshiMyListPage.jsx`（自分の推しリスト）。
- データ取得: `src/oshiListCatalogProvider.js`/`src/oshiListPageProvider.js`/`src/oshiListDataProvider.js`（Supabaseクエリ + 正規化 + error種別）。
- Supabase: `public.users`（name, x_url, youtube_url, other_url）、`public.list`（favorite_count, can_display）、`public.list_movie`、`public.user_list`。
- 認証: `src/authGate.js` と `src/supabaseSession.js` により「要ログイン」前提のページが多い。
- テスト: `vitest` + Testing Library（ページ/プロバイダ単体テストが存在）。

### 1.2 命名/構成パターン
- React関数コンポーネント + CSS並置（例: `OshiListsPage.jsx` + `OshiListsPage.css`）。
- データプロバイダを props 注入し、UIと取得ロジックを分離。
- loading/error/empty の状態分岐を明示。

### 1.3 統合面
- Supabaseクライアントは `src/supabaseClient.js` に集約。
- `list` と `list_movie` は RLS で authenticated 前提（公開判定は `can_display`）。
- `users` は anon も select 可能だが、現状UIでは利用していない。

## 2. 要件適合性とギャップ

### 2.1 要件→アセット対応表（ギャップタグ）

| 要件 | 既存アセット | ギャップ |
| --- | --- | --- |
| 他者ユーザー情報表示（Req 1） | `users` テーブル（name） | Missing / Unknown（アイコン列・UIなし） |
| 推しリスト/推し作品表示（Req 2） | `OshiListPage.jsx`（listIdで作品一覧） | Missing（ユーザーページのまとめ表示なし） |
| 外部リンク表示（Req 3） | `users` テーブル（x_url/youtube_url/other_url） | Missing（取得/検証/表示UIなし） |
| 対象ページ適用（Req 4） | 該当ルートなし | Missing |
| 他者ユーザーの推し作品一覧ページ（Req 5） | `OshiListPage.jsx` は listId前提 | Unknown（ユーザー軸のページ/導線未定義） |
| 公開状態の反映（Req 6） | `list.can_display` / RLS | Constraint（非公開時の状態表示ができない） |
| お気に入り登録（Req 7） | `user_list` + toggleFavorite | Partial（未ログイン時UI無効化/表示要件が未対応） |
| ナビゲーション（Req 8） | `OshiListsPage.jsx` はリンクなし | Missing |
| データ整合性/エラー状態（Req 9） | エラー/空状態は既存パターンあり | Partial（ユーザー不存在/再試行UIが未整備） |

### 2.2 必要な技術要素（不足/未知）
- **ルーティング**: 他者ユーザーページ（例: `/users/:userId/`）と推し作品一覧ページの新規ルート。
- **UIコンポーネント**:
  - ユーザー情報セクション（見出し、アイコン/空状態、ユーザーネーム）
  - 外部リンクセクション（表示名、リンク無効判定、空状態）
  - 推しリスト/推し作品の一覧セクション（空状態/読み込み/エラー）
- **データ取得**:
  - `users` 取得（ユーザー名・外部リンク・アイコン情報）
  - 他者ユーザーの list_id 解決（listId経由 or userId経由の新規クエリ）
- **認証/公開範囲**:
  - 未ログイン閲覧の扱い（閲覧のみ可/ログイン必須）
  - 非公開時の表示要件を満たすためのRLS/問い合わせ設計
- **URL検証**: 外部リンクの正当性判定（URLパース/許容スキーム）

### 2.3 制約/既存前提
- `users` にアイコン用の列が存在しない（要件との不一致）。
- `list`/`list_movie` は authenticated 前提のRLSで、未ログイン閲覧の要件解釈と整合しない可能性。
- `OshiListPage` は listId ルートで、ユーザーIDからの導線がない。
- TypeScriptなし・ESM + ESLintの既存規約を尊重する必要あり。

### 2.4 Research Needed（設計フェーズへ持ち越し）
- ユーザーアイコンの保存先（`users` 拡張/ストレージ/外部URL）と表示仕様。
- 他者ユーザーページのルート設計（userId起点か listId起点か）。
- 外部リンクの正規化ルール（許容ドメイン/スキーム/表示名の決定）。
- 非公開時の表示を満たすためのRLS/SQL設計（匿名閲覧の許可可否も含む）。

## 3. 実装アプローチの選択肢

### Option A: 既存ページ拡張（`OshiListPage` をユーザーページへ拡張）
**方針**: 既存 `OshiListPage` にユーザー情報/外部リンクセクションを追加し、listId ルートで統合。`OshiListsPage` からユーザー導線を listId で接続。  
**影響範囲**: `OshiListPage.jsx`/`OshiListsPage.jsx`、関連CSS、`oshiListPageProvider.js`。  
**トレードオフ**:
- ✅ 既存UI/プロバイダの再利用で工数を抑えられる
- ✅ listId中心のデータ取得が既存設計と整合
- ❌ ユーザーページと推し作品一覧が同一ページに混在し責務が肥大化
- ❌ ユーザーID起点の要件とのズレが出る可能性

### Option B: ユーザーページ新設（専用ルート + 専用プロバイダ）
**方針**: `/users/:userId/` の新規ページを作成し、ユーザー情報/外部リンク/推しリスト/推し作品を統合表示。`OshiListPage` は推し作品一覧の専用ページとして残す。  
**影響範囲**: `AppRouter.jsx` へのルート追加、新規 `UserPage.jsx` + `userPageProvider.js`、`OshiListsPage.jsx` のリンク更新。  
**トレードオフ**:
- ✅ 責務分離が明確で拡張性が高い
- ✅ userId起点の要件に自然に整合
- ❌ 新規ファイル増加・設計負荷が増える
- ❌ listId との対応関係の整理が必要

### Option C: ハイブリッド（ユーザー情報コンポーネント新設 + 既存ページに組み込み）
**方針**: `UserInfoSection`/`ExternalLinksSection` の共通コンポーネントを新設し、`OshiListPage` と新規ユーザーページの両方に配置。データ取得は userId/listId の双方を扱えるプロバイダを用意。  
**影響範囲**: 新規セクションコンポーネント、`OshiListPage.jsx`/新規ユーザーページ/プロバイダ。  
**トレードオフ**:
- ✅ 共通UIを再利用でき、要件4の「両ページ適用」を満たしやすい
- ✅ 段階導入が可能
- ❌ データ取得経路が複雑化（userId/listIdの二重対応）
- ❌ 設計の整合性維持が必要

## 4. 実装規模・リスク評価

- **Effort**: M（3〜7日）
  - ルーティング追加、UI/プロバイダ新設、RLS/スキーマ検討が必要。
- **Risk**: Medium
  - 既存パターンはあるが、公開範囲とユーザー識別の設計が未確定。

## 5. 設計フェーズへの推奨・論点

- **推奨方針（暫定）**: Option C（ハイブリッド）
  - 共通セクションの再利用で要件4に適合しやすく、既存ページの拡張にも対応できるため。
- **主要論点**:
  - ユーザーIDとlistIdの対応づけ（1ユーザー=1リスト前提か複数リストか）
  - アイコンの永続化方法と表示仕様
  - 外部リンクのURL検証ルールと無効リンクの扱い
  - 未ログイン閲覧と非公開時の表示設計（RLS/ポリシー変更の必要性）

## 次のステップ

- 要件の承認状態を確認し、必要に応じて要件更新を検討
- `/prompts:kiro-spec-design user-page-info-links` を実行して design.md を作成
- 必要に応じて RLS/スキーマ/外部リンク検証のリサーチを設計フェーズで実施
