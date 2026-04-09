# Sanitizing for Public Release

Before pushing this repository to a public GitHub repo, run the sanitize script to remove personal names, operational log data, and any exported CSV files.

---

## Quick Run

```bash
chmod +x ./sanitize_for_public_repo.sh
./sanitize_for_public_repo.sh --yes
```

---

## What It Does

| Action | Detail |
|--------|--------|
| **Randomizes staff names** | Rewrites `staff.json` with generated neutral placeholder names using Python's `SystemRandom`. IDs, roles, and icons are preserved. |
| **Clears SQLite logs** | Deletes all rows from the `logs` table in every `.db` and `.sqlite` file found in the repo (excluding `.venv/`, `.git/`). |
| **Truncates CSV files** | Empties all `.csv` files found in the repo (excluding `.venv/`, `.git/`). |

---

## Options

| Flag | Description |
|------|-------------|
| *(none)* | Show summary and prompt for confirmation |
| `--yes` | Skip the confirmation prompt |
| `--dry-run` | Preview what would change without modifying any files |
| `--help` | Show usage information |

---

## Dry Run Example

```bash
./sanitize_for_public_repo.sh --dry-run --yes
```

Output:
```
This will sanitize project data for public release:
- Randomize names in staff.json
- Clear rows in logs table for all local SQLite DB files
- Truncate all CSV files in the repository
[dry-run] Would update names in staff.json
[dry-run] Would clear logs table in ./entry_log.db
Dry run complete. No files were modified.
```

---

## Notes

- After running the script, review `staff.json` to make sure placeholder names look acceptable before pushing.
- The script does **not** delete `entry_log.db` itself — it only clears rows. The empty database file is excluded from git via `.gitignore`.
- Archive `.db` files in `archives/` are also cleared of rows if present, and are also excluded from git.
- Run the script every time before a public push if the app has been in real use.
