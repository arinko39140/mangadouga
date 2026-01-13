# Technology Stack

## Architecture

Vite + Reactを中心にしたフロントエンドに、Supabaseを用いた動的データ連携を組み合わせる。

## Core Technologies

- **Language**: JavaScript (ESM)
- **Framework**: React 18 (Vite)
- **Runtime**: Node.js
- **Backend-as-a-Service**: Supabase (PostgreSQL)

## Key Libraries

- `@vitejs/plugin-react` for React + Vite integration
- `@supabase/supabase-js` for Supabase client access
- `react-router-dom` for client-side routing
- `vitest` + Testing Library for unit testing

## Development Standards

### Type Safety
No TypeScript; rely on JavaScript conventions and ESLint.

### Code Quality
ESLint with React, hooks, and refresh plugins.

### Testing
Vitest + Testing Libraryでユニットテストを実行する。

## Development Environment

### Required Tools
Node.js for Vite workflows.

### Common Commands
```bash
# Dev (Vite): npm run dev
# Build (Vite): npm run build
# Lint: npm run lint
```

## Key Technical Decisions

- UIはVite + Reactで構成し、現状はブラウザのみで完結させる。
- インタラクティブなUI状態はクライアント側で保持する。
- Supabaseの接続情報は`VITE_*`の環境変数から読み込み、未設定時はクライアントを無効化する。
- 将来的に動的サイト化し、DBを利用する前提で拡張可能な設計判断を行う。

## Future Direction

- バックエンド/APIとDB導入を見据え、データ取得や更新の責務を分離しやすい構造を維持する。
- DBの種類やサーバー構成は後続の設計で確定する。

## Updates

- updated_at: 2026-01-13T17:10:00+0900
- note: テスト実行環境とルーティング用ライブラリの方針を追記
- updated_at: 2026-01-08T18:03:22+0900
- note: 将来的な動的化とDB利用の方針を追記
- updated_at: 2025-01-13T00:00:00+0900
- note: BaaSは補助的な検証用途と位置づけ、漫画動画サイトの体験設計を主軸に変更
- updated_at: 2025-01-13T00:00:00+0900
- note: Supabaseを用いた動的サイト方針に再更新

---
_Document standards and patterns, not every dependency_
