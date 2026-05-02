#!/bin/sh
set -eu

usage() {
  echo "Usage: sh install.sh [--outputdir target_dir] [--include backend,frontend,conf]"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

run_with_privilege() {
  if [ "$(id -u)" -eq 0 ]; then
    "$@"
    return
  fi

  if command_exists sudo; then
    sudo "$@"
    return
  fi

  echo "Root privileges are required to install Docker. Please run as root or install sudo first." >&2
  exit 1
}

detect_package_manager() {
  if command_exists apt-get; then
    echo "apt-get"
    return
  fi

  if command_exists dnf; then
    echo "dnf"
    return
  fi

  if command_exists yum; then
    echo "yum"
    return
  fi

  if command_exists apk; then
    echo "apk"
    return
  fi

  echo ""
}

ensure_http_client() {
  if command_exists curl || command_exists wget; then
    return 0
  fi

  pkg_manager=$(detect_package_manager)
  case "$pkg_manager" in
    apt-get)
      run_with_privilege apt-get update
      run_with_privilege apt-get install -y curl
      ;;
    dnf)
      run_with_privilege dnf install -y curl
      ;;
    yum)
      run_with_privilege yum install -y curl
      ;;
    apk)
      run_with_privilege apk add --no-cache curl
      ;;
    *)
      echo "curl or wget is required to install Docker automatically." >&2
      exit 1
      ;;
  esac
}

download_file() {
  url="$1"
  dest="$2"

  if command_exists curl; then
    curl -fsSL "$url" -o "$dest"
    return
  fi

  if command_exists wget; then
    wget -qO "$dest" "$url"
    return
  fi

  echo "curl or wget is required to download $url" >&2
  exit 1
}

has_docker() {
  command_exists docker
}

has_docker_compose() {
  command_exists docker && docker compose version >/dev/null 2>&1
}

install_docker_compose_plugin() {
  pkg_manager=$(detect_package_manager)
  case "$pkg_manager" in
    apt-get)
      run_with_privilege apt-get update
      run_with_privilege apt-get install -y docker-compose-plugin
      ;;
    dnf)
      run_with_privilege dnf install -y docker-compose-plugin
      ;;
    yum)
      run_with_privilege yum install -y docker-compose-plugin
      ;;
    apk)
      run_with_privilege apk add --no-cache docker-cli-compose
      ;;
    *)
      echo "Docker Compose is missing and no supported package manager was found to install it automatically." >&2
      exit 1
      ;;
  esac
}

ensure_docker_started() {
  if command_exists systemctl; then
    run_with_privilege systemctl enable docker >/dev/null 2>&1 || true
    run_with_privilege systemctl start docker >/dev/null 2>&1 || true
    return
  fi

  if command_exists service; then
    run_with_privilege service docker start >/dev/null 2>&1 || true
  fi
}

install_docker_stack() {
  installer_tmp=$(mktemp "${TMPDIR:-/tmp}/get-docker.XXXXXX.sh")
  download_file "https://get.docker.com" "$installer_tmp"
  run_with_privilege sh "$installer_tmp"
  rm -f "$installer_tmp"
}

ensure_docker_prerequisites() {
  docker_missing=0
  compose_missing=0

  if ! has_docker; then
    docker_missing=1
  fi

  if ! has_docker_compose; then
    compose_missing=1
  fi

  if [ "$docker_missing" -eq 0 ] && [ "$compose_missing" -eq 0 ]; then
    echo "Docker and Docker Compose are already installed."
    return 0
  fi

  echo "Docker or Docker Compose is missing. Installing prerequisites..."
  ensure_http_client

  if [ "$docker_missing" -eq 1 ]; then
    install_docker_stack
    ensure_docker_started
  fi

  if [ "$compose_missing" -eq 1 ] && ! has_docker_compose; then
    install_docker_compose_plugin
  fi

  if ! has_docker; then
    echo "Docker installation failed." >&2
    exit 1
  fi

  if ! has_docker_compose; then
    echo "Docker Compose installation failed." >&2
    exit 1
  fi

  echo "Docker and Docker Compose are ready."
}

ensure_safe_path() {
  case "$1" in
    ""|"/")
      echo "Refusing to operate on unsafe path: $1" >&2
      exit 1
      ;;
  esac
}

has_artifact() {
  case ",$INCLUDE," in
    *,"$1",*) return 0 ;;
    *) return 1 ;;
  esac
}

