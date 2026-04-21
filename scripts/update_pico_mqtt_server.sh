#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/Pico_Gestura/.env"
IFACE="${IFACE:-en0}"
MQTT_PORT="${MQTT_PORT:-1883}"
SYNC=0
PICO_PORT="${PICO_PORT:-auto}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing Pico env file: $ENV_FILE" >&2
  exit 1
fi

if [[ "${1:-}" == "--sync" ]]; then
  SYNC=1
fi

CURRENT_IP="$(/usr/sbin/ipconfig getifaddr "$IFACE" 2>/dev/null || true)"
if [[ -z "$CURRENT_IP" ]]; then
  echo "No IPv4 address found on interface $IFACE" >&2
  exit 1
fi

python3 - "$ENV_FILE" "$CURRENT_IP" "$MQTT_PORT" <<'PY'
from pathlib import Path
import sys

env_path = Path(sys.argv[1])
ip = sys.argv[2]
port = sys.argv[3]
target = f"MQTT_SERVER={ip}:{port}"

lines = env_path.read_text().splitlines()
updated = False
result = []

for line in lines:
    if line.startswith("MQTT_SERVER="):
        result.append(target)
        updated = True
    else:
        result.append(line)

if not updated:
    result.append(target)

env_path.write_text("\n".join(result) + "\n")
print(target)
PY

echo "Updated Pico MQTT target in $ENV_FILE for $IFACE"

if [[ "$SYNC" -eq 1 ]]; then
  if ! command -v mpremote >/dev/null 2>&1; then
    echo "mpremote is not installed; skipping device sync" >&2
    exit 1
  fi

  if [[ "$PICO_PORT" == "auto" ]]; then
    mpremote connect auto fs cp -f "$ENV_FILE" :.env
  else
    mpremote connect "$PICO_PORT" fs cp -f "$ENV_FILE" :.env
  fi

  echo "Synced updated .env to Pico"
fi
