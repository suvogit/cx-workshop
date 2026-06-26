# CX Leadership Workshop — H2 2026

Full-stack planning app: **HTML/CSS/JS → Express API → PostgreSQL**

## Stack

| Layer    | Tech                  |
|----------|-----------------------|
| Frontend | Plain HTML / CSS / JS |
| API      | Node.js + Express     |
| Database | PostgreSQL            |

## Project structure

```
cx-workshop/
├── server/
│   └── index.js          # Express server + all REST API routes
├── db/
│   ├── pool.js           # PostgreSQL connection pool
│   └── init.js           # Creates all tables + seed data
├── public/
│   └── index.html        # Frontend app (served statically)
├── .env.example          # Environment variable template
├── package.json
└── README.md
```

## Quick start

### 1. Prerequisites

- Node.js 18+
- PostgreSQL 14+

### 2. Clone / copy this folder, then install dependencies

```bash
npm install
```

### 3. Create your database

```sql
-- in psql:
CREATE DATABASE cx_workshop;
```

### 4. Set environment variables

```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials
```

```
PORT=3000
PGHOST=localhost
PGPORT=5432
PGDATABASE=cx_workshop
PGUSER=postgres
PGPASSWORD=your_password
```

### 5. Initialise the schema

```bash
npm run db:init
```

This creates 5 tables and seeds default DRI assignments and note sections.

### 6. Start the server

```bash
npm start
# or for development with auto-reload:
npm run dev
```

Open **http://localhost:3000** in your browser.

---

## API endpoints

| Method | Path                     | Description                  |
|--------|--------------------------|------------------------------|
| GET    | /api/health              | Database health check        |
| GET    | /api/roadmap             | Get all roadmap items        |
| POST   | /api/roadmap             | Add roadmap item             |
| PUT    | /api/roadmap/:id         | Update roadmap item          |
| DELETE | /api/roadmap/:id         | Delete roadmap item          |
| GET    | /api/actions             | Get all action items         |
| POST   | /api/actions             | Add action item              |
| PUT    | /api/actions/:id         | Update action item           |
| DELETE | /api/actions/:id         | Delete action item           |
| GET    | /api/metrics             | Get all metrics              |
| POST   | /api/metrics             | Add metric                   |
| PUT    | /api/metrics/:id         | Update metric                |
| DELETE | /api/metrics/:id         | Delete metric                |
| GET    | /api/dri                 | Get all DRI assignments      |
| PUT    | /api/dri/:pillar         | Update DRI for a pillar      |
| GET    | /api/notes               | Get all workshop notes       |
| PUT    | /api/notes/:section      | Save a notes section         |

---

## Database tables

| Table              | Description                              |
|--------------------|------------------------------------------|
| `roadmap_items`    | H2 roadmap cards (ws, phase, pillar…)   |
| `action_items`     | Action tracker (owner, status, due…)    |
| `metrics`          | KPIs with benchmarks and H2 targets     |
| `dri_assignments`  | Pillar → DRI mapping                    |
| `workshop_notes`   | Day 1/2/3 and parking lot notes         |

## Deployment

Works on any Node.js host with a PostgreSQL database:
- **Railway** — connect a Postgres plugin, set env vars, deploy
- **Render** — free tier supports both Node and Postgres
- **Heroku** — add the Heroku Postgres addon
- **Self-hosted** — any Linux server with Node + Postgres installed