archive_with_python() {
  pybin="$1"
  src="$2"
  dest="$3"

  "$pybin" - "$src" "$dest" <<'PY'
import os
import sys
import zipfile

source = os.path.abspath(sys.argv[1])
target = os.path.abspath(sys.argv[2])
parent = os.path.dirname(source)

with zipfile.ZipFile(target, 'w', zipfile.ZIP_DEFLATED) as zf:
    for root, _, files in os.walk(source):
        for filename in files:
            path = os.path.join(root, filename)
            arcname = os.path.relpath(path, parent)
            zf.write(path, arcname)
PY
}

backup_dir() {
  src="$1"
  dest_zip="$2"

  if [ ! -d "$src" ]; then
    return 0
  fi

  if ! find "$src" -mindepth 1 -print -quit 2>/dev/null | grep -q .; then
    return 0
  fi

  mkdir -p "$(dirname "$dest_zip")"

  if command_exists zip; then
    parent_dir=$(dirname "$src")
    base_name=$(basename "$src")
    (
      cd "$parent_dir"
      zip -qr "$dest_zip" "$base_name"
    )
    return 0
  fi

  if command_exists python3; then
    archive_with_python python3 "$src" "$dest_zip"
    return 0
  fi

  if command_exists python; then
    archive_with_python python "$src" "$dest_zip"
    return 0
  fi

  echo "zip/python3/python is required to create backup archive: $dest_zip" >&2
  exit 1
}

reset_dir() {
  dir="$1"
  ensure_safe_path "$dir"
  rm -rf "$dir"
  mkdir -p "$dir"
}

copy_dir_contents() {
  src="$1"
  dest="$2"

  if [ ! -d "$src" ]; then
    echo "Source directory not found: $src" >&2
    exit 1
  fi

  mkdir -p "$dest"
  cp -a "$src"/. "$dest"/
}

OUTPUT_DIR="/usr/local/compose"
INCLUDE="backend,frontend,conf"

while [ $# -gt 0 ]; do
  case "$1" in
    --outputdir)
      if [ $# -lt 2 ]; then
        echo "Missing value for --outputdir" >&2
        usage
        exit 1
      fi
      OUTPUT_DIR="$2"
      shift 2
      ;;
    --include)
      if [ $# -lt 2 ]; then
        echo "Missing value for --include" >&2
        usage
        exit 1
      fi
      INCLUDE="$2"
      shift 2
      ;;
    --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

INCLUDE=$(printf '%s' "$INCLUDE" | tr -d '[:space:]')
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
PACKAGE_DIR="$SCRIPT_DIR"
PROJECT_DIR="$OUTPUT_DIR"
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_DIR="$PROJECT_DIR/bak"

ensure_docker_prerequisites

mkdir -p "$BACKUP_DIR"

if has_artifact backend; then
  echo "Deploying backend..."
  backup_dir "$PROJECT_DIR/data/backend" "$BACKUP_DIR/data.bak.$TIMESTAMP.zip"
  reset_dir "$PROJECT_DIR/data/backend"
  copy_dir_contents "$PACKAGE_DIR/backend" "$PROJECT_DIR/data/backend"
fi

if has_artifact frontend; then
  echo "Deploying frontend..."
  backup_dir "$PROJECT_DIR/www" "$BACKUP_DIR/www.bak.$TIMESTAMP.zip"
  reset_dir "$PROJECT_DIR/www"
  copy_dir_contents "$PACKAGE_DIR/frontend" "$PROJECT_DIR/www"
fi

if has_artifact conf; then
  echo "Deploying conf..."
  backup_dir "$PROJECT_DIR/conf" "$BACKUP_DIR/conf.bak.$TIMESTAMP.zip"
  reset_dir "$PROJECT_DIR/conf"
  mkdir -p "$PROJECT_DIR/conf/nginx" "$PROJECT_DIR/conf/backend"
  copy_dir_contents "$PACKAGE_DIR/conf/nginx" "$PROJECT_DIR/conf/nginx"
  copy_dir_contents "$PACKAGE_DIR/conf/backend" "$PROJECT_DIR/conf/backend"

  if [ ! -f "$PACKAGE_DIR/conf/compose/docker-compose.yml" ]; then
    echo "Missing compose file: $PACKAGE_DIR/conf/compose/docker-compose.yml" >&2
    exit 1
  fi

  cp -f "$PACKAGE_DIR/conf/compose/docker-compose.yml" "$PROJECT_DIR/docker-compose.yml"
fi

echo "Deploy finished: $PROJECT_DIR"