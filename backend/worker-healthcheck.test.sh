#!/bin/sh
set -eu

script_dir="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
healthcheck="$script_dir/worker-healthcheck.sh"
temporary_directory="$(mktemp -d)"
heartbeat_file="$temporary_directory/heartbeat"
trap 'rm -rf "$temporary_directory"' EXIT

APP_MODE=api sh "$healthcheck"

if APP_MODE=worker APP_WORKER_HEARTBEAT_FILE="$heartbeat_file" sh "$healthcheck"; then
  echo "worker healthcheck accepted a missing heartbeat" >&2
  exit 1
fi

write_heartbeat() {
  database_status="$1"
  {
    echo "timestamp=2026-10-29T00:00:00Z"
    echo "mode=worker"
    echo "environment=test"
    echo "release_sha=0123456789abcdef0123456789abcdef01234567"
    echo "db_status=$database_status"
  } > "$heartbeat_file"
}

write_heartbeat UP
APP_MODE=worker \
  APP_WORKER_HEARTBEAT_FILE="$heartbeat_file" \
  APP_WORKER_HEARTBEAT_MAX_AGE_SECONDS=90 \
  sh "$healthcheck"

write_heartbeat DOWN
if APP_MODE=worker APP_WORKER_HEARTBEAT_FILE="$heartbeat_file" sh "$healthcheck"; then
  echo "worker healthcheck accepted db_status=DOWN" >&2
  exit 1
fi

write_heartbeat UP
touch -d '3 minutes ago' "$heartbeat_file"
if APP_MODE=worker \
  APP_WORKER_HEARTBEAT_FILE="$heartbeat_file" \
  APP_WORKER_HEARTBEAT_MAX_AGE_SECONDS=90 \
  sh "$healthcheck"; then
  echo "worker healthcheck accepted a stale heartbeat" >&2
  exit 1
fi
