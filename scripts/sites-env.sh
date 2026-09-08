#!/usr/bin/env bash
set -euo pipefail
[[ "${1:-}" != "--" ]] || shift
exec "$@"
