# AirPulse

**AI-Powered Environmental Intelligence, Monitoring & Prediction Platform**

AirPulse is an environmental intelligence platform focused on air pollution across India. It enables users to visualize pollution data on interactive maps, analyze historical trends, detect hotspots, receive IoT sensor data, and get short-term pollution predictions.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript (Vite), Leaflet, Recharts |
| Backend | Node.js + Express (JavaScript, ES Modules) |
| Database | PostgreSQL 18.6 with PostGIS 3.6.4 extension |
| ML Service | Python 3.10+ with XGBoost (Phase 3+) |
| Maps | Leaflet + OpenStreetMap (Phase 1) |
| Charts | Recharts (Phase 1) |
| IoT | ESP32 + PMS5003 + BME280 (Phase 2+) |

## Project Structure

```
AIRPULSE/
├── client/          # React frontend (Vite + TypeScript + Leaflet + Recharts)
├── server/          # Express backend (Node.js, JavaScript ES Modules)
├── database/        # SQL migrations and schema
│   ├── migrations/  # 001_init.sql, 002_phase1_core_schema.sql
│   └── schema.sql   # Cumulative schema reference
├── ml/              # Python ML service (Phase 3+)
├── iot/             # ESP32 sensor firmware (Phase 2+)
├── docs/            # Architecture & API documentation
├── .env.example     # Environment variable template
├── .gitignore       # Git ignore rules
├── PROJECT_RULES.md # Development rules & conventions
└── README.md        # This file
```

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** 9+
- **PostgreSQL** 15+ with **PostGIS** 3+ extension
- **Git**

### PostgreSQL / PostGIS Setup

1. Install PostgreSQL and PostGIS (via Homebrew on macOS: `brew install postgresql@18 postgis`)
2. Start PostgreSQL service: `brew services start postgresql@18`
3. Create the database:

```bash
createdb airpulse
```

4. Run migrations:

```bash
psql -d airpulse -f database/migrations/001_init.sql
psql -d airpulse -f database/migrations/002_phase1_core_schema.sql
```

## Environment Variables

Copy `.env.example` to `server/.env` and update values:

```bash
cp .env.example server/.env
```

| Variable | Description | Default |
|---|---|---|
| `NODE_ENV` | Environment mode | `development` |
| `PORT` | Express server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://<user>@localhost:5432/airpulse` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:5173` |
| `OPENAQ_API_KEY` | OpenAQ v3 API key (free at https://openaq.org/register) | `""` |
| `ML_SERVICE_URL` | Python ML service URL | `http://localhost:5001` |

## Local Development

### 1. Install dependencies

```bash
# Frontend
cd client && npm install

# Backend
cd server && npm install
```

### 2. Start the backend

```bash
cd server
npm run dev
```

The API server starts at `http://localhost:3001` (with `--watch` auto-reloading).

### 3. Start the frontend

```bash
cd client
npm run dev
```

The React app starts at `http://localhost:5173`.

### 4. Data Ingestion (OpenAQ India)

Once `OPENAQ_API_KEY` is added to `server/.env`:

```bash
cd server
npm run sync
```

### 5. Verify API Endpoints

- System status: `curl http://localhost:3001/api/v1/meta/status`
- Stations: `curl http://localhost:3001/api/v1/stations`
- Observations: `curl http://localhost:3001/api/v1/observations`
- Latest observations: `curl http://localhost:3001/api/v1/observations/latest`
- Station history: `curl "http://localhost:3001/api/v1/observations/history?station_id=1"`

## Development Rules

See [PROJECT_RULES.md](PROJECT_RULES.md) for the complete development rules, coding conventions, and architecture principles.

## Architecture

See [docs/architecture.md](docs/architecture.md) for the current system architecture.

## License

Academic project — B.Tech CSE (AI & Data Science)
