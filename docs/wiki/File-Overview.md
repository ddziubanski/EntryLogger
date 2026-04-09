# File Overview

```
EntryLogger/
├── entrylogger.py          # Flask backend
├── entrylog.sh             # Install & run script
├── sanitize_for_public_repo.sh  # Pre-publish data cleaner
├── requirements.txt        # Python dependencies
├── staff.json              # Staff member definitions
├── config.json             # Report schedule settings
├── reasons.json            # Entry reason list
├── entry_log.db            # SQLite database (runtime, not committed)
├── templates/
│   └── index.html          # Main web UI
├── static/
│   ├── app.js              # Client-side logic
│   └── styles.css          # Styling
├── archives/               # Archived database snapshots
└── docs/
    └── screenshots/        # UI screenshots
```

---

## `entrylogger.py`

The Flask application and all backend logic.

| Component | Description |
|-----------|-------------|
| `init_db()` | Creates the `logs` table on startup; adds `ticket` column if missing |
| `load_staff_list()` | Reads `staff.json` |
| `load_reasons()` | Reads `reasons.json` |
| `load_config()` | Reads `config.json` |
| `GET /api/staff` | Returns staff list |
| `GET /api/reasons` | Returns reasons list |
| `GET /api/device-ip` | Returns server LAN IP |
| `GET /api/next-report` | Returns report countdown |
| `GET /api/log` | Returns log entries (with optional date filter) |
| `POST /api/log` | Inserts a new log entry |
| `DELETE /api/log` | Archives + clears the log |
| `GET /api/export` | Returns log as CSV download |

---

## `entrylog.sh`

Bash script with two commands:

| Command | Action |
|---------|--------|
| `./entrylog.sh install` | Runs precheck, installs prerequisites, creates venv, installs Python deps, optionally installs systemd service (when run as root) |
| `./entrylog.sh run` | Activates venv and starts gunicorn on port 5000 |

---

## `sanitize_for_public_repo.sh`

Removes personal/operational data before publishing to a public git repository.

| Action | Detail |
|--------|--------|
| Randomizes names | Rewrites `staff.json` with generated placeholder names |
| Clears logs | Deletes all rows from `logs` table in every `.db` file found |
| Truncates CSVs | Empties all `.csv` files in the repo |

Supports `--dry-run` (preview without changes) and `--yes` (skip prompt).

---

## `templates/index.html`

The single-page web UI. All dynamic content is injected by `app.js` via API calls. Key sections:

- `.hero` — page header with title and fullscreen button
- `.staff-panel` — staff grid
- `.clock-panel` — real-time digital clock
- `.history-panel` — activity log with date filters and export/clear buttons
- `#reasonModal` — overlay for selecting entry reason
- `#ticketModal` — overlay for entering a ticket number

---

## `static/app.js`

Client-side application logic. Responsibilities:

- Fetch staff, reasons, log, report data, and device IP from the API on load
- Render staff cards with dynamic IN/OUT/long-entry status colors
- Handle staff card clicks → trigger reason modal → ticket modal → POST log entry
- Render activity log entries with time-spent calculations
- Date filter interactions
- CSV export via Fetch API + `showSaveFilePicker` / fallback `<a download>`
- Log clear with 3-step confirmation
- Report reminder banner with dynamic colors
- Real-time clock updating every second
- Fullscreen mode toggle

---

## `static/styles.css`

Responsive dark-theme stylesheet. Key classes:

| Class | Purpose |
|-------|---------|
| `.hero` | Page header section |
| `.staff-grid` | CSS grid layout for staff cards |
| `.staff-card` | Individual staff button |
| `.staff-in` | Green border — staff is IN |
| `.staff-out` | Red border — staff is OUT |
| `.staff-long-entry` | Amber border — IN > 2 hours |
| `.clock-display` | Real-time clock widget |
| `.log-entry` | Individual activity log card |
| `.modal` | Overlay modal container |
| `fullscreen-mode` | Body class applied in fullscreen; hides header/footer |
| `.page-footer` | Footer bar |

---

## `entry_log.db`

SQLite database. Created automatically on first run. Contains one table:

**`logs`**

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment row ID |
| `staffId` | INTEGER | References staff member ID |
| `staffName` | TEXT | Name at time of log |
| `staffRole` | TEXT | Role at time of log |
| `icon` | TEXT | Emoji icon at time of log |
| `action` | TEXT | `"IN"` or `"OUT"` |
| `reason` | TEXT | Selected reason |
| `ticket` | TEXT | 5-digit ticket number or empty |
| `timestamp` | TEXT | ISO 8601 UTC timestamp |

> Names, roles, and icons are stored at log time so historical records remain accurate even if `staff.json` changes.

---

## `archives/`

Snapshots of `entry_log.db` created automatically when the log is cleared. Named:

```
entry_log_archive_YYYYMMDD_HHMMSS.db
```

These files are excluded from git via `.gitignore`.
