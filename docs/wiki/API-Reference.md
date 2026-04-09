# API Reference

All endpoints are served by the Flask backend (`entrylogger.py`) and return JSON unless otherwise noted.

Base URL: `http://<server-ip>:5000`

---

## `GET /`

Returns the main HTML web UI.

---

## `GET /api/staff`

Returns the list of staff members loaded from `staff.json`.

**Response**
```json
[
  { "id": 1, "name": "Mason Hart", "role": "Director", "icon": "🧑‍💼" },
  { "id": 2, "name": "Riley Chen", "role": "Network Manager", "icon": "🧑‍💻" }
]
```

---

## `GET /api/reasons`

Returns the list of selectable entry reasons loaded from `reasons.json`.

**Response**
```json
["Server maintenance", "Hardware replacement", "Security inspection", "Critical patch deployment", "Emergency troubleshooting"]
```

---

## `GET /api/device-ip`

Returns the server's local IP address.

**Response**
```json
{ "deviceIp": "192.168.1.10" }
```

---

## `GET /api/next-report`

Returns report scheduling details.

**Response**
```json
{
  "daysUntilReport": 87,
  "lastExportDate": "2026-04-07",
  "reportIntervalDays": 90
}
```

---

## `GET /api/log`

Returns all log entries, newest first. Optionally filtered by date range.

**Query Parameters**

| Parameter | Format | Description |
|-----------|--------|-------------|
| `startDate` | `YYYY-MM-DD` | Include entries on or after this date |
| `endDate` | `YYYY-MM-DD` | Include entries on or before this date |

**Response**
```json
[
  {
    "id": 1,
    "staffId": 2,
    "staffName": "Riley Chen",
    "staffRole": "Network Manager",
    "icon": "🧑‍💻",
    "action": "IN",
    "reason": "Patch deployment",
    "ticket": "23456",
    "timestamp": "2026-04-08T22:30:00.000000"
  }
]
```

---

## `POST /api/log`

Records a new entry or exit event.

**Request Body (JSON)**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `staffId` | integer | ✅ | ID of the staff member |
| `action` | string | ✅ | `"IN"` or `"OUT"` |
| `reason` | string | ✅ | Reason for access |
| `ticket` | string | ❌ | 5-digit ticket number (digits only) |
| `timestamp` | string | ❌ | ISO 8601 timestamp; defaults to current UTC time |

**Response**
```json
{ "status": "ok" }
```

**Error Responses**

| Code | Condition |
|------|-----------|
| `400` | Missing fields, invalid action, or invalid ticket format |
| `404` | `staffId` not found in `staff.json` |

---

## `DELETE /api/log`

Clears all log entries. Automatically archives the current database before clearing and updates `lastExportDate` in `config.json`.

**Response**
```json
{ "status": "ok", "message": "Log cleared and archived to entry_log_archive_20260408_120000.db" }
```

**Error Response**

| Code | Condition |
|------|-----------|
| `500` | Archive or delete failed |

---

## `GET /api/export`

Returns all log entries as a downloadable CSV file.

**Response Headers**
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename=entrylogger-report-2026-04-08.csv
```

**CSV Columns**

`Staff Name`, `Role`, `Action`, `Reason`, `Ticket`, `Timestamp`
