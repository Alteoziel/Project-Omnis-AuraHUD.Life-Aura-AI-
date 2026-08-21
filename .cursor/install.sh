#!/usr/bin/env bash
# Idempotent dependency bootstrap for the AuraHUD (Project Omnis) monorepo.
# Prepares the three developable components: web/ (Next.js PWA),
# dashboard/ (Next.js review panel), and governance/ (Python CLI).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

# Python venv support is missing from some minimal base images. Only install it
# when the stdlib venv bootstrap is unavailable so repeated runs are no-ops.
if ! python3 -c "import ensurepip" >/dev/null 2>&1; then
  echo "==> Installing python3-venv support"
  sudo apt-get update -qq
  sudo apt-get install -y -qq python3.12-venv
fi

echo "==> Installing web/ dependencies (npm ci)"
(cd "$ROOT/web" && npm ci)

echo "==> Installing dashboard/ dependencies (npm ci)"
(cd "$ROOT/dashboard" && npm ci)

echo "==> Installing governance/ Python package (.venv + pip install -e .[dev])"
cd "$ROOT/governance"
python3 -m venv .venv
# shellcheck disable=SC1091
. .venv/bin/activate
python -m pip install --upgrade pip >/dev/null
pip install -e ".[dev]"

echo "==> Install complete"
