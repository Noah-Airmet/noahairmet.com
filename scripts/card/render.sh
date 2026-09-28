#!/usr/bin/env bash
# Renders the share card: public/og/card.png (still) and public/og/card.mp4
# (one full turn of Timp in 10 s, loops seamlessly; iMessage autoplays it).
#   bash scripts/card/render.sh [sky]     # sky: blue (default), golden, day, night
# After re-rendering, bump `card` v= in src/lib/site.ts so apps refetch.
set -uo pipefail
cd "$(dirname "$0")/../.."
SKY="${1:-blue}"; PORT=4396; FRAMES=240; FPS=24
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FRAMEDIR="${TMPDIR:-/tmp}/noahairmet-card-frames"
mkdir -p "$FRAMEDIR" public/og
python3 -m http.server "$PORT" --directory . >/dev/null 2>&1 &
SERVER=$!
trap 'kill $SERVER 2>/dev/null' EXIT
sleep 1

# Headless Chrome occasionally hangs on a frame; give each try 30 s, retry twice.
shot() {
  local out="$1" yaw="$2" try pid t
  for try in 1 2 3; do
    "$CHROME" --headless=new --disable-gpu --hide-scrollbars --window-size=1200,630 \
      --force-device-scale-factor=1 --virtual-time-budget=4000 --screenshot="$out" \
      "http://localhost:$PORT/scripts/card/card.html?sky=$SKY&yaw=$yaw" >/dev/null 2>&1 &
    pid=$!
    for t in $(seq 30); do kill -0 "$pid" 2>/dev/null || break; sleep 1; done
    kill "$pid" 2>/dev/null
    [ -s "$out" ] && return 0
  done
  echo "frame failed: $out" >&2; return 1
}
export -f shot; export CHROME PORT SKY

shot public/og/card.png 0
seq 0 $((FRAMES - 1)) | xargs -P 8 -I{} bash -c '
  f="'"$FRAMEDIR"'/f-$(printf %03d {}).png"
  [ -s "$f" ] || shot "$f" "$(python3 -c "import math; print(-2 * math.pi * {} / '"$FRAMES"')")"'
missing=$(for i in $(seq 0 $((FRAMES - 1))); do [ -s "$FRAMEDIR/f-$(printf %03d "$i").png" ] || echo "$i"; done)
if [ -n "$missing" ]; then echo "missing frames: $missing (re-run to resume)" >&2; exit 1; fi

ffmpeg -loglevel error -y -framerate "$FPS" -i "$FRAMEDIR/f-%03d.png" \
  -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -movflags +faststart -an public/og/card.mp4
rm -rf "$FRAMEDIR"
ls -la public/og/
