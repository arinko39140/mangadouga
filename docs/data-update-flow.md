# データ更新フロー（CSV/JSON/Supabase）

## 対象範囲
- **Supabase（主）**: アプリ表示の主要データは Supabase テーブルを参照する。
- **CSV/JSON（補助）**: ルート直下のCSVはプロトタイプ用の参照データとして保管している。2026-02-05時点で`src/`内からCSV参照は確認できないため、更新後は表示確認を必ず行う。

## 正の情報源（SSOT）
- **Supabase** を正の情報源とする。
- **CSV/JSON** は補助資料であり、画面反映の保証はない。

## データ一覧（CSV）
| ファイル | 主な用途 | 主要カラム |
| --- | --- | --- |
| `history.csv` | 視聴履歴の参照用データ | `history_id`, `user_id`, `movie_id`, `Click time` |
| `list.csv` | 推しリストの参照用データ | `list_id`, `user_id`, `favorite_count`, `can_display` |
| `list_movie.csv` | リストと作品の関連 | `list_id`, `movie_id` |
| `movie.csv` | 作品情報 | `movie_id`, `movie_title`, `url`, `favorite_count`, `update`, `series_id`, `weekday` |
| `series.csv` | シリーズ情報 | `series_id`, `title`, `favorite_count` |
| `user_list.csv` | ユーザーとリストの関連 | `user_id`, `list_id`, `can_display` |
| `user_series.csv` | ユーザーとシリーズの関連 | `user_id`, `series_id`, `can_display` |
| `users.csv` | ユーザー情報 | `user_id`, `name`, `X_url`, `youtube_url`, `other_url` |

## データ一覧（Supabase）
| テーブル | 用途 | 反映先（画面） |
| --- | --- | --- |
| `users` | ユーザープロフィール | ユーザーページ、一覧系
| `list` | 推しリスト | リスト一覧/詳細
| `list_movie` | リストと作品の関連 | リスト詳細
| `movie` | 作品情報 | 作品ページ、トップ/一覧
| `series` | シリーズ情報 | シリーズ関連表示
| `user_list` | ユーザーの推し登録 | お気に入り/マイリスト
| `user_series` | ユーザーのシリーズ登録 | シリーズ表示
| `history` | 視聴履歴 | 履歴ページ

## 更新手順（Supabase）
1. `.env.local` に `VITE_SUPABASE_URL` と `SUPABASE_SERVICE_ROLE_KEY` を設定する。
2. 目的に応じて以下のスクリプトを実行する。
   - `node scripts/seed-oshi-list-data.mjs`
   - `node scripts/sync-users-and-lists.mjs`
   - `node scripts/update-recent-movie-titles.mjs`
3. Supabaseダッシュボードで対象テーブルの行数/主要列を確認する。

## 更新手順（CSV）
1. ルート直下の対象CSVを更新する（ヘッダー行は変更しない）。
2. 更新後は、関連する画面で表示が変化するかを目視確認する。

## 更新責務
- **更新担当者**: CSV/JSONやデータ内容の更新時に、更新手順・チェックリスト・注意点を更新する。
- **開発者**: Supabaseスキーマ/スクリプト/反映先の変更時に、データ一覧・反映先・更新トリガーを更新する。

## 更新トリガー
- CSV/JSONの追加・削除・列変更
- Supabaseテーブル/列の追加・削除・命名変更
- `scripts/` の更新手順変更
- 画面の反映先追加・変更

## 代表的な失敗例と対処
- **Supabase接続情報が見つからない**: `.env.local` のキー不足。必要な環境変数を再設定する。
- **UUID形式でないID**: スクリプトでスキップされる可能性がある。ID形式を確認する。
- **関連テーブル不整合**: `user_list`/`list_movie` などの関連が不足している場合、表示が欠落する。

## 更新後チェックリスト
- トップページで作品カードが表示される
- リスト一覧/詳細で推し情報が表示される
- 作品ページにタイトル/URL/関連情報が表示される
- 履歴ページに閲覧履歴が表示される
- お気に入り/マイリストの表示が正しく更新される
