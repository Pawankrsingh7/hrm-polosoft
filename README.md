# HRM Polosoft Onboarding

Single-page onboarding form (`index.html`) with a Node.js/Express API and PostgreSQL storage.

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and set either:
- `DATABASE_URL=postgresql://...`
- or `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`

3. Start server:

```bash
npm start
```

4. Open:
- `http://localhost:10000` (or your `PORT`)
- Health check: `http://localhost:10000/api/health`

## API

- `POST /api/onboarding/submit`
  - Body shape:
  ```json
  {
    "data": { "personal": {}, "address": {}, "identification": {}, "education": [], "experience": [], "other": {} },
    "files": 0
  }
  ```
- `GET /api/onboarding/submissions`

## Admin

- Login page: `/admin/login`
- Dashboard: `/admin`
- Default credentials:
  - Username: `admin`
  - Password: `admin@108`

Admin APIs (authenticated by secure cookie after login):
- `POST /api/admin/login`
- `POST /api/admin/logout`
- `GET /api/admin/submissions?status=all|pending|verified`
- `PATCH /api/admin/submissions/:id/status` with `{ "status": "Pending" | "Verified" }`

## Database

Table created automatically on startup:
- `onboarding_submissions`
  - `id`, `employee_id`, `full_name`, `contact_number`, `personal_email`, `company_email`, `aadhar_number`, `status`, `has_experience`, `files_count`, `payload` (`jsonb`), `created_at`

## Render deployment

1. Push repo to GitHub.
2. In Render, create:
- `PostgreSQL` service
- `Web Service` from this repo
3. Web Service settings:
- Build command: `npm install`
- Start command: `npm start`
4. Env vars on Web Service:
- `DATABASE_URL` = External Database URL from your Render Postgres
- `NODE_ENV` = `production`

This project serves both frontend and API from the same Express service.
