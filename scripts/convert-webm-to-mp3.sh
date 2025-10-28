#!/usr/bin/env bash
# scripts/convert-webm-to-mp3.sh
set -e
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg not found. On macOS: brew install ffmpeg"
  exit 1
fi
for f in "$@"; do
  out="${f%.webm}.mp3"
  ffmpeg -y -i "$f" -vn -ar 44100 -b:a 128k "$out"
  echo "✓ $out"
done
