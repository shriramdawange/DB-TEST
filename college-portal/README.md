# College Students Record Portal

A complete CRUD web app for managing college student records.

* **Backend** — Node.js + Express REST API (`/api/students`) backed by **SQLite** (`better-sqlite3`).
* **Frontend** — plain HTML, CSS and vanilla JavaScript. No frameworks, no build step.
* **Database** — a single `students` table; the database file is created automatically on first run.

> **No database server required.** SQLite is a file-based database, so there is
> nothing to install, no credentials to configure and no service to keep running.

---

## Tech stack

| Layer      | Technology                                   |
| ---------- | -------------------------------------------- |
| Runtime    | Node.js 20+ (tested on Node 24)              |
| Server     | Express 4                                    |
| Database   | SQLite via `better-sqlite3` (synchronous)    |
| Env config | `dotenv` (`.env` in `backend/`)              |
| CORS       | `cors` package (wide open for this project)  |
| Frontend   | HTML5, CSS3, vanilla JS (`fetch`)            |

---

## Folder structure

```
college-portal/
├── backend/
│   ├── server.js          # Express app, middleware, error handler, boot
│   ├── db.js              # SQLite connection + schema bootstrap
│   ├── routes/
│   │   └── students.js    # CRUD routes for /api/students
│   ├── .env.example       # optional overrides (copy to .env)
│   ├── .gitignore
│   └── package.json
├── frontend/
│   ├── index.html         # student list (search, view, edit, delete)
│   ├── add.html           # add / edit form
│   ├── profile.html       # single student profile
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── api.js         # all fetch calls + API base URL config
│       ├── list.js
│       ├── form.js
│       └── profile.js
├── database/
│   └── schema.sql         # CREATE TABLE students (+ optional sample rows)
└── README.md
```

---

## Prerequisites

* **Node.js 20 or newer** — check with `node -v`
* **npm 10 or newer** — check with `npm -v`
* Nothing else. No MySQL, no database server.

---

## Setup (step by step)

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. (Optional) Configure the environment

Everything has a working default, so you can skip this step. To customise it:

**Windows (PowerShell):**

```powershell
cd backend
copy .env.example .env
notepad .env
```

**macOS / Linux:**

```bash
cd backend
cp .env.example .env
nano .env
```

```env
PORT=5000
DB_FILE=./data/college_portal.db   # relative paths resolve from backend/
SEED_DATA=true                     # false = skip the sample students
```

### 3. Start the API

```bash
npm start
```

(equivalently `node server.js`, or `npm run dev` to auto-restart on save.)

Expected output:

```
  College Students Record Portal - API
  ------------------------------------
  Server running at : http://localhost:5000
  Health check      : http://localhost:5000/api/health
  Frontend          : ../frontend/index.html

  [OK]   SQLite database ready: ...\backend\data\college_portal.db
  [OK]   Sample students loaded (set SEED_DATA=false to skip).
```

The database file, the `students` table and six sample students are created
automatically from `database/schema.sql` — there is no manual import step.

### 4. Serve the frontend

The frontend is static, so any static file server works. Recommended one-liner
(run it from the `college-portal` folder):

```bash
npx http-server frontend -p 3000
```

Then open <http://localhost:3000>.

> **Important:** use a server that serves the `.html` files **as they are**.
> `npx http-server` does that, while `npx serve` rewrites `profile.html?id=1`
> to `/profile` and **drops the query string**, which breaks the View/Edit
> links. If you prefer `serve`, disable that behaviour with a `serve.json`
> file containing `{ "cleanUrls": false }` and run
> `npx serve frontend -l 3000 -c serve.json`.

**Opening the files directly also works** — just double-click
`frontend/index.html`. The browser will treat the page origin as `file://` and
the API is called cross-origin, which works because the backend enables CORS
for every origin (`Access-Control-Allow-Origin: *`).

**CORS implications:** the backend allows all origins, which is convenient for
local development. If you deploy the app, restrict it to your real frontend
domain, e.g. `app.use(cors({ origin: 'https://your-domain.com' }))` in
`backend/server.js`.

If you change the API port, update the `API_BASE_URL` constant at the **top**
of `frontend/js/api.js` (default `http://localhost:5000`).

---

## API endpoints

Base URL: `http://localhost:5000`

