# AIRPULSE — Project Rules

> Permanent development rules, architecture principles, coding conventions, and constraints.
> Every contributor and every AI assistant must follow these rules throughout the project lifecycle.

---

## Architecture Principles

1. **Modular Monolith.** The backend is a single Express server with clear internal module boundaries. Do not split into microservices.

2. **ML Sidecar.** The Python ML component runs as a separate HTTP service. The Express backend calls it via HTTP/JSON. The ML service does not serve the frontend directly.

3. **Single Database.** PostgreSQL + PostGIS is the only database. Do not introduce Redis, MongoDB, or other data stores unless a specific, documented need arises.

4. **API-First.** The frontend communicates with the backend exclusively through REST API endpoints. No server-side rendering, no template engines, no shared state.

5. **API Versioning.** All endpoints are prefixed with `/api/v1/`. Never expose unversioned endpoints.

6. **Graceful Degradation.** If the ML service, an external API, or the IoT device is unavailable, the application must still function. Show cached data or "unavailable" messages — never crash.

7. **Deployment-Ready Structure.** Frontend, backend, and ML service are structured as independently deployable units from the start. Actual deployment happens in Phase 5.

---

## Resolved Design Decisions

These decisions are final unless explicitly revised through a documented decision:

| Decision | Resolution |
|---|---|
| **Geographic scope** | India-wide. Architecture supports all of India; data is only populated from real sources. No fake data for unpopulated locations. |
| **Chart library** | Recharts exclusively. Used for all charts — AQI trends, PM2.5/PM10 history, comparisons, predictions, environmental indicators. No Chart.js or other libraries. |
| **ML approach** | XGBoost as initial model for short-term PM2.5 forecasting. Modular architecture allows LSTM evaluation later. XGBoost is the practical starting point, not claimed as inherently superior. |
| **Deployment** | Cloud deployment planned. Development happens locally first. Deployment is Phase 5. |

---

## Technology Constraints

| Layer | Technology | Non-Negotiable |
|---|---|---|
| Frontend | React + TypeScript + Vite | Yes |
| Backend | Node.js + Express (JavaScript) | Yes |
| Database | PostgreSQL 15+ with PostGIS 3+ | Yes |
| ML | Python 3.10+ (Flask or FastAPI), XGBoost initial | Yes |
| Maps | Leaflet + OpenStreetMap | Yes |
| Charts | Recharts (exclusively) | Yes |
| IoT | ESP32 + PMS5003 + BME280 | Yes |
| ORM | None. Use `pg` (node-postgres) directly | Yes |

---

## Coding Conventions

### Frontend (TypeScript)

- **No `any` type.** Define explicit interfaces for all API responses, component props, and state.
- **Centralized API layer.** All backend calls go through `client/src/api/`. No direct `fetch` or `axios` calls in components.
- **Components are functional.** Use hooks, not class components.
- **File naming:** `PascalCase` for components (`StationCard.tsx`), `camelCase` for utilities (`formatAqi.ts`).
- **One component per file.** Small helper components co-located with their parent are acceptable.

### Charts (Recharts)

- **Reusable chart components only.** Build chart wrappers in `client/src/components/charts/` that accept data via props. Never inline chart configuration in page components.
- **Consistent styling.** All charts share a common color palette, tooltip format, and axis styling defined in a chart theme/config file.
- **Recharts for everything.** Use Recharts for all visualizations: PM2.5 trends, PM10 trends, AQI history, location comparisons, prediction charts, environmental indicator charts. Do not mix in Chart.js or other charting libraries.

### Backend (JavaScript)

- **Layered architecture:** `routes/ → controllers/ → services/ → models/`
  - **Routes:** Define URL patterns and attach controllers. No logic.
  - **Controllers:** Parse request, call service, send response. Minimal logic.
  - **Services:** Business logic. Orchestrate model calls, external API calls, validation.
  - **Models:** Database queries only. Return plain objects. No HTTP concepts.
- **Parameterized queries only.** Never concatenate user input into SQL strings.
- **ES Modules.** Use `import/export`, not `require/module.exports`.
- **File naming:** `camelCase` for all files (`pollutionController.js`).
- **Error handling:** Throw errors in services; catch in controllers or the global error middleware.

### Python ML

- **Virtual environment required.** Use `venv` or `conda`. Never install packages globally.
- **Dependency pinning.** `requirements.txt` must specify exact versions.
- **Separate training from serving.** Training scripts live in `ml/app/training/`. The Flask/FastAPI app loads pre-trained models and serves predictions.
- **Model versioning.** Every trained model is versioned (e.g., `xgboost_pm25_v1.joblib`). The serving layer reads from a model registry to determine which model to load.
- **Modular model architecture.** The prediction interface is model-agnostic — XGBoost can be swapped for LSTM or another model without changing the API contract.
- **Honest model claims.** XGBoost is the initial practical choice. Never claim it is inherently superior to LSTM or other approaches in documentation or UI text.

### Database

- **Migrations are versioned.** Every schema change goes through a numbered migration file in `database/migrations/`.
- **No manual schema edits.** Never modify the production schema directly; always create a migration.
- **Use PostGIS types** for any geographic data (station locations, sensor positions).
- **Timestamp columns** use `TIMESTAMPTZ` (timezone-aware).
- **India-aware schema.** Stations include `city`, `state`, and `country` fields. Default country is `'IN'`.

