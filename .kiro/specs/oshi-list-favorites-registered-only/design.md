# Design Document

## Overview
本機能は、みんなの推しリスト一覧を公開しつつ、ログインユーザーの「お気に入り推しリスト」は登録済みのみを表示する体験を提供する。推しリストの実体は`movie_oshi`であり、一覧表示は`user_id`単位で集約したユーザーの推しリストを公開する。公開/非公開制御はユーザー単位で行い、未ログインユーザーの閲覧安全性とログインユーザーの操作性を両立する。

対象ユーザーは一覧閲覧ユーザーとログインユーザーであり、前者は公開リストのみ閲覧可能、後者はお気に入り登録/解除や公開設定を管理できる。既存のReact + Supabase構成を維持し、UIの境界とデータ取得契約を明確化する。

### Goals
- みんなの推しリスト一覧をログイン状態に関わらず閲覧可能にする
- お気に入り推しリストはログインユーザーの登録済みのみを表示する
- 公開/非公開設定と登録数表示の整合性を保つ
- 一覧はユーザー単位で集約表示し、ユーザー名を表示する

### Non-Goals
- 新規の認証基盤導入やIDプロバイダ追加
- 推しリストの作成フローや編集フローの新規実装
- モバイル専用デザインの刷新

## Requirements Traceability

| Requirement | Summary | Components | Interfaces | Flows |
|-------------|---------|------------|------------|-------|
| 1.1 | 未ログイン時にログイン必要表示 | OshiFavoritesPage | UI State | Favorites Auth Flow |
| 1.2 | 未ログイン時の操作無効化 | OshiFavoritesPage | UI State | Favorites Auth Flow |
| 1.3 | お気に入り操作のユーザー紐づけ | AuthGate, OshiFavoritesProvider | Service, State | Favorites Toggle Flow |
| 1.4 | 認証無効時の操作中断 | AuthGate, OshiFavoritesPage | Service | Favorites Toggle Flow |
| 1.5 | 他ユーザー登録結果の非表示 | OshiFavoritesProvider | State | Favorites Auth Flow |
| 2.1 | お気に入り登録 | OshiFavoritesProvider | Service | Favorites Toggle Flow |
| 2.2 | お気に入り解除 | OshiFavoritesProvider | Service | Favorites Toggle Flow |
| 2.3 | 登録済み表示 | OshiFavoritesPage | UI State | Favorites Toggle Flow |
| 2.4 | 不正/不可時のエラー表示 | OshiFavoritesPage, OshiFavoritesProvider | State | Favorites Toggle Flow |
| 2.5 | 重複登録防止 | OshiFavoritesProvider | Service | Favorites Toggle Flow |
| 2.6 | 一覧からの登録 | OshiListsCatalogPage, OshiListCatalogProvider | Service, State | Catalog Toggle Flow |
| 3.1 | 登録済みのみ表示 | OshiFavoritesPage, OshiFavoritesProvider | State | Favorites Auth Flow |
| 3.2 | 空状態表示 | OshiFavoritesPage | UI State | Favorites Auth Flow |
| 3.3 | 変更時の一覧更新 | OshiListEventBus, OshiFavoritesPage | State | Favorites Toggle Flow |
| 3.4 | 重複表示防止 | OshiFavoritesProvider | State | Favorites Auth Flow |
| 4.1 | 公開一覧の表示 | OshiListsCatalogPage | UI State | Catalog Load Flow |
| 4.2 | ログイン時のお気に入り状態表示 | OshiListsCatalogPage, OshiListCatalogProvider | State | Catalog Load Flow |
| 4.3 | 未ログイン時の個人状態非表示 | OshiListCatalogProvider | Service | Catalog Load Flow |
| 4.4 | 一覧からお気に入り登録 | OshiListsCatalogPage, OshiListCatalogProvider | Service | Catalog Toggle Flow |
| 4.5 | 登録数表示 | OshiListsCatalogPage, OshiListFavoriteCounter | State | Catalog Load Flow |
| 4.6 | 登録数で並び替え | OshiListsCatalogPage, OshiListCatalogProvider | Service | Catalog Load Flow |
| 4.7 | 初期表示は多い順 | OshiListsCatalogPage | UI State | Catalog Load Flow |
| 5.1 | 公開/非公開UI表示 | OshiListVisibilityPanel | UI State | Visibility Toggle Flow |
| 5.2 | 公開状態の適用 | OshiListVisibilityProvider | Service | Visibility Toggle Flow |
| 5.3 | 非公開状態の適用 | OshiListVisibilityProvider | Service | Visibility Toggle Flow |
| 5.4 | 非公開は未ログイン非表示 | OshiListCatalogProvider, OshiListPage | Service | Catalog Load Flow |
| 5.5 | 所有者以外はUI非表示 | OshiListVisibilityPanel | UI State | Visibility Toggle Flow |
| 5.6 | 所有者のみ操作可能 | OshiListVisibilityProvider, AuthGate | Service | Visibility Toggle Flow |
| 6.1 | 登録アイコン表示 | OshiListsCatalogPage, OshiListPage | UI State | Catalog Load Flow |
| 6.2 | 公開ページの登録バッジ | OshiListPage | UI State | Catalog Load Flow |
| 6.3 | 登録済み表示 | OshiListsCatalogPage, OshiListPage | UI State | Catalog Load Flow |
| 6.4 | 登録数表示 | OshiListPage, OshiListsCatalogPage, OshiListFavoriteCounter | State | Catalog Load Flow |
| 6.5 | 登録数更新の反映 | OshiListEventBus, OshiListsCatalogPage, OshiListPage | State | Favorites Toggle Flow |
| 7.1 | トップページ導線表示 | TopPage | UI State | Catalog Load Flow |
| 7.2 | 導線から遷移 | AppRouter, TopPage | UI State | Catalog Load Flow |

