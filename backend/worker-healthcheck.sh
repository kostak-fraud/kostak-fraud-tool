#!/bin/sh
set -eu

if [ "${APP_MODE:-}" != "worker" ]; then
  exit 0
fi

heartbeat_file="${APP_WORKER_HEARTBEAT_FILE:-/tmp/kostak-worker-heartbeat}"
max_age_seconds="${APP_WORKER_HEARTBEAT_MAX_AGE_SECONDS:-90}"

case "$max_age_seconds" in
  ''|*[!0-9]*) exit 1 ;;
esac

if [ "$max_age_seconds" -lt 1 ] || [ ! -f "$heartbeat_file" ] || [ -L "$heartbeat_file" ]; then
  exit 1
fi

grep -qx 'mode=worker' "$heartbeat_file"
grep -qx 'db_status=UP' "$heartbeat_file"
grep -Eq '^release_sha=[A-Za-z0-9._-]{1,128}$' "$heartbeat_file"

now="$(date -u +%s)"
modified="$(stat -c %Y -- "$heartbeat_file")"
age="$((now - modified))"

[ "$age" -ge 0 ] && [ "$age" -le "$max_age_seconds" ]
