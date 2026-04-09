# EntryLogger Wiki

EntryLogger is a Flask-backed web app for logging secure-area server room visits. Staff tap their icon to record entry or exit, optionally attaching a reason and ticket number. All activity is stored in a local SQLite database and can be exported as CSV.

---

## Contents

| Page | Description |
|------|-------------|
| [Installation](Installation) | Setup from scratch, systemd service, venv |
| [Configuration](Configuration) | `staff.json`, `config.json`, `reasons.json` |
| [Usage Guide](Usage-Guide) | Day-to-day operation of the app |
| [API Reference](API-Reference) | All HTTP endpoints documented |
| [File Overview](File-Overview) | Every file in the project explained |
| [Sanitizing for Public Release](Sanitizing-for-Public-Release) | Removing personal data before publishing |

---

## Quick Start

```bash
cd /path/to/EntryLogger
chmod +x entrylog.sh
./entrylog.sh install
./entrylog.sh run
```

Then open `http://127.0.0.1:5000` in a browser.

---

## Screenshots

| Dashboard | Entry Reasons | Ticket Entry |
|-----------|---------------|--------------|
| ![Dashboard](https://raw.githubusercontent.com/ddziubanski/EntryLogger/main/docs/screenshots/sample-screen-1.png) | ![Entry Reasons](https://raw.githubusercontent.com/ddziubanski/EntryLogger/main/docs/screenshots/sample-screen-4.png) | ![Ticket Entry](https://raw.githubusercontent.com/ddziubanski/EntryLogger/main/docs/screenshots/sample-screen-5.png) |

---

## Key Features

- **Staff grid** — configurable icons and names via `staff.json`
- **Entry/Exit logging** — tap a card to toggle IN/OUT with reason + optional ticket
- **Real-time clock** — always-visible digital clock
- **Activity log** — filterable by date range; shows time-spent calculations
- **CSV export** — download a formatted report
- **Log archiving** — cleared logs are automatically archived to `archives/`
- **Report reminders** — visual countdown to next scheduled report
- **Fullscreen mode** — distraction-free dedicated-display option
- **Responsive design** — works on desktop and mobile
