import csv
import json
import os
import socket
import sqlite3
from datetime import datetime, timedelta
import flask
from flask import Flask, jsonify, make_response, render_template, request
import shutil

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "entry_log.db")
STAFF_CONFIG_PATH = os.path.join(BASE_DIR, "staff.json")
REASONS_PATH = os.path.join(BASE_DIR, "reasons.json")
CONFIG_PATH = os.path.join(BASE_DIR, "config.json")
ARCHIVE_DIR = os.path.join(BASE_DIR, "archives")

app = Flask(__name__, static_folder="static", template_folder="templates")

if not os.path.exists(ARCHIVE_DIR):
    os.makedirs(ARCHIVE_DIR)

def load_staff_list():
    try:
        with open(STAFF_CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except json.JSONDecodeError:
        return []

def load_config():
    try:
        with open(CONFIG_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {"lastExportDate": str(datetime.utcnow().date()), "reportIntervalDays": 90}
    except json.JSONDecodeError:
        return {"lastExportDate": str(datetime.utcnow().date()), "reportIntervalDays": 90}


def load_reasons():
    try:
        with open(REASONS_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except (FileNotFoundError, json.JSONDecodeError):
        pass
    return [
        "Server maintenance",
        "Hardware replacement",
        "Security inspection",
        "Critical patch deployment",
        "Emergency troubleshooting",
    ]


def get_days_until_report():
    config = load_config()
    last_export = datetime.strptime(config.get("lastExportDate", str(datetime.utcnow().date())), "%Y-%m-%d")
    interval = config.get("reportIntervalDays", 90)
    next_report = last_export + timedelta(days=interval)
    days_remaining = (next_report - datetime.utcnow()).days
    return max(0, days_remaining)

STAFF_LIST = load_staff_list()
REASONS = load_reasons()

SQL_CREATE_LOG_TABLE = """
CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    staffId INTEGER NOT NULL,
    staffName TEXT NOT NULL,
    staffRole TEXT NOT NULL,
    icon TEXT NOT NULL,
    action TEXT NOT NULL,
    reason TEXT NOT NULL,
    ticket TEXT,
    timestamp TEXT NOT NULL
)
"""


def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db_connection() as conn:
        conn.execute(SQL_CREATE_LOG_TABLE)
        conn.commit()
        columns = conn.execute("PRAGMA table_info(logs)").fetchall()
        if not any(col[1] == "ticket" for col in columns):
            conn.execute("ALTER TABLE logs ADD COLUMN ticket TEXT")
            conn.commit()


init_db()


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/staff")
def api_staff():
    return jsonify(STAFF_LIST)


@app.route("/api/reasons")
def api_reasons():
    return jsonify(REASONS)


@app.route("/api/next-report")
def api_next_report():
    days_until = get_days_until_report()
    config = load_config()
    return jsonify({
        "daysUntilReport": days_until,
        "lastExportDate": config.get("lastExportDate"),
        "reportIntervalDays": config.get("reportIntervalDays", 90)
    })


def get_device_ip():
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return s.getsockname()[0]
    except OSError:
        return request.host.split(":")[0]


@app.route("/api/device-ip")
def api_device_ip():
    return jsonify({"deviceIp": get_device_ip()})


@app.route("/api/log", methods=["GET", "POST", "DELETE"])
def api_log():
    if request.method == "GET":
        start_date = request.args.get("startDate")
        end_date = request.args.get("endDate")
        try:
            start_date = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else None
            end_date = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else None
        except ValueError:
            return jsonify({"error": "Invalid date format. Use YYYY-MM-DD."}), 400

        with get_db_connection() as conn:
            rows = conn.execute("SELECT * FROM logs ORDER BY id DESC").fetchall()
            entries = [dict(row) for row in rows]

        if start_date or end_date:
            def within_range(entry):
                entry_date = datetime.strptime(entry["timestamp"][:10], "%Y-%m-%d").date()
                if start_date and entry_date < start_date:
                    return False
                if end_date and entry_date > end_date:
                    return False
                return True
            entries = [entry for entry in entries if within_range(entry)]

        return jsonify(entries)

    if request.method == "DELETE":
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        archive_path = os.path.join(ARCHIVE_DIR, f"entry_log_archive_{timestamp}.db")
        try:
            shutil.copy(DATABASE_PATH, archive_path)
            with get_db_connection() as conn:
                conn.execute("DELETE FROM logs")
                conn.commit()
            config = load_config()
            config["lastExportDate"] = str(datetime.utcnow().date())
            with open(CONFIG_PATH, "w", encoding="utf-8") as f:
                json.dump(config, f, indent=2)
            return jsonify({"status": "ok", "message": f"Log cleared and archived to {os.path.basename(archive_path)}"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    payload = request.get_json(silent=True) or {}
    staff_id = payload.get("staffId")
    action = payload.get("action")
    reason = payload.get("reason")
    ticket = (payload.get("ticket") or "").strip()
    timestamp = payload.get("timestamp") or datetime.utcnow().isoformat()

    if not staff_id or action not in {"IN", "OUT"} or not reason:
        return jsonify({"error": "Missing or invalid log payload"}), 400

    if ticket and not (isinstance(ticket, str) and ticket.isdigit() and len(ticket) == 5):
        return jsonify({"error": "Ticket must be a 5-digit number"}), 400

    staff = next((item for item in STAFF_LIST if item["id"] == int(staff_id)), None)
    if not staff:
        return jsonify({"error": "Staff member not found"}), 404

    with get_db_connection() as conn:
        conn.execute(
            "INSERT INTO logs (staffId, staffName, staffRole, icon, action, reason, ticket, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (staff["id"], staff["name"], staff["role"], staff["icon"], action, reason, ticket, timestamp),
        )
        conn.commit()

    return jsonify({"status": "ok"})


@app.route("/api/export")
def api_export():
    with get_db_connection() as conn:
        rows = conn.execute("SELECT staffName, staffRole, action, reason, ticket, timestamp FROM logs ORDER BY id DESC").fetchall()

    output = []
    header = ["Staff Name", "Role", "Action", "Reason", "Ticket", "Timestamp"]
    output.append(header)
    for row in rows:
        output.append([row["staffName"], row["staffRole"], row["action"], row["reason"], row["ticket"], row["timestamp"]])

    from io import StringIO
    buffer = StringIO()
    writer = csv.writer(buffer, quoting=csv.QUOTE_MINIMAL)
    writer.writerows(output)
    csv_text = buffer.getvalue()
    buffer.close()

    response = make_response(csv_text)
    response.headers["Content-Type"] = "text/csv; charset=utf-8"
    response.headers["Content-Disposition"] = f"attachment; filename=entrylogger-report-{datetime.utcnow().date()}.csv"
    return response


if __name__ == "__main__":
    print(f"Starting EntryLogger with Flask {flask.__version__}")
    app.run(host="0.0.0.0", port=5000, debug=True)
