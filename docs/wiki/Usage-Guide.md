# Usage Guide

## Logging Entry or Exit

1. Open the app at `http://<server-ip>:5000`.
2. Tap a **staff card** on the left panel.
   - If the staff member is currently **OUT**, an entry reason modal opens.
   - If the staff member is currently **IN**, the exit is logged immediately.
3. Select a **reason** from the list (or tap **Other / Skip**).
4. Choose whether a **ticket number** is available:
   - Tap **Yes** → enter the 5-digit ticket number (submits automatically when 5 digits are entered).
   - Tap **No** → logs the entry without a ticket.

The activity log on the right updates immediately after each action.

---

## Staff Card Status Colors

| Color | Meaning |
|-------|---------|
| Red border | Staff member is currently **OUT** |
| Green border | Staff member is currently **IN** |
| Yellow/amber border | Staff member has been **IN for more than 2 hours** |

---

## Viewing the Activity Log

The **Activity Log** panel on the right shows entries in reverse chronological order.

- **No filter** — shows all current entries.
- **Start date / End date** — filter entries to a specific date range.
- **View Current** — opens a formatted table of the current log in a new browser tab.

Each log entry shows:
- Staff name, role, and icon
- Action (IN / OUT)
- Reason
- Ticket number (if provided)
- Timestamp
- Time spent (calculated for OUT entries with a matching IN entry)

---

## Report Reminder

The colored banner above the activity log shows days until the next scheduled report:

| Color | Days remaining |
|-------|---------------|
| 🟢 Green | > 30 days |
| 🟡 Yellow | 8–30 days |
| 🔴 Red | ≤ 7 days |

The report interval and last export date are configured in `config.json`. The date updates automatically when the log is cleared.

---

## Exporting as CSV

Click **Export CSV** in the activity log header. The browser will prompt you to save a `.csv` file named:

```
entrylogger-report-YYYY-MM-DD.csv
```

CSV columns: `Staff Name`, `Role`, `Action`, `Reason`, `Ticket`, `Timestamp`

---

## Clearing the Log

Click **Clear Log** and complete the 3-step confirmation:

1. First confirmation dialog.
2. Second confirmation dialog.
3. Type `CLEAR` in a text prompt.

On confirmation:
- The current `entry_log.db` is copied to `archives/entry_log_archive_<timestamp>.db`.
- All rows in the `logs` table are deleted.
- `lastExportDate` in `config.json` is updated to today's date.

---

## Fullscreen Mode

Click **Enter Full Screen** in the header to hide browser UI and use the app as a dedicated kiosk display. Click **Exit Full Screen** or press `Esc` to exit.

---

## Server IP Display

The header shows the server's local IP address (`Server IP: x.x.x.x`) for reference when accessing the app from other devices on the network.