## Architecture

### Existing Architecture Analysis (if applicable)
- Reactページは`DataProvider`を通してSupabaseへアクセスする構成。
- 認証は`AuthGate`でセッションを確認し、未ログイン時はログイン画面へ誘導している。
- 推しリストの実体は`movie_oshi`で、ユーザー単位で集約する必要がある。

### Architecture Pattern & Boundary Map

```mermaid
graph TB
  User --> OshiListsCatalogPage
  User --> OshiFavoritesPage
  User --> OshiListPage
  OshiListsCatalogPage --> AuthGate
  OshiFavoritesPage --> AuthGate
  OshiListPage --> AuthGate
  OshiListsCatalogPage --> OshiListCatalogProvider
  OshiFavoritesPage --> OshiFavoritesProvider
  OshiListPage --> OshiListVisibilityPanel
  OshiListVisibilityPanel --> OshiListVisibilityProvider
  OshiListCatalogProvider --> Supabase
  OshiFavoritesProvider --> Supabase
  OshiListVisibilityProvider --> Supabase
  OshiListEventBus --> OshiListsCatalogPage
  OshiListEventBus --> OshiFavoritesPage
  OshiListEventBus --> OshiListPage
```

**Architecture Integration**:
- Selected pattern: UI + DataProvider分離。既存構成を維持し、画面ごとの責務を明確化する。
- Domain/feature boundaries: 公開一覧、登録済み一覧、公開/非公開管理を分離し、状態の混在を防止する。
- Existing patterns preserved: `AuthGate`による認証ガード、`OSHI_LIST_UPDATED_EVENT`による更新通知。
- New components rationale: ユーザー単位の公開一覧用DataProviderと公開/非公開制御用DataProviderを新設し責務分割。
- Steering compliance: React + Supabase構成とフロントエンド主導の責務分離に準拠。

### Technology Stack

| Layer | Choice / Version | Role in Feature | Notes |
|-------|------------------|-----------------|-------|
| Frontend / CLI | React 18.3.1 | 一覧UIと操作UIの構築 | 既存のHook/Stateで制御 |
| Frontend / CLI | react-router-dom 6.30.1 | ルーティングと遷移 | `/oshi-lists/`の導線維持 |
| Backend / Services | Supabase JS 2.90.1 | 認証とDBアクセス | RLSとビューを利用 |
| Data / Storage | PostgreSQL (Supabase) | 推しリスト/お気に入り永続化 | RLS/トリガー利用 |

## System Flows

