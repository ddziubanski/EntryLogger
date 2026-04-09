#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

PYTHON=python3
VENV_DIR="$(pwd)/.venv"
APP_DIR="$(pwd)"
APP_USER="${SUDO_USER:-$(whoami)}"
SERVICE_PATH="/etc/systemd/system/entrylogger.service"
REQUIREMENTS_FILE="requirements.txt"
APT_UPDATED=0

usage() {
  cat <<EOF
Usage: $0 [install|run|help]

Commands:
  install   Create the virtual environment, install dependencies, and optionally install a systemd service if run as root.
  run       Activate the virtual environment and start the app with gunicorn.
  help      Show this message.
EOF
}

error() {
  echo "Error: $1" >&2
  exit 1
}

warning() {
  echo "Warning: $1" >&2
}

print_section() {
  local title="$1"
  printf '\n============================================================\n'
  printf ' %s\n' "$title"
  printf '============================================================\n'
}

print_install_summary() {
  if [[ -t 1 ]]; then
    clear
  fi

  print_section "EntryLogger Installed"
  printf ' Virtual environment: %s\n' "$VENV_DIR"
  printf ' Requirements file:   %s\n' "$REQUIREMENTS_FILE"
  printf '\n Next step:\n'
  printf '   ./entrylog.sh run\n'

  if [[ "$EUID" -ne 0 ]]; then
    printf '\n Optional service setup:\n'
    printf '   Run as root to install the systemd service.\n'
    printf '   Example: sudo ./entrylog.sh install\n'
  else
    printf '\n Optional service setup:\n'
    printf '   Installing systemd service...\n'
  fi
}

is_debian_system() {
  [[ -r /etc/os-release ]] || return 1

  local os_id=""
  local os_like=""
  os_id="$(. /etc/os-release && printf '%s' "${ID:-}")"
  os_like="$(. /etc/os-release && printf '%s' "${ID_LIKE:-}")"

  [[ "$os_id" == "debian" || "$os_like" == *debian* ]]
}

prompt_yes_no() {
  local prompt_message="$1"
  local reply

  read -r -p "$prompt_message [Y/n] " reply || true
  reply="${reply:-Y}"
  [[ "$reply" =~ ^([Yy]|[Yy][Ee][Ss])$ ]]
}

