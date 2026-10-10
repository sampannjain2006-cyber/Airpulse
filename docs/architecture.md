# AirPulse — Architecture (Phase 1)

## Overview

AirPulse uses a **modular monolith** architecture with a planned Python ML sidecar.

```
React SPA (Vite + TypeScript + Leaflet + Recharts)
       ↓ REST / JSON
Express API (Node.js, JavaScript ES Modules)
       ↓ SQL (pg)
PostgreSQL + PostGIS
       ↓ HTTP/JSON (Phase 3+)
Python ML Service (XGBoost)
```

## Current State (Phase 1 MVP Foundation)

### Components Implemented

| Component | Status | Technology |
|---|---|---|
| Frontend | ✅ Phase 1 MVP | Vite + React 19 + TypeScript, Leaflet (OSM), Recharts |
| Backend | ✅ Phase 1 API | Node.js + Express (ES Modules, layered architecture) |
| Database | ✅ Phase 1 Schema | PostgreSQL 18.6 with PostGIS 3.6.4 |
| Data Ingestion | ✅ Provider Framework | Extensible Provider Interface + OpenAQ v3 Adapter + Normalizer |
| ML Service | ⬜ Not started | Python (Phase 3) |
| IoT Firmware | ⬜ Not started | ESP32 (Phase 2) |

### API Endpoints (Phase 1)

| Method | Endpoint | Query Params | Purpose |
|---|---|---|---|
| GET | `/api/v1/meta/status` | — | System health: backend status, database connectivity, PostGIS version |
| GET | `/api/v1/stations` | `city`, `state`, `limit` | List all active monitoring stations in India |
| GET | `/api/v1/stations/:id` | — | Retrieve station details by ID or code |
| GET | `/api/v1/observations` | `station_id`, `from`, `to`, `limit` | Paginated environmental observations |
| GET | `/api/v1/observations/latest` | `city`, `limit` | Latest reading for each active station |
| GET | `/api/v1/observations/history` | `station_id` (required), `from`, `to`, `limit` | Historical readings for a station (chart series) |

### Data Ingestion Layer

- **Provider Abstraction** (`server/src/services/ingestion/providerInterface.js`): Standardized interface that all data sources (OpenAQ, CPCB, IoT) conform to.
- **Data Normalization & Validation**: Sanitizes numerical ranges, parses ISO timestamps, ensures source attribution, and returns consistent objects.
- **OpenAQ v3 Provider** (`server/src/services/ingestion/openaqProvider.js`): Fetches Indian monitoring stations and observations. Requires `OPENAQ_API_KEY` in `server/.env`. Safely skips ingestion if key is absent without generating fake data.
- **On-Demand Sync Job** (`server/src/jobs/syncJob.js`): Run via `npm run sync` to trigger station and observation ingestion.

### Database Schema (Phase 1)

- `system_info` — Health check & schema version tracker
- `monitoring_stations` — Reference station registry with PostGIS `geog` column (SRID 4326), spatial GIST index, and station metadata (city, state, country, source)
- `environmental_observations` — Time-series pollutant readings (`pm25`, `pm10`, `no2`, `so2`, `co`, `o3`, `aqi`, `temperature`, `humidity`, `pressure`, `source`, `ingested_at`, `recorded_at`) with unique constraint on `(station_id, recorded_at, source)` and composite indexes

### Frontend Architecture (Phase 1)

- **Dashboard Layout** (`client/src/pages/Dashboard.tsx`): 2-panel environmental intelligence view.
- **Header & City Filter**: Search input with instant filtering by city name.
- **Station List**: Left panel showing station cards with latest AQI badge, key pollutant values, and freshness indicators.
- **Interactive Map** (`client/src/components/MapView.tsx`): Leaflet + OpenStreetMap displaying station markers color-coded by NAAQI categories with interactive popups.
- **Station Details & Charts** (`client/src/components/charts/PollutantChart.tsx`): Recharts multi-line chart for historical PM2.5 and PM10 trends.
- **Honest States**: Clear, labeled notices for unconfigured data sources, empty chart data, and network errors.