---

## Data Rules

### India-Wide Scope

- The application supports all of India geographically.
- Data is populated **only from real sources** (OpenAQ India, CPCB, OpenWeather, IoT sensors).
- **Never generate fake data** for Indian locations that lack real monitoring stations.
- The architecture allows adding new Indian locations/data sources without schema or API changes.
- Seed data should use real Indian station metadata from public APIs.

### Data Integrity

1. **Never fabricate data.** If data is unavailable, display "Data unavailable" or "—". Never generate synthetic data and present it as real.

2. **Never present fake functionality.** If a feature is not implemented, do not show a UI for it. Disable it or hide it.

3. **Record provenance.** Every data record must include:
   - `source` — where it came from (API name, IoT device ID)
   - `ingested_at` — when it was stored
   - `recorded_at` — when the measurement was actually taken

4. **Validate all external data.** Apply range checks, type checks, and schema validation to every reading from APIs and IoT devices.

5. **Idempotent ingestion.** Re-ingesting the same data must not create duplicates. Use `ON CONFLICT` / upsert patterns.

---

## Presentation Honesty Rules

1. **Predictions are not facts.**
   - Always display with a confidence level or range.
   - Use language: "Predicted", "Estimated", "Based on historical patterns".
   - Never say "PM2.5 will be X". Say "PM2.5 is predicted to be approximately X".

2. **Correlations are not causation.**
   - Environmental factors are "possible contributing factors" or "associated with", not "caused by".
   - Example: "High humidity may be associated with elevated PM2.5 levels" — not "Humidity causes high PM2.5".

3. **IoT data is prototype-grade.**
   - Always label IoT readings with "Prototype Sensor" or "Local Sensor" badge.
   - Never display IoT readings alongside reference station data without a clear visual distinction.
   - Where possible, show a comparison with the nearest reference station.

4. **Data freshness must be visible.**
   - Show "Last updated: X minutes ago" on all data displays.
   - Mark stale data (>2 hours old) with a visual indicator.

5. **ML model claims must be honest.**
   - Do not claim XGBoost is inherently superior to other approaches.
   - Present it as the "initial prediction model" or "current model", not "the best model".

---

## What We Do NOT Build

These are explicitly out of scope unless a documented decision changes this:

- ❌ User authentication / authorization / login
- ❌ Payment processing
- ❌ Admin panel / CMS
- ❌ Mobile app (responsive web only)
- ❌ WebSocket real-time streaming (use polling)
- ❌ Multi-tenant architecture
- ❌ Email/SMS notifications
- ❌ Social features (comments, sharing, profiles)
- ❌ Microservices architecture
- ❌ Container orchestration (Kubernetes, Docker Swarm)
- ❌ Fake data for unpopulated Indian locations
- ❌ Multiple charting libraries (Recharts only)

---

## Environment & Configuration

- All configuration goes in `.env` files (never committed to git).
- `.env.example` documents every required variable with dummy values.
- Use environment-specific API URLs (local dev vs. cloud production).
- Required variables:
  - `DATABASE_URL` — PostgreSQL connection string (works for both local and cloud)
  - `PORT` — Express server port
  - `ML_SERVICE_URL` — Python ML service base URL
  - `OPENAQ_API_KEY` — if required by OpenAQ
  - `OPENWEATHER_API_KEY` — for weather data
  - `IOT_DEVICE_KEYS` — comma-separated list of valid device keys
  - `NODE_ENV` — `development` or `production`
  - `CORS_ORIGIN` — allowed frontend origin (production only)

---

## Git Conventions

- **Branch naming:** `feature/<name>`, `fix/<name>`, `refactor/<name>`
- **Commit messages:** Present tense, imperative mood. Example: "Add pollution history endpoint", not "Added pollution history endpoint".
- **Never commit:** `.env`, `node_modules/`, `__pycache__/`, `.joblib` model files, IDE config files.

---

## Development Workflow

1. **Phase 0 first.** Do not write features until the scaffold is verified end-to-end (React → Express → PostgreSQL → response renders in browser).
2. **MVP before advanced features.** Complete all Phase 1 features before starting IoT, ML, or advanced analytics.
3. **Backend before frontend.** For each feature, build and test the API endpoint first, then build the UI that consumes it.
4. **Test with real data.** Use actual OpenAQ India data as early as possible. Seed scripts should pull real Indian station metadata, not lorem ipsum.
5. **Local first, deploy later.** The entire application must work correctly in local development before any cloud deployment (Phase 5).

---

## Phase Order

| Phase | Focus | Prerequisite |
|---|---|---|
| Phase 0 | Foundation & scaffold | — |
| Phase 1 | MVP core (map, AQI, charts, search) | Phase 0 verified |
| Phase 2 | IoT + alerts + comparisons | Phase 1 complete |
| Phase 3 | ML predictions (XGBoost) + context | Phase 2 complete, historical data accumulated |
| Phase 4 | Polish + advanced features + optional LSTM evaluation | Phase 3 complete |
| Phase 5 | Cloud deployment | All features stable |

---

*This document is the project's source of truth for development rules. Update it only through a deliberate decision, not by accident.*
