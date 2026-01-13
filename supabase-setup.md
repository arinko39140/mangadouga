# Supabaseセットアップ手順（初学者向け）

このアプリはSupabase（PostgreSQL）に保存します。ベストプラクティスとして、Supabase CLIとマイグレーションでスキーマを管理します。

## 1. Supabaseのアカウント作成とプロジェクト作成
1. https://supabase.com/ でアカウント作成
2. 新規プロジェクト作成（任意のプロジェクト名でOK）
3. リージョンは近いものを選択

## 2. Supabase CLIの準備
```bash
npm install supabase --save-dev
```

初回のみ、Supabase CLIの初期化を行います。
```bash
npx supabase init
```

すでに `supabase/` がある場合はスキップでOKです。

## 3. プロジェクト参照（project ref）の設定
`supabase/config.toml` の `project_id` を、SupabaseのProject Refに置き換えます。

```toml
project_id = "your-project-ref"
```

## 4. マイグレーションでスキーマ管理（movies）
このリポジトリには `supabase/migrations/20250113120000_create_movies.sql` を用意しています。
内容は以下と同等です。

```sql
create table if not exists public.movies (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

alter table public.movies enable row level security;

drop policy if exists "Public read" on public.movies;
drop policy if exists "Public insert" on public.movies;
drop policy if exists "Public update" on public.movies;
drop policy if exists "Public delete" on public.movies;

create policy "Public read" on public.movies
for select
to anon
using (true);

create policy "Public insert" on public.movies
for insert
to anon
with check (true);

create policy "Public update" on public.movies
for update
to anon
using (true)
with check (true);

create policy "Public delete" on public.movies
for delete
to anon
using (true);

grant select, insert, update, delete on table public.movies to anon;
```

注意: 公開時は誰でも編集・削除できる状態になります。運用では認証や制限を追加してください。

## 5. リモートに反映
Supabaseのリモートプロジェクトに紐付けてマイグレーションを反映します。

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

## 6. 環境変数の設定
Supabaseの「Project Settings」→「API」から以下を取得します。
- Project URL
- anon public key

プロジェクト直下に `.env.local` を作成し、以下を設定します。

```env
VITE_SUPABASE_URL=ここにProject URL
VITE_SUPABASE_ANON_KEY=ここにanon key
```

## 7. Supabaseクライアントの依存追加
```bash
npm install @supabase/supabase-js
```

## 8. 動作確認
```bash
npm run dev
```

アプリの「追加」「編集」「削除」「複製」「サンプル復元」がSupabase上のデータに反映されます。
