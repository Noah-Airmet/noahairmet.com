#!/bin/bash
# usage: overpass.sh out.json <<< 'query'  — tries mirrors in turn
q=$(cat); out=$1
for u in https://overpass.kumi.systems/api/interpreter https://overpass-api.de/api/interpreter https://maps.mail.ru/osm/tools/overpass/api/interpreter; do
  curl -s --max-time 180 -A "noahairmet.com terrain prototype" "$u" --data-urlencode "data=$q" -o "$out.tmp"
  if head -c 1 "$out.tmp" | grep -q '{'; then mv "$out.tmp" "$out"; echo "ok via $u"; exit 0; fi
  echo "failed: $u ($(head -c 200 "$out.tmp" | tr '\n' ' '))"
done; exit 1
