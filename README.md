# EntryLogger

I needed a quick log file foe entry, threw something together with AI.. Hopefully I  can save you some time.
Make it Yours!

A Flask-backed app for logging secure-area server room visits. 
## Quick Start

1. Install dependencies and app environment:
   ```bash
   cd /path/to/EntryLogger
   chmod +x entrylog.sh
   ./entrylog.sh install
   ```
2. Run the app:
   ```bash
   ./entrylog.sh run
   ```
3. Open `http://127.0.0.1:5000`.
4. Before pushing to a public repository, sanitize local data:
   ```bash
   chmod +x ./sanitize_for_public_repo.sh
   ./sanitize_for_public_repo.sh --yes
   ```

## Features

- **Staff Management**: Configurable staff icons for quick selection from `staff.json`
- **Entry/Exit Logging**: Tap a staff member to record entry or exit with predefined reasons
- **Real-time Clock**: Live digital clock display showing current time and date
- **Activity Monitoring**: Visual status indicators for staff currently in/out of the secure area
- **Time Tracking**: Automatic calculation of time spent in secure areas
- **Date Filtering**: Filter activity logs by date range or view current logs
- **Export Functionality**: Download activity reports as CSV files with save-as prompt
- **Log Archiving**: Automatic archiving of old logs when cleared, with triple confirmation
- **Report Reminders**: Configurable report due dates with visual warnings
- **Device Information**: Display server IP address for reference
- **Fullscreen Mode**: Distraction-free fullscreen interface for dedicated displays
- **Responsive Design**: Works on desktop and mobile devices

## Use

1. Install the app and dependencies:
   ```bash
   cd /path/to/EntryLogger
   chmod +x entrylog.sh
   ./entrylog.sh install
   ```
2. If you want the optional systemd service, run the installer as root:
   ```bash
   sudo ./entrylog.sh install
   ```
3. Run the server:
   ```bash
   ./entrylog.sh run
   ```
4. Open `http://127.0.0.1:5000` in a browser.
5. Tap a staff icon to log entry or exit.
6. Choose the reason for secure area access.
7. Use date filters to view specific time periods.
8. Click "View Current" to see logs in a formatted table.
9. Use "Export CSV" to download reports.
10. Use "Enter Full Screen" for dedicated display mode.

### Public repo sanitization

Before uploading to a public repository, run:

```bash
chmod +x ./sanitize_for_public_repo.sh
./sanitize_for_public_repo.sh
```

This script will:
- Randomize names in `staff.json`
- Clear the `logs` table in local SQLite databases
- Truncate all local CSV files in the repository

## Installer warnings & troubleshooting

- Before installation starts, the installer now runs a precheck that lists all Python dependencies from `requirements.txt` plus system prerequisites.
- The installer asks for one global `Continue with installation?` confirmation before making changes.
- On Debian-based systems, missing `python3`, `python3-venv`, and `python3-pip` are installed together with `apt` after that confirmation.
- If the virtual environment is incomplete, the script removes the broken `.venv` and recreates it.
- If dependency installation fails, the script prints a clear error with the failing package source.
- To install the optional systemd service, run the installer as root:
  ```bash
   sudo ./entrylog.sh install
  ```
- If `./entrylog.sh run` is used before installation, you may see:
  - `Virtual environment not found. Installing dependencies first...`

## Configuration

- **Staff Members**: Edit `staff.json` to add/remove staff and customize icons
- **Report Schedule**: Modify `config.json` to set report intervals and last export date
- **Reasons**: Update `reasons.json` for access reasons

## Notes

- The app stores data on the server in `entry_log.db`.
- Use the export button for reporting and the clear button to reset the log (requires triple confirmation).
- Cleared logs are automatically archived in the `archives/` folder.
- Fullscreen mode provides a clean interface by hiding header/footer elements.
- The clock updates in real-time and is always visible in the main interface.

## File Overview

- `entrylogger.py` - Flask backend with API endpoints for staff, logging, export, archiving, device IP, and report scheduling
- `templates/index.html` - Main web UI with staff grid, real-time clock, activity log, and fullscreen support
- `static/app.js` - Client-side logic for staff selection, logging, date filtering, CSV export, fullscreen mode, and clock updates
- `static/styles.css` - Responsive styling with dark theme, fullscreen transitions, and component layouts
- `staff.json` - Configurable staff member list with names, roles, and icons
- `config.json` - Report schedule configuration including intervals and last export tracking
- `requirements.txt` - Python dependencies for Flask, SQLite, and date handling
- `entrylog.sh` - Installation and runtime script for the app, including optional systemd service setup
- `archives/` - Directory containing archived log snapshots when database is reset
- `entry_log.db` - SQLite database storing current activity log entries
