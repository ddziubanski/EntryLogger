# Installation

## Requirements

- Python 3.9+
- `python3-venv` and `python3-pip`
- A Debian/Ubuntu-based OS (for automatic dependency installation)
- `systemd` (optional, for service setup)

---

## Install

```bash
cd /path/to/EntryLogger
chmod +x entrylog.sh
./entrylog.sh install
```

The installer will:

1. Run a **precheck** that lists all Python dependencies from `requirements.txt` plus system prerequisites.
2. Show a single **"Continue with installation?" [Y/n]** prompt before making any changes.
3. Install missing Debian packages (`python3`, `python3-venv`, `python3-pip`) via `apt` if needed.
4. Create a Python virtual environment in `.venv/`.
5. Install Python packages from `requirements.txt`.

### Python dependencies (`requirements.txt`)

| Package | Purpose |
|---------|---------|
| `Flask>=2.2` | Web framework and routing |
| `gunicorn>=21.0` | Production WSGI server |

---

## Run

```bash
./entrylog.sh run
```

This activates the virtual environment and starts gunicorn on `0.0.0.0:5000`.

Access the app at `http://127.0.0.1:5000` or `http://<server-ip>:5000`.

---

## Optional: Systemd Service

To have EntryLogger start automatically at system boot, run the installer as root:

```bash
sudo ./entrylog.sh install
```

This creates a systemd service at `/etc/systemd/system/entrylogger.service`.

Manage it with:

```bash
sudo systemctl start entrylogger.service
sudo systemctl stop entrylogger.service
sudo systemctl status entrylogger.service
sudo journalctl -u entrylogger.service -f
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `python3` not found | On Debian/Ubuntu: `sudo apt install python3` |
| `venv` module missing | `sudo apt install python3-venv` |
| `pip` missing | `sudo apt install python3-pip` |
| Broken `.venv` | Delete `.venv/` and re-run `./entrylog.sh install` |
| Port 5000 already in use | Stop the existing process: `sudo lsof -ti:5000 \| xargs kill` |
| `./entrylog.sh run` before install | Runs install automatically, then starts the app |
