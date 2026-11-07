#!/usr/bin/env bash
set -euo pipefail

# Phase 10 integration gate. The workflow does not provision PostgreSQL, so
# database-backed tests remain opt-in and are exercised by the Phase 11–15 gate.
echo "== API and web regression checks =="
npm run check

echo "== API production build =="
npm run build

echo "== Web production build =="
npm run build:web

echo "Phase 10 integration gate passed."
