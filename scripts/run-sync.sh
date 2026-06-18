#!/usr/bin/env bash
# Green Phoenix — disk sync runner for cron (BACKLOG.md §5). Linux port of run-sync.cmd.
# Mirrors Job Hunter jobs.json + each folder's BACKLOG.md checkboxes into Supabase.
# Working dir is forced to the project root so .env.local (service-role key) loads.
# Appends output to sync.log at the project root (gitignored).
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# cron runs with a minimal environment — load nvm so `node` is on PATH.
export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1090
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1 || true

cd "$ROOT"
{
  echo
  echo "[$(date)] sync start"
} >> sync.log
node scripts/sync-from-disk.mjs >> sync.log 2>&1
code=$?
echo "[$(date)] sync exit $code" >> sync.log
exit $code