### Catalog Load Flow
```mermaid
sequenceDiagram
  participant User
  participant CatalogPage
  participant AuthGate
  participant CatalogProvider
  participant Supabase
  User ->> CatalogPage: open
  CatalogPage ->> AuthGate: getStatus
  AuthGate -->> CatalogPage: status
  CatalogPage ->> CatalogProvider: fetchCatalog status
  CatalogProvider ->> Supabase: select user list summary view
  Supabase -->> CatalogProvider: rows
  CatalogProvider -->> CatalogPage: catalog items
```
- 未ログイン時は`isFavorited`を`false`に固定し、公開リストのみを返す。
- 初期の並び順は`favorite_count`降順で固定。

### Favorites Toggle Flow
```mermaid
sequenceDiagram
  participant User
  participant CatalogPage
  participant AuthGate
  participant FavoritesProvider
  participant Supabase
  User ->> CatalogPage: toggle favorite
  CatalogPage ->> AuthGate: getStatus
  AuthGate -->> CatalogPage: auth ok
  CatalogPage ->> FavoritesProvider: toggle oshi list favorite
  FavoritesProvider ->> Supabase: upsert or delete
  Supabase -->> FavoritesProvider: result
  FavoritesProvider -->> CatalogPage: favorite state
  CatalogPage ->> OshiListEventBus: publish update
```
- 認証失敗時は操作を中断し、ログイン誘導を行う。

## Components and Interfaces

| Component | Domain/Layer | Intent | Req Coverage | Key Dependencies (P0/P1) | Contracts |
|-----------|--------------|--------|--------------|--------------------------|-----------|
| OshiListsCatalogPage | UI | みんなの推しリスト一覧を表示 | 4.1-4.7, 6.1-6.5 | OshiListCatalogProvider(P0), AuthGate(P0) | State |
| OshiFavoritesPage | UI | 登録済みのみの推しリスト一覧 | 1.1-1.5, 2.1-2.6, 3.1-3.4 | OshiFavoritesProvider(P0), AuthGate(P0) | State |
| OshiListPage | UI | 特定ユーザーの推しリスト詳細 | 5.4, 6.1-6.5 | OshiListVisibilityPanel(P0), AuthGate(P0) | State |
| OshiListVisibilityPanel | UI | 公開/非公開の切替UI | 5.1-5.6 | OshiListVisibilityProvider(P0), AuthGate(P0) | State |
| OshiListCatalogProvider | Data | 公開一覧の取得と並び替え | 4.1-4.7, 6.1, 6.4 | Supabase(P0) | Service |
| OshiFavoritesProvider | Data | お気に入り一覧と登録/解除 | 1.3, 2.1-2.6, 3.1-3.4 | Supabase(P0) | Service |
| OshiListVisibilityProvider | Data | 公開/非公開の更新 | 5.1-5.6 | Supabase(P0) | Service |
| AuthGate | Service | 認証状態の検査 | 1.1-1.4, 5.6 | Supabase Auth(P0) | Service |
| OshiListEventBus | State | 更新通知のハブ | 3.3, 6.5 | window(P1) | State |
| OshiListFavoriteCounter | Data | 登録数の更新と整合 | 4.5-4.7, 6.4-6.5 | PostgreSQL(P0) | Batch |

### UI

#### OshiListsCatalogPage

| Field | Detail |
|-------|--------|
| Intent | 公開推しリスト一覧を表示し、ログイン時のみお気に入り状態を付加する |
| Requirements | 4.1-4.7, 6.1-6.5 |

**Responsibilities & Constraints**
- 公開リストを常に表示し、未ログイン時は個人状態を出さない
- 並び替えは登録数の多い順を初期状態とする
- お気に入りトグル操作は認証必須

**Dependencies**
- Inbound: AppRouter — ルート/導線 (P0)
- Outbound: OshiListCatalogProvider — 一覧取得 (P0)
- Outbound: AuthGate — 認証確認 (P0)
- External: window event — 更新通知 (P1)

**Contracts**: Service [ ] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### State Management
- State model: `items`, `sortOrder`, `isLoading`, `error`, `isAuthenticated`
- Persistence & consistency: メモリ内状態のみ、更新通知で再取得
- Concurrency strategy: 連続操作はボタン無効化

**Implementation Notes**
- Integration: `OSHI_LIST_UPDATED_EVENT`受信時に一覧再取得
- Validation: 未ログイン時は登録ボタンを無効化
- Risks: 未ログイン時に個人状態が混入しないよう`isFavorited`を固定

#### OshiFavoritesPage

| Field | Detail |
|-------|--------|
| Intent | ログインユーザーの登録済み推しリストのみを表示 |
| Requirements | 1.1-1.5, 2.1-2.6, 3.1-3.4 |