| Method   | Endpoint              | Description                                            | Success | Errors                        |
| -------- | --------------------- | ------------------------------------------------------ | ------- | ----------------------------- |
| `GET`    | `/api/students`       | List all students. `?search=` filters by name/mobile  | 200     | 500                           |
| `GET`    | `/api/students/:id`   | Get one student by id                                 | 200     | 400, 404, 500                 |
| `POST`   | `/api/students`       | Create a student                                      | 201     | 400, 500                      |
| `PUT`    | `/api/students/:id`   | Update a student                                      | 200     | 400, 404, 500                 |
| `DELETE` | `/api/students/:id`   | Delete a student                                      | 200     | 400, 404, 500                 |
| `GET`    | `/api/health`         | Health check (reports database up/down)               | 200     | –                             |
| `GET`    | `/`                    | API banner with the list of endpoints                  | 200     | –                             |

### Request / response examples

**Create**

```bash
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -d '{"name":"Aarav Sharma","class_year":"FY","degree":"B.Tech CSE","mobile":"9876543210","email":"aarav@example.com"}'
```

```json
{
  "id": 1,
  "name": "Aarav Sharma",
  "class_year": "FY",
  "degree": "B.Tech CSE",
  "mobile": "9876543210",
  "email": "aarav@example.com",
  "profile_photo": null,
  "created_at": "2026-10-22T12:31:01.635Z"
}
```

**Search**

```bash
curl "http://localhost:5000/api/students?search=9876"
```

**Update**

```bash
curl -X PUT http://localhost:5000/api/students/1 \
  -H "Content-Type: application/json" \
  -d '{"name":"Aarav S.","class_year":"SY","degree":"B.Tech CSE","mobile":"9876543210"}'
```

**Delete**

```bash
curl -X DELETE http://localhost:5000/api/students/1
```

**Error shape** — every failure returns the same JSON envelope:

```json
{ "error": "Mobile number must be exactly 10 digits." }
```

Validation failures also include a per-field map so the form can highlight
the offending inputs:

```json
{
  "error": "Name is required.",
  "errors": { "name": "Name is required." }
}
```

### Validation rules

| Field           | Required | Rules                                             |
| --------------- | -------- | ------------------------------------------------- |
| `name`          | yes      | string, max 100 characters                        |
| `class_year`    | yes      | one of `FY`, `SY`, `TY`, `LY`                     |
| `degree`        | yes      | string, max 100 characters                        |
| `mobile`        | yes      | exactly 10 digits, unique across all students    |
| `email`         | no       | valid email format, max 100 characters            |
| `profile_photo` | no       | max 255 characters                                |

### Status codes

* `200` — read / update / delete succeeded
* `201` — student created
* `400` — validation failed, bad id, or duplicate mobile number
* `404` — student (or route) not found
* `500` — unexpected server error (details are logged on the server)

---

## Database

The table lives in `database/schema.sql` and is applied automatically at
startup:

```sql
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(100) NOT NULL,
  class_year VARCHAR(50) NOT NULL,
  degree VARCHAR(100) NOT NULL,
  mobile VARCHAR(15) NOT NULL UNIQUE,
  email VARCHAR(100) NULL,
  profile_photo VARCHAR(255) NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
```

To inspect the data with the SQLite CLI:

```bash
sqlite3 backend/data/college_portal.db "SELECT * FROM students;"
```

To start from an empty database, stop the server and delete the file:

```bash
del backend\data\college_portal.db      # Windows
rm backend/data/college_portal.db        # macOS / Linux
```

---

## Security notes

* All SQL uses **parameterized queries** (`?` placeholders) — no string interpolation.
* Column names in the dynamic `UPDATE` come from a hard-coded whitelist.
* The frontend renders student data with `textContent`, never `innerHTML`,
  so stored data cannot inject scripts.
* The database file lives in `backend/data/` and is git-ignored.
* `.env` is git-ignored as well; `.env.example` contains no secrets.

---

## Troubleshooting

| Problem                                    | Fix                                                                        |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| `Cannot reach the API` in the browser      | Backend not running, or `API_BASE_URL` in `frontend/js/api.js` is wrong.   |
| `Could not locate the bindings file`       | `better-sqlite3` did not build. Re-run `npm install` in `backend/`, then `npm rebuild better-sqlite3`. |
| `npm ERR! ... prebuild-install`            | No prebuilt binary for your Node version. Install the "Desktop development with C++" build tools, or use Node 20/22/24 where prebuilds exist. |
| `SQLITE_CANTOPEN`                          | The folder for `DB_FILE` is not writable — check `DB_FILE` in `backend/.env`. |
| `SQLITE_CONSTRAINT_UNIQUE` / duplicate      | That mobile number is already registered — the API turns this into a 400 with a clear message. |
| View/Edit links lose the student            | Your static server rewrites `.html` URLs and drops the query string. Use `npx http-server frontend -p 3000` instead of `npx serve`. |
| Port 5000 already in use                   | Change `PORT` in `backend/.env` and update `API_BASE_URL` to match.         |

---

## License

MIT — free to use for coursework, labs and demos.
