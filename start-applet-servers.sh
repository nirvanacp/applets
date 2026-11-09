#!/usr/bin/env bash
set -euo pipefail
collection_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
exec node "$collection_dir/scripts/applet-servers.mjs" all "$@"