install_debian_packages() {
  local packages=("$@")
  local installer=(apt-get)

  if [[ ${#packages[@]} -eq 0 ]]; then
    return 0
  fi

  is_debian_system || error "Automatic dependency installation is only supported on Debian-based systems. Install these packages manually: ${packages[*]}"

  if [[ "$EUID" -ne 0 ]]; then
    check_command sudo
    installer=(sudo apt-get)
  fi

  if [[ "$APT_UPDATED" -eq 0 ]]; then
    echo "Refreshing Debian package index..."
    "${installer[@]}" update || error "Failed to refresh apt package index."
    APT_UPDATED=1
  fi

  echo "Installing Debian packages: ${packages[*]}"
  "${installer[@]}" install -y "${packages[@]}" || error "Failed to install Debian packages: ${packages[*]}"
}

ensure_debian_packages() {
  local packages=("$@")
  local missing=()
  local package

  for package in "${packages[@]}"; do
    if ! dpkg -s "$package" >/dev/null 2>&1; then
      missing+=("$package")
    fi
  done

  if [[ ${#missing[@]} -eq 0 ]]; then
    return 0
  fi

  echo "Missing Debian packages: ${missing[*]}"
  if prompt_yes_no "Install the missing packages now?"; then
    install_debian_packages "${missing[@]}"
  else
    error "Missing required Debian packages: ${missing[*]}"
  fi
}

list_python_requirements() {
  ensure_requirements
  grep -Ev '^\s*($|#)' "$REQUIREMENTS_FILE" || true
}

run_install_precheck() {
  ensure_requirements

  local required_debian=(python3 python3-venv python3-pip)
  local missing_debian=()
  local package

  if is_debian_system && command -v dpkg >/dev/null 2>&1; then
    for package in "${required_debian[@]}"; do
      if ! dpkg -s "$package" >/dev/null 2>&1; then
        missing_debian+=("$package")
      fi
    done
  fi

  print_section "Install Precheck"
  printf ' App directory:      %s\n' "$APP_DIR"
  printf ' Requirements file:  %s\n' "$REQUIREMENTS_FILE"
  printf '\n Python dependencies from requirements.txt:\n'
  list_python_requirements | sed 's/^/  - /'

  if is_debian_system; then
    printf '\n Debian package prerequisites:\n'
    printf '  - %s\n' "${required_debian[@]}"
    if [[ ${#missing_debian[@]} -gt 0 ]]; then
      printf ' Missing Debian packages:\n'
      printf '  - %s\n' "${missing_debian[@]}"
    else
      printf ' Missing Debian packages: none\n'
    fi
  else
    printf '\n Non-Debian system detected; install system Python prerequisites manually if needed.\n'
  fi

  if ! prompt_yes_no "Continue with installation?"; then
    error "Installation canceled by user."
  fi

  if [[ ${#missing_debian[@]} -gt 0 ]]; then
    install_debian_packages "${missing_debian[@]}"
  fi
}

check_command() {
  command -v "$1" >/dev/null 2>&1 || error "$1 is required. Install it and rerun this script."
}

assert_python() {
  command -v "$PYTHON" >/dev/null 2>&1 || error "python3 is required but unavailable. On Debian/Ubuntu install: python3"
  "$PYTHON" -c 'import venv' >/dev/null 2>&1 || error "python3-venv is required but unavailable. On Debian/Ubuntu install: python3-venv"
  "$PYTHON" -m pip --version >/dev/null 2>&1 || error "python3-pip is required but unavailable. On Debian/Ubuntu install: python3-pip"
}

ensure_requirements() {
  [[ -f "$REQUIREMENTS_FILE" ]] || error "$REQUIREMENTS_FILE not found in $APP_DIR."
}

create_venv_and_install() {
  run_install_precheck
  assert_python
  ensure_requirements

  if [[ ! -d "$VENV_DIR" || ! -f "$VENV_DIR/bin/activate" ]]; then
    if [[ -d "$VENV_DIR" ]]; then
      warning "Existing virtual environment is incomplete; removing and recreating it."
      rm -rf "$VENV_DIR"
    fi

    echo "Creating virtual environment in $VENV_DIR"
    "$PYTHON" -m venv "$VENV_DIR" || error "Failed to create virtual environment in $VENV_DIR."
  fi

  if [[ ! -f "$VENV_DIR/bin/activate" ]]; then
    error "Virtual environment activation script not found at $VENV_DIR/bin/activate after creation. Ensure Python venv creation succeeded."
  fi

  source "$VENV_DIR/bin/activate"
  python -m pip install --upgrade pip
  python -m pip install -r "$REQUIREMENTS_FILE" || error "Failed to install Python dependencies from $REQUIREMENTS_FILE. Check network connectivity and package names."
}

install_service() {
  if [[ "$EUID" -ne 0 ]]; then
    print_section "Systemd Service Not Installed"
    printf ' Run this script as root to install the optional service.\n'
    printf ' Example: sudo ./entrylog.sh install\n'
    return
  fi

  check_command systemctl

  cat > "$SERVICE_PATH" <<EOF
[Unit]
Description=EntryLogger
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
ExecStart=$APP_DIR/.venv/bin/gunicorn --bind 0.0.0.0:5000 --workers 3 --threads 2 entrylogger:app
Restart=always
RestartSec=5
Environment=PATH=$APP_DIR/.venv/bin
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable entrylogger.service
  echo "Systemd service created at $SERVICE_PATH"
  echo "Start it with: systemctl start entrylogger.service"
}

run_app() {
  if [[ ! -d "$VENV_DIR" ]]; then
    echo "Virtual environment not found. Installing dependencies first..."
    create_venv_and_install
  fi

  if [[ ! -f "$VENV_DIR/bin/activate" ]]; then
    error "Virtual environment activation script not found at $VENV_DIR/bin/activate. Run '$0 install' first."
  fi

  source "$VENV_DIR/bin/activate"
  if ! command -v gunicorn >/dev/null 2>&1; then
    error "Gunicorn is not installed in the virtual environment. Run '$0 install' to install dependencies."
  fi

  exec gunicorn --bind 0.0.0.0:5000 --workers 3 --threads 2 entrylogger:app
}

main() {
  case "${1:-install}" in
    install)
      create_venv_and_install
      print_install_summary
      install_service
      ;;
    run)
      run_app
      ;;
    help|--help|-h)
      usage
      ;;
    *)
      error "Unknown command: $1. Use help for usage information."
      ;;
  esac
}

main "$@"