**Responsibilities & Constraints**
- 未ログイン時はログイン必要メッセージを表示
- 一覧は登録済みのみ、空状態を表示
- 登録/解除時は一覧の状態を更新

**Dependencies**
- Inbound: AppRouter — ルート/導線 (P0)
- Outbound: OshiFavoritesProvider — お気に入り一覧取得 (P0)
- Outbound: AuthGate — 認証確認 (P0)
- External: window event — 更新通知 (P1)

**Contracts**: Service [ ] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### State Management
- State model: `items`, `isLoading`, `error`, `authRequired`
- Persistence & consistency: 認証成功時のみ取得
- Concurrency strategy: 操作中は対象ボタンを無効化

**Implementation Notes**
- Integration: 認証失敗時は一覧取得を行わずログインCTAを表示
- Validation: `userId`の入力検証
- Risks: 認証状態の変化で一覧が表示されない場合がある

#### OshiListPage

| Field | Detail |
|-------|--------|
| Intent | 特定ユーザーの推しリスト詳細を表示 |
| Requirements | 5.4, 6.1-6.5 |

**Responsibilities & Constraints**
- 公開設定が非公開の場合は未ログインに表示しない
- 表示対象は`movie_oshi`の`user_id`で絞り込んだ一覧

**Dependencies**
- Inbound: AppRouter — ルート/導線 (P0)
- Outbound: OshiListVisibilityPanel — 公開/非公開UI (P0)
- Outbound: AuthGate — 認証確認 (P0)

**Contracts**: Service [ ] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### State Management
- State model: `items`, `isLoading`, `error`, `visibility`
- Persistence & consistency: 更新後にページ再取得
- Concurrency strategy: 更新中はUIをロック

**Implementation Notes**
- Integration: 非公開時は主要コンテンツを抑制
- Validation: 公開状態の取得に失敗した場合は非表示に倒す
- Risks: 公開判定の欠落で情報が露出する

#### OshiListVisibilityPanel

| Field | Detail |
|-------|--------|
| Intent | 推しリストページの公開/非公開切替を提供 |
| Requirements | 5.1-5.6 |

**Responsibilities & Constraints**
- 所有者のみUIを表示し操作可能
- 非公開時は未ログインに内容を表示しない

**Dependencies**
- Inbound: OshiListPage — 推しリストページのコンテキスト (P0)
- Outbound: OshiListVisibilityProvider — 公開設定更新 (P0)
- Outbound: AuthGate — 所有者判定 (P0)

**Contracts**: Service [ ] / API [ ] / Event [ ] / Batch [ ] / State [x]

##### State Management
- State model: `visibility`, `isUpdating`, `error`
- Persistence & consistency: 更新後にページ再取得
- Concurrency strategy: 更新中はUIをロック

**Implementation Notes**
- Integration: 非公開時はOshiListPageの主要コンテンツを抑制
- Validation: 所有者以外は操作不可
- Risks: 所有者判定の欠落でUIが誤表示される

### Data

#### OshiListCatalogProvider

| Field | Detail |
|-------|--------|
| Intent | 公開推しリスト一覧の取得と並び替えを提供 |
| Requirements | 4.1-4.7, 6.1, 6.4 |

**Responsibilities & Constraints**
- 公開リストのみ取得し、`favorite_count`で並び替え
- 認証状態に応じて`isFavorited`を付加

**Dependencies**
- Inbound: OshiListsCatalogPage — 一覧取得要求 (P0)
- Outbound: Supabase — `user_oshi_list_catalog`ビュー取得 (P0)
- External: Supabase Auth — `auth.uid()`参照 (P1)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [ ]

##### Service Interface
```typescript
type Visibility = 'public' | 'private'

type OshiListCatalogItem = {
  userId: string
  name: string
  favoriteCount: number
  isFavorited: boolean
  visibility: Visibility
}

type CatalogResult =
  | { ok: true; data: OshiListCatalogItem[] }
  | { ok: false; error: 'network' | 'unknown' | 'not_configured' }

interface OshiListCatalogProvider {
  fetchCatalog(params: { sortOrder: 'favorite_desc' | 'favorite_asc' }): Promise<CatalogResult>
  toggleFavorite(targetUserId: string): Promise<{ ok: true; data: { isFavorited: boolean } } | { ok: false; error: 'auth_required' | 'network' | 'conflict' | 'unknown' }>
}
```
- Preconditions: `targetUserId`は空文字不可
- Postconditions: `isFavorited`は最新状態を返す
- Invariants: 公開一覧には非公開リストを含めない

