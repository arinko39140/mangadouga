# Project Structure

## Organization Philosophy

React + Viteを中心に、UIコードと静的アセットを分離して管理する。

## Directory Patterns

### React App
**Location**: `src/`  
**Purpose**: Vite + Reactのエントリやコンポーネントを配置。  
**Example**: `src/main.jsx`, `src/App.jsx`

### Static Public Assets
**Location**: `public/`  
**Purpose**: Viteが配信する静的アセット。  
**Example**: `public/vite.svg`

### Markdown Content
**Location**: `content/`  
**Purpose**: Markdown中心のコンテンツと付随アセットを管理。  
**Example**: `content/index.md`

### Supabase Configuration
**Location**: `supabase/`  
**Purpose**: Supabase CLI設定・マイグレーション管理。  
**Example**: `supabase/config.toml`

### Data Files
**Location**: project root  
**Purpose**: プロトタイプ用のCSV/Excelデータ。  
**Example**: `list.csv`

### Tests
**Location**: `src/` と `src/test/`  
**Purpose**: UIテストはコンポーネントと同階層に配置し、テスト共通設定は`src/test/`に集約。  
**Example**: `src/TopPage.test.jsx`, `src/test/setup.js`

## Naming Conventions

- **Files**: `index.md` for route roots; kebab-case for content directories.
- **Components**: PascalCase in React (e.g., `App.jsx`).
- **Functions**: camelCase for JavaScript helpers.

## Import Organization

```javascript
import App from './App.jsx'
import './index.css'
```

**Path Aliases**:
- None configured; use relative imports.

## Code Organization Principles

- ReactアプリのUIは`src/`内で完結させ、依存は最小にする。
- 静的アセットは`public/`に集約し、UIロジックと分離する。
- UIコンポーネントは同名のCSSファイルと並置し、スタイルの依存関係を明確にする。
- Supabaseクライアントは`src/supabaseClient.js`に集約し、環境変数ベースで有効化する。
- 将来的なAPI/DB導入に備え、フロントエンドとデータ層の責務を分けて設計する。

## Updates

- updated_at: 2026-01-14T10:05:00+0900
- note: Markdownコンテンツ配置とテスト配置、CSS並置の構造パターンを追記
- updated_at: 2026-01-08T18:03:22+0900
- note: 将来的な動的化とDB利用を見据えた構成方針を追加
- updated_at: 2025-01-13T00:00:00+0900
- note: Supabase構成は補助的な検証用途と位置づけを更新
- updated_at: 2025-01-13T00:00:00+0900
- note: Supabaseを動的サイトの基盤として再位置づけ

---
_Document patterns, not file trees. New files following patterns shouldn't require updates_
