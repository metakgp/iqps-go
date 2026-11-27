# PYQ Portal – IIT Bhilai

Search, preview and upload previous year question papers (PYQs) at IIT Bhilai.
Students upload papers without logging in. Student admins sign in with GitHub, review each upload and approve it before it goes public.

This is a fork of **[IQPS by MetaKGP](https://github.com/metakgp/iqps-go)** (IIT Kharagpur), adapted for IIT Bhilai. It is licensed under **GPL-3.0** like the original, so it has to stay open source and keep the credit to MetaKGP. The original README is in [`docs/UPSTREAM_IQPS_README.md`](docs/UPSTREAM_IQPS_README.md).

## Features

| Feature | Where |
|---|---|
| Search by course code or name (full-text + fuzzy) | `/` |
| Filter by exam (Mid-Sem / End-Sem / Quiz), year, department, semester (Monsoon / Winter) | `/` |
| Upload up to 10 PDFs at once (15 MB each), no login | `/upload` |
| Auto-fill of course code, exam, year and semester from the PDF's first page (text layer first, OCR for scanned papers) | `/upload` |
| Admin review with GitHub login (allowlist of usernames) | `/admin` |
| Edit details, approve, delete (trash + restore), and see "similar papers" to catch duplicates | `/admin` |
| Optional Slack alert for new uploads | backend |

## What changed from IQPS

- **Course codes** use IIT Bhilai's format, `[A-Z]{2,3}\d{3}` (e.g. `CSL101`, `MAL201`), instead of KGP's `CS10001`.
- **Auto-fill parser** rewritten for IIT Bhilai paper headers (`frontend/src/utils/parseQPText.ts`, with unit tests). It reads `Quiz 1/2/I/II`, `Mid/End Semester`, `Monsoon/Winter 2023-24`, exam dates, and `Supplementary`, skips `Max Marks 100`-style false matches and fixes OCR `O`/`0` mix-ups. It reads the PDF's text layer before falling back to OCR, which is faster.
- **Labels:** semesters are shown as Monsoon/Winter and class tests as Quiz. The stored values are the same as upstream, so the database and API are unchanged.
- **Department filter**, worked out from the course-code prefix (no database change).
- **Upload limit** raised to 15 MB. The backend also checks that each file really is a PDF (`%PDF-` header), not just its content type.
- **Admin check**: usernames are matched case-insensitively and with spaces trimmed. If no GitHub org/team is configured, users outside the list get a clean "not an admin" instead of a GitHub API error.
- **Branding and URLs** are configurable (`FRONTEND_URL`, `VITE_REPO_URL`), and there are no hard-coded metakgp.org links.
- **Self-contained deployment** in [`deploy/`](deploy/): Postgres, backend and nginx in one `docker compose`, for the institute server.
- The KGP library crawler (`crawler/`) is unused and can be deleted.

All institute-specific settings live in **`frontend/src/utils/institute.ts`**: course-code regex, department prefixes, labels and max file size.

## Project structure

```
backend/                 Rust (axum + sqlx) API — search, upload, admin, GitHub OAuth
  src/routing/handlers.rs  endpoints (FILE_SIZE_LIMIT = 15 MiB)
  src/auth.rs              GitHub OAuth + admin allowlist
  src/db/queries.rs        SQL queries (INIT_DB = schema)
frontend/                React + Vite + TypeScript + SCSS
  src/utils/institute.ts   ← IIT Bhilai config (codes, departments, labels)
  src/utils/parseQPText.ts ← PDF text → course code / exam / year / semester
  src/utils/autofillData.ts  pdf.js text layer → OCR fallback
  src/data/courses.json    course code → name map (fill this, see below)
  scripts/csv-to-courses.mjs
deploy/                  docker-compose.yaml, nginx.conf, init.sql, .env.example
```

## Database

One table, `iqps` ([`deploy/init.sql`](deploy/init.sql)):

| column | notes |
|---|---|
| `id` | integer identity |
| `course_code`, `course_name` | full-text index + trigram index on name |
| `year` | year the exam was held |
| `semester` | `autumn` = Monsoon, `spring` = Winter |
| `exam` | `midsem`, `endsem`, `ct1` = Quiz 1, `ct2` = Quiz 2 |
| `note` | e.g. `Supplementary` |
| `filelink` | path of the PDF under the static folder |
| `approve_status`, `is_deleted` | pending = `false`/`false`; trash = `is_deleted = true` |
| `upload_timestamp`, `approved_by` | |

PDFs are stored on disk at `iqps/uploaded/unapproved/` and moved to `iqps/uploaded/approved/` on approval. nginx serves them directly.

## Step 1 — Add the IIT Bhilai course list

Auto-fill and the admin's course-name suggestions use `frontend/src/data/courses.json`, which starts empty. Get the course list from the academic office or ERP as a CSV with two columns:

```csv
course_code,course_name
CSL101,Data Structures
```

Then run:

```powershell
cd frontend
node scripts/csv-to-courses.mjs courses.csv
```

Also check the department prefixes in `frontend/src/utils/institute.ts` (`DEPARTMENTS`) against the real course codes.

## Step 2 — Create the GitHub login for admins

1. Go to GitHub → Settings → Developer settings → **GitHub Apps** → New GitHub App. This is what upstream IQPS uses.
2. Homepage URL: your frontend URL. **Callback URL: `<frontend URL>/oauth`**, e.g. `http://localhost:5173/oauth` for local work or `https://pyq.iitbhilai.ac.in/oauth` in production. You can add both.
3. No permissions are needed if you only use the username allowlist.
4. Generate a client secret. Copy the **Client ID** and **secret**.
5. Put the admins' GitHub usernames in `GH_ADMIN_USERNAMES`, comma-separated.

## Step 3 — Run locally

Requirements: Rust (stable), Node 20+, pnpm 9, Docker (for Postgres).

```powershell
# 1. Database
cd backend
cp .env.template .env        # fill DB_*, GH_*, JWT_SECRET; set DB_HOST=localhost
docker compose -f docker-compose.dev.yaml up -d
# load the schema
Get-Content ..\deploy\init.sql | docker compose -f docker-compose.dev.yaml exec -T database-dev psql -U <DB_USER> -d <DB_NAME>

# 2. Storage folders used by the backend (.env: STATIC_FILE_STORAGE_LOCATION=./static)
mkdir static\iqps\uploaded, static\library\qp

# 3. Backend (port 8080)
cargo run --bin iqps-backend

# 4. Static file server for PDFs (STATIC_FILES_URL=http://localhost:8081/), in a new terminal
cd backend\static; python -m http.server 8081

# 5. Frontend (port 5173), in a new terminal
cd frontend
pnpm install
# frontend/.env.development: VITE_BACKEND_URL=http://localhost:8080, VITE_GH_OAUTH_CLIENT_ID=<client id>
pnpm dev
```

Tests: `cd frontend; pnpm test`. This runs the auto-fill parser tests.

## Step 4 — Deploy on the institute server

Everything runs from [`deploy/`](deploy/) on one domain, e.g. `https://pyq.iitbhilai.ac.in`:

| Path | Served by |
|---|---|
| `/api/*` | Rust backend |
| `/iqps/*` | uploaded PDFs |
| `/*` | frontend build |

```bash
git clone https://github.com/<you>/iitbh-pyq.git && cd iitbh-pyq

# Frontend build (or host the frontend on Vercel instead — see below)
cd frontend
cat > .env.production <<'EOF'
VITE_BACKEND_URL=https://pyq.iitbhilai.ac.in/api
VITE_MAX_UPLOAD_LIMIT=10
VITE_GH_OAUTH_CLIENT_ID=<github client id>
VITE_REPO_URL=https://github.com/<you>/iitbh-pyq
EOF
pnpm install && pnpm build
cd ../deploy

cp .env.example .env     # fill passwords, GH_*, JWT_SECRET (openssl rand -hex 32), URLs
docker compose up -d --build
docker compose logs -f backend
```

The schema in `init.sql` loads automatically on the first start. PDFs and database data live in Docker volumes (`papers`, `pgdata`).

**HTTPS:** if the institute already has a reverse proxy or certificate, point it at this server's port `HTTP_PORT` (default 80). Otherwise add certbot/Caddy in front. GitHub login needs the exact HTTPS callback URL from Step 2.

**Backups (do this):**
```bash
docker compose exec db pg_dump -U iqps iqps > backup_$(date +%F).sql
docker run --rm -v deploy_papers:/data -v $PWD:/out alpine tar czf /out/papers_$(date +%F).tgz -C /data .
```

**Updating:** `git pull && (cd ../frontend && pnpm build) && docker compose up -d --build`.

### Option: frontend on Vercel, backend on the institute server

1. Import the repo in Vercel and set **Root Directory = `frontend`**. Framework is Vite, build `pnpm build`, output `dist`. `frontend/vercel.json` already handles SPA routing.
2. Add the env vars `VITE_BACKEND_URL=https://<server>/api`, `VITE_GH_OAUTH_CLIENT_ID` and `VITE_REPO_URL`.
3. On the server, add the Vercel URL to `CORS_ALLOWED_ORIGINS` and set `FRONTEND_URL` to it in `deploy/.env`. Then run `docker compose up -d`.
4. Add `https://<vercel-url>/oauth` as a callback URL in the GitHub App.

> If the institute server is only reachable on the campus network, Vercel users off campus won't be able to search. In that case serve everything from the institute server.

## Pulling updates from MetaKGP

```bash
git remote add upstream https://github.com/metakgp/iqps-go.git
git fetch upstream && git merge upstream/main
```

Most IIT Bhilai changes sit in new files (`institute.ts`, `parseQPText.ts`, `courses.ts`, `deploy/`), so merge conflicts should stay small.

## Credits & License

Based on [IQPS](https://github.com/metakgp/iqps-go) by [MetaKGP](https://metakgp.org), originally created by [Shubham Mishra](https://github.com/grapheo12). Licensed under [GPL-3.0](LICENSE).