**Implementation Notes**
- Integration: `user_oshi_list_catalog`ビューを使用
- Validation: 未ログイン時は`toggleFavorite`を`auth_required`で失敗させる
- Risks: ビューの権限不足による取得失敗

#### OshiFavoritesProvider

| Field | Detail |
|-------|--------|
| Intent | 登録済み推しリストの取得と登録/解除を提供 |
| Requirements | 1.3, 2.1-2.6, 3.1-3.4 |

**Responsibilities & Constraints**
- ログインユーザーの`oshi_list_favorite`のみを取得
- 重複登録を防止し、解除で即時反映

**Dependencies**
- Inbound: OshiFavoritesPage — 一覧取得/操作 (P0)
- Outbound: Supabase — `oshi_list_favorite` (P0)
- External: Supabase Auth — `auth.uid()` (P0)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [ ]

##### Service Interface
```typescript
type OshiFavoriteItem = {
  userId: string
  name: string
  favoriteCount: number
  isFavorited: true
}

type FavoritesResult =
  | { ok: true; data: OshiFavoriteItem[] }
  | { ok: false; error: 'network' | 'unknown' | 'auth_required' | 'not_configured' }

interface OshiFavoritesProvider {
  fetchFavorites(): Promise<FavoritesResult>
  toggleFavorite(targetUserId: string): Promise<{ ok: true; data: { isFavorited: boolean } } | { ok: false; error: 'auth_required' | 'network' | 'conflict' | 'unknown' }>
}
```
- Preconditions: 認証済みであること
- Postconditions: 一覧は登録済みのみ
- Invariants: 他ユーザーの登録情報は返さない

**Implementation Notes**
- Integration: RLSによりユーザー単位制御
- Validation: `targetUserId`の空値は即時エラー
- Risks: 認証切替で一覧が空になる

#### OshiListVisibilityProvider

| Field | Detail |
|-------|--------|
| Intent | 推しリストの公開/非公開設定を更新 |
| Requirements | 5.1-5.6 |

**Responsibilities & Constraints**
- 所有者のみが更新可能
- 非公開設定は未ログイン閲覧を遮断

**Dependencies**
- Inbound: OshiListVisibilityPanel — 更新要求 (P0)
- Outbound: Supabase — `users`更新 (P0)
- External: Supabase Auth — `auth.uid()` (P0)

**Contracts**: Service [x] / API [ ] / Event [ ] / Batch [ ] / State [ ]

##### Service Interface
```typescript
type Visibility = 'public' | 'private'

type VisibilityResult =
  | { ok: true; data: { visibility: Visibility } }
  | { ok: false; error: 'auth_required' | 'forbidden' | 'network' | 'unknown' }

interface OshiListVisibilityProvider {
  updateVisibility(visibility: Visibility): Promise<VisibilityResult>
}
```
- Preconditions: 認証済みであること
- Postconditions: `visibility`が更新される
- Invariants: 所有者以外は更新不可

**Implementation Notes**
- Integration: RLSポリシーで所有者制御
- Validation: 変更後に一覧とページを再取得
- Risks: 所有者判定ミスで公開範囲が漏れる

#### OshiListFavoriteCounter

| Field | Detail |
|-------|--------|
| Intent | お気に入り登録数の整合性維持 |
| Requirements | 4.5-4.7, 6.4-6.5 |

**Responsibilities & Constraints**
- `oshi_list_favorite`の増減に連動し`users.oshi_list_favorite_count`を更新

**Dependencies**
- Inbound: Supabase trigger — 登録/解除 (P0)
- Outbound: PostgreSQL — `users`更新 (P0)

**Contracts**: Service [ ] / API [ ] / Event [ ] / Batch [x] / State [ ]

##### Batch / Job Contract
- Trigger: `oshi_list_favorite`のinsert/delete
- Input / validation: `target_user_id`が存在
- Output / destination: `users.oshi_list_favorite_count`
- Idempotency & recovery: トランザクション内で加減算

