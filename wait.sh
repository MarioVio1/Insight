#!/usr/bin/env bash
set -e
file=/app/.ready
seconds=30
while [ ! -f "$file" ] && [ "$seconds" -gt 0 ]; do
  sleep 1
  seconds=$((seconds-1))
done
if [ -f "$file" ]; then
  exit 0
fi
exit 1
