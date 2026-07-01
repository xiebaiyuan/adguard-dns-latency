# AdGuardHome DNS Latency Analyzer

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](package.json)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](package.json)

Analyze and diagnose DNS query latency for [AdGuardHome](https://github.com/AdguardTeam/AdGuardHome). Aggregates latency percentiles (P20~P99) per domain to identify long-tail slow queries for further diagnosis.

> **🇨🇳 中文版**: 详见 [README.md](README.md)

## Features

- **Latency Distribution** — Per-domain P20 / P50 / P80 / P95 / P99 / Max / Avg / Min, sortable and filterable
- **Cache-Aware** — Cached and uncached queries are reported separately, distinguishing "real upstream performance" from "user experience"
- **Slow Query Grading** — >500ms (slow), >1s (severe), >3s (timeout), with per-domain slow rate and severe rate
- **Query Type Analysis** — Breakdown by A / AAAA / PTR / MX record types, with type filtering support
- **Upstream Drill-Down** — Inline expand on any domain to view per-upstream latency details
- **Dark/Light Mode** — Follows system preference + manual toggle
- **CSV Export** — Export summary statistics or raw query logs for offline analysis
- **Browser Configuration** — Configure AdGuardHome connection from the UI — no file editing required

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  Browser SPA  │────▶│ Fastify API  │────▶│ AdGuardHome API  │
│ (Vite+React) │◀────│ + Analysis   │◀────│ /control/querylog│
└─────────────┘     └─────────────┘     └──────────────────┘
                         │ Cache
                    ┌────▼────────┐
                    │ In-Memory Cache │
                    └────────────────┘
```

### Tech Stack

| Layer | Tech |
|-------|------|
| **Frontend** | Vite + React + shadcn/ui + Recharts (Tailwind v4, responsive, mobile-friendly) |
| **Backend** | Fastify + TypeScript (8 API endpoints, async refresh, in-memory cache) |
| **Analysis Engine** | Pure functions, fully unit-tested, handles empty/single/batch input |
| **Build** | npm workspaces monorepo, multi-stage Docker build |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/analysis/summary` | GET | Cache status + summary KPI |
| `/api/analysis/domains` | GET | Per-domain aggregated stats (supports `type` / `search` / `sort` / `order` / `limit`) |
| `/api/analysis/domains/:domain` | GET | Upstream breakdown + raw query log for a specific domain (paginated) |
| `/api/analysis/stats` | GET | Raw stats overview from AdGuardHome |
| `/api/analysis/refresh` | POST | Trigger re-fetch from AdGuardHome (async) |
| `/api/config` | POST | Configure AdGuardHome connection (URL / username / password) |
| `/api/adguard/*` | GET/POST | Generic AdGuardHome management API proxy |
| `/api/health` | GET | Health check |

---

## Quick Start

### Prerequisites

- Node.js >= 18
- An accessible AdGuardHome instance (LAN or localhost)

### Install & Run

```bash
# 1. Clone the repository
git clone https://github.com/xiebaiyuan/adguard-dns-latency.git
cd adguard-dns-latency

# 2. Install dependencies
npm install

# 3. Start in development mode
npm run dev
# → Backend: http://localhost:3080
# → Frontend: http://localhost:5173
```

### Using Docker

```bash
# Pull the image
docker pull xiebaiyuan/adguard-dns-latency:latest

# Run
docker run -d \
  --name adguard-dns-latency \
  -p 3080:3080 \
  -e ADGH_URL=http://192.168.8.88 \
  -e ADGH_USER=your_username \
  -e ADGH_PASSWD=your_password \
  -e ADGH_SKIP_VERIFY=true \
  xiebaiyuan/adguard-dns-latency:latest
```

Or use docker-compose (see [docker-compose.yml](docker-compose.yml)).

### Configure AdGuardHome Connection

Open `http://localhost:5173/` in your browser, click the ⚙️ gear icon in the toolbar, and fill in:

| Field | Value |
|-------|-------|
| URL | `http://192.168.8.97` (your AdGuardHome LAN address) |
| Username | AdGuardHome admin username |
| Password | AdGuardHome admin password |

Click "Refresh" to fetch data.

You can also preset defaults via `.env` file (see [.env.example](.env.example)).

### SSL / Self-Signed Certificates

See [SSL Certificate Guide](docs/SSL.md).

---

## Project Structure

```
adguard-dns-latency/
├── packages/
│   ├── server/                    # Fastify backend
│   │   └── src/
│   │       ├── analyze.ts         # Analysis engine (deep module)
│   │       ├── app.ts             # Fastify app + API routes
│   │       ├── index.ts           # Entry point
│   │       └── adguard/
│   │           ├── client.ts      # AdGuardHome API client
│   │           └── fetcher.ts     # Data fetching orchestrator
│   └── client/                    # React frontend SPA
│       └── src/
│           ├── components/        # UI components (dashboard / table / charts / config panel)
│           ├── hooks/             # Theme + data fetching hooks
│           └── lib/               # Type definitions + CSV export
├── shared/
│   └── types.ts                   # Shared types between frontend and backend
├── docs/
│   └── SSL.md                     # SSL certificate handling guide
├── .env.example                   # Environment variable template
├── Dockerfile                     # Multi-stage Docker build
├── docker-compose.yml             # Docker Compose configuration
└── package.json                   # npm workspaces monorepo config
```

## Development

```bash
# Run tests
npm test

# Build
npm run build

# Backend only
npm run dev -w @adgh/server

# Frontend only
npm run dev -w @adgh/dashboard

# Run backend tests with coverage
cd packages/server && npx vitest run --coverage
```

## Test Coverage

| Module | Tests |
|--------|-------|
| **Backend** (server) | **20** |
| ├ Analysis engine (percentile/cache/slow rate) | 8 |
| ├ AdGuardHome client (mock server) | 3 |
| ├ Data fetching orchestrator (mock server) | 1 |
| ├ API endpoints (Fastify inject) | 7 |
| └ API endpoints / refresh / config | 1 |
| **Frontend** (dashboard) | **18** |
| ├ CSV export | 4 |
| └ Format utilities (latency / timestamp / bytes) | 14 |
| **Total** | **38** |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ADGH_URL` | AdGuardHome server URL | — |
| `ADGH_USER` | AdGuardHome username | — |
| `ADGH_PASSWD` | AdGuardHome password | — |
| `ADGH_SKIP_VERIFY` | Skip SSL certificate verification | `false` |
| `PORT` | Server listen port | `3080` |
| `HOST` | Server listen address | `0.0.0.0` |

---

## License

MIT