**Implementation Notes**
- Integration: DBトリガーで更新
- Validation: `oshi_list_favorite_count`が負数にならないことを保証
- Risks: トリガー未設定時の表示不整合

## Data Models

### Domain Model
- Aggregates: `UserOshiList` (ユーザー単位の推しリスト)
- Entities: `MovieOshi`, `OshiListFavorite`
- Business rules: 非公開リストは未ログインに表示しない

### Logical Data Model

**Structure Definition**:
- `users`: `user_id` (PK), `name`, `oshi_list_visibility`, `oshi_list_favorite_count`
- `movie_oshi`: `user_id` + `movie_id` (PK), `created_at`
- `oshi_list_favorite`: `user_id` + `target_user_id` (PK), `created_at`

**Consistency & Integrity**:
- `movie_oshi.user_id`は`users.user_id`にFK
- `oshi_list_favorite.target_user_id`は`users.user_id`にFK
- `oshi_list_favorite_count`はトリガーで同期
- `oshi_list_visibility`は`public`/`private`の列挙値

### Physical Data Model

**For Relational Databases**:
- `users`追加列: `oshi_list_visibility text default 'public'`, `oshi_list_favorite_count integer default 0`
- `movie_oshi`インデックス: `(user_id)`で一覧取得を高速化
- `oshi_list_favorite`インデックス: `(target_user_id)`で並び替えと集計を支援
- `users`インデックス: `(oshi_list_favorite_count)`で並び替えを高速化

### Data Contracts & Integration

**API Data Transfer**
- `user_oshi_list_catalog` view
  - `user_id: text`, `name: text`, `oshi_list_favorite_count: integer`, `oshi_list_visibility: text`, `is_favorited: boolean`
- `oshi_list_favorite` toggle
  - Request: `{ target_user_id: text }`
  - Response: `{ is_favorited: boolean }`

**Cross-Service Data Management**
- RLSで`auth.uid()`に基づきユーザー単位の読み書きを保証
- `movie_oshi`の閲覧は対象ユーザーの`oshi_list_visibility = 'public'`を条件に許可

## Error Handling

### Error Strategy
- 認証が必要な操作は`auth_required`で即時停止
- 取得失敗は`network`/`unknown`で分類しUIで通知

### Error Categories and Responses
- User Errors: 未ログイン → ログイン誘導、無効入力 → 操作中止
- System Errors: 通信失敗 → 再試行提示、Supabase障害 → 一覧を空状態に
- Business Logic Errors: 所有者以外の公開切替 → 操作不可メッセージ

### Monitoring
- UIログは`console`のみに留め、実装時に監視基盤連携を検討

## Testing Strategy

### Unit Tests
- `OshiListCatalogProvider.fetchCatalog`の並び替え判定
- `OshiFavoritesProvider.fetchFavorites`の認証失敗パス
- `OshiListVisibilityProvider.updateVisibility`の権限制御

### Integration Tests
- 公開一覧取得とお気に入り状態の反映
- お気に入り登録/解除後の`oshi_list_favorite_count`更新
- 非公開リストが未ログインに非表示になること

### E2E/UI Tests
- 未ログインでお気に入り一覧にアクセスするとログイン必要表示
- 公開一覧でお気に入りトグルが正常動作
- 公開/非公開切替が推しリストページに反映される

## Security Considerations
- `users`のRLSを`user_id = auth.uid()`で更新許可、閲覧は`oshi_list_visibility = 'public'`に限定
- `movie_oshi`は所有者または公開ユーザーのデータのみ閲覧可
- `oshi_list_favorite`は`user_id = auth.uid()`で読み書き可能
- 未ログイン時の個人状態取得を禁止

## Performance & Scalability
- `oshi_list_favorite_count`のインデックスで並び替えコストを抑制
- 一覧取得はページサイズ制限を後続で検討

## Migration Strategy

```mermaid
flowchart TD
  Start --> AddColumns
  AddColumns --> Backfill
  Backfill --> UpdatePolicies
  UpdatePolicies --> Verify
  Verify --> End
```
- AddColumns: `users.oshi_list_visibility`と`users.oshi_list_favorite_count`追加
- Backfill: 既存ユーザーを`public`に設定しカウントは0
- UpdatePolicies: `users`/`movie_oshi`/`oshi_list_favorite`のRLS更新とビュー作成
- Verify: 公開一覧と非公開制御の回帰確認
