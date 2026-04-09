#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

STAFF_FILE="staff.json"
DRY_RUN=0
AUTO_YES=0

usage() {
  cat <<EOF
Usage: $0 [--yes] [--dry-run] [--help]

Options:
  --yes      Skip confirmation prompt.
  --dry-run  Show what would change without writing files.
  --help     Show this message.
EOF
}

error() {
  echo "Error: $1" >&2
  exit 1
}

prompt_yes_no() {
  local prompt_message="$1"
  local reply

  read -r -p "$prompt_message [y/N] " reply || true
  [[ "$reply" =~ ^([Yy]|[Yy][Ee][Ss])$ ]]
}

check_command() {
  command -v "$1" >/dev/null 2>&1 || error "$1 is required. Install it and rerun this script."
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --yes)
      AUTO_YES=1
      ;;
    --dry-run)
      DRY_RUN=1
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      error "Unknown option: $1"
      ;;
  esac
  shift
done

[[ -f "$STAFF_FILE" ]] || error "$STAFF_FILE not found."
check_command python3
check_command sqlite3

echo "This will sanitize project data for public release:"
echo "- Randomize names in $STAFF_FILE"
echo "- Clear rows in logs table for all local SQLite DB files"
echo "- Truncate all CSV files in the repository"

if [[ "$AUTO_YES" -ne 1 ]]; then
  prompt_yes_no "Continue?" || error "Canceled."
fi

python3 - "$STAFF_FILE" "$DRY_RUN" <<'PY'
import json
import random
import sys
from pathlib import Path

staff_path = Path(sys.argv[1])
dry_run = sys.argv[2] == "1"

first_names = [
    "Alex", "Avery", "Cameron", "Casey", "Devon", "Emerson", "Harper", "Jordan",
    "Kai", "Logan", "Morgan", "Parker", "Quinn", "Reese", "Riley", "Taylor",
]
last_names = [
    "Bennett", "Brooks", "Carter", "Coleman", "Ellis", "Foster", "Hayes", "Jenkins",
    "Kim", "Lopez", "Morgan", "Nguyen", "Patel", "Reed", "Rivera", "Sullivan",
]

rng = random.SystemRandom()
staff = json.loads(staff_path.read_text(encoding="utf-8"))
used = set()

for member in staff:
    generated = None
    for _ in range(100):
        candidate = f"{rng.choice(first_names)} {rng.choice(last_names)}"
        if candidate not in used:
            generated = candidate
            used.add(candidate)
            break
    if generated is None:
        generated = f"User {member.get('id', 'X')}"
    member["name"] = generated

if dry_run:
    print(f"[dry-run] Would update names in {staff_path}")
else:
    staff_path.write_text(json.dumps(staff, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated names in {staff_path}")
PY

while IFS= read -r db_file; do
  if sqlite3 "$db_file" ".tables" | tr ' ' '\n' | grep -qx "logs"; then
    if [[ "$DRY_RUN" -eq 1 ]]; then
      echo "[dry-run] Would clear logs table in $db_file"
    else
      sqlite3 "$db_file" "DELETE FROM logs;"
      remaining_rows="$(sqlite3 "$db_file" "SELECT COUNT(*) FROM logs;")"
      echo "Cleared logs in $db_file (remaining rows: $remaining_rows)"
    fi
  fi
done < <(find . \( -path './.venv' -o -path './.venv-test' -o -path './.git' \) -prune -o -type f \( -name '*.db' -o -name '*.sqlite' -o -name '*.sqlite3' \) -print)

while IFS= read -r csv_file; do
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "[dry-run] Would truncate $csv_file"
  else
    truncate -s 0 "$csv_file"
    echo "Truncated $csv_file"
  fi
done < <(find . \( -path './.venv' -o -path './.venv-test' -o -path './.git' \) -prune -o -type f -name '*.csv' -print)

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run complete. No files were modified."
else
  echo "Sanitization complete."
fi
