# Configuration

EntryLogger is configured through three JSON files in the project root.

---

## `staff.json`

Defines the staff members shown on the grid.

```json
[
  {
    "id": 1,
    "name": "Mason Hart",
    "role": "Director",
    "icon": "🧑‍💼"
  },
  {
    "id": 2,
    "name": "Riley Chen",
    "role": "Network Manager",
    "icon": "🧑‍💻"
  }
]
```

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Unique staff identifier. Must be unique across all entries. |
| `name` | string | Display name shown on the staff card. |
| `role` | string | Job title shown below the name. |
| `icon` | string | Emoji or Unicode character shown as the staff avatar. |

**To add a staff member:** append a new object with the next available `id`.  
**To remove a staff member:** delete their object. Existing log entries for that ID are preserved in the database.

> **Note:** The app reloads `staff.json` at startup. Restart the server after changes.

---

## `config.json`

Controls the report scheduling reminder.

```json
{
  "lastExportDate": "2026-04-07",
  "reportIntervalDays": 90
}
```

| Field | Type | Description |
|-------|------|-------------|
| `lastExportDate` | string (YYYY-MM-DD) | Date of last CSV export. Updated automatically when the log is cleared. |
| `reportIntervalDays` | integer | Number of days between required reports. Default: `90`. |

The activity log panel shows a countdown banner:
- **Green** — more than 30 days until report
- **Yellow** — 8–30 days remaining
- **Red** — 7 or fewer days remaining

---

## `reasons.json`

Lists the selectable reasons shown in the entry modal.

```json
[
  "Server maintenance",
  "Hardware replacement",
  "Security inspection",
  "Critical patch deployment",
  "Emergency troubleshooting"
]
```

- Add or remove reason strings freely.
- Order in the file matches order in the UI.
- Users can also tap **Other / Skip** to bypass reason selection.
- Reasons are loaded at startup; restart the server after changes.
