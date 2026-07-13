# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arrow Home (箭牌卫浴) is a full-stack WeChat mini-program for bathroom product showcase. It consists of:
- **`miniprogram/`** — Taro 4 + React 18 frontend targeting WeChat mini-program (and H5)
- **`backstage/`** — Next.js 15 + React 19 admin dashboard (port 3001)
- **`backend/`** — FastAPI + SQLite backend (port 8000)
- **`miniprogram-dev-skill/`** — WeChat DevTools CLI integration skill

## Commands

### Development
```bash
pnpm dev          # start both backend and mini-program watch in parallel
```

### Frontend only
```bash
pnpm --filter miniprogram dev:weapp    # WeChat mini-program watch (NOTE: sets NODE_ENV=production)
pnpm --filter miniprogram dev:h5       # H5 watch
pnpm --filter miniprogram build:weapp  # production WeChat build
pnpm --filter miniprogram build:h5     # production H5 build
```

### Backend only
```bash
cd backend && uv run python main.py    # start FastAPI server on localhost:8000
cd backend && uv sync                  # install/sync Python dependencies
```

### Admin backstage only
```bash
pnpm dev:backstage                         # Next.js dev server on :3001
pnpm build:backstage                       # production build
pnpm --filter backstage dev               # same, explicit filter
```

### Install
```bash
pnpm install      # also runs `cd backend && uv sync` via postinstall hook
```

There are no test or lint scripts — ESLint and Stylelint are configured for IDE use only.

## Architecture

### Frontend (`miniprogram/src/`)

Three-tab app: 首页 (Home), 商品 (Products), 我的 (Profile).

**Pages** follow the pattern `pages/[name]/index.jsx + index.config.js + index.scss`:
- `pages/index/` — Home: rotating banners, announcements, quick-nav grid, hot products
- `pages/products/` — Two sub-routes: list (paginated/filterable/searchable) and detail (specs + gallery)
- `pages/mine/` — User profile, login/logout

**Utils**:
- `utils/api.js` — HTTP client; base URL is hardcoded to `http://localhost:8000`; attaches `Authorization: Bearer <token>` from `Taro.getStorageSync('token')`
- `utils/constants.js` — 8 predefined gradient pairs (used as placeholder images), navigation items

No global state management — all state is component-local via `useState`/`useEffect`.

### Backend (`backend/`)

`main.py` is a single-file FastAPI app. Routes:
- `POST /auth/login` — username/password or WeChat code (WeChat path returns a stubbed mock token)
- `GET /user/profile` — current user (Bearer token required)
- CRUD for `/products`, `/categories`, `/banners`, `/announcements`
- `GET /products/hot` — top 8 hot products

Database is raw SQL via `database.py` (no ORM). SQLite file is `backend/app.db`, initialized from `schema.sql` on startup via lifespan. Schema includes pre-seeded categories, products (with attributes + images), banners, and announcements.

CORS is fully open (`allow_origins=["*"]`).

### Admin Backstage (`backstage/`)

Next.js 15 App Router admin dashboard. Key design decisions:
- Auth via HttpOnly cookie `admin_token` set by `app/api/auth/login/route.ts`; middleware (`middleware.ts`) guards all routes except `/login` and `/api/auth/*`
- All backend calls go through Next.js rewrites: `/backend/:path*` → `http://localhost:8000/:path*` (configured in `next.config.ts`)
- Client-side API in `lib/api.ts` — reads token from `js-cookie` for Authorization header (cookie is also HttpOnly for middleware, but readable client-side as it's not set with httpOnly=true for JS access... actually both paths work because Next.js rewrites handle same-origin)
- Data fetching via TanStack Query v5; `QueryClientProvider` in `app/providers.tsx`
- Route structure: `(auth)/login` and `(dashboard)/` with shared sidebar layout
- Drag-and-drop attribute/variant reordering via `@dnd-kit/sortable`
- Import page supports CSV (papaparse) + XLSX/XLS (xlsx library), with auto column mapping and preview

Pages:
- `/` — Dashboard overview with stats and category distribution
- `/categories` — Tree view CRUD for product categories (parent/child)
- `/products` — Paginated product list with category filter, keyword search, inline hot toggle
- `/products/new` — Create product form
- `/products/[id]` — Edit product with attributes, variants, images
- `/import` — Bulk import wizard: upload → column mapping → preview → import

### WeChat DevTools Integration

`miniprogram-dev-skill/` provides a CLI skill (`wechatide`) for automating WeChat DevTools. See `miniprogram-dev-skill/SKILL.md` for the full workflow. Taro build output goes to `miniprogram/dist/` — that directory is what you point the DevTools project at.

## Key Conventions

- **Design width**: 750px (Taro default); responsive breakpoints at 640/375/828
- **Language**: JavaScript only — no TypeScript
- **Styling**: SCSS; component styles co-located with pages
- **Error handling**: `Taro.showToast` for user-facing errors; `console.error` + try/catch internally
- **Auth token**: stored/read via `Taro.getStorageSync('token')` / `Taro.setStorageSync('token', ...)`
- **Backend errors**: `HTTPException` with Chinese-language detail strings, HTTP 400/404
