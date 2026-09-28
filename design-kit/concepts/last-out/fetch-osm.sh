#!/bin/bash
# Refetch the OSM inputs build.py reads (cache/ is gitignored, ~8 MB).
cd "$(dirname "$0")" && mkdir -p cache
./overpass.sh cache/places.json <<'Q'
[out:json][timeout:90];
(
 node["natural"="peak"]["name"~"Timpanogos|Sugarloaf|Clayton|Lone Peak|Baldy|Millicent|Wolverine|Devil|Superior|Hidden Peak|Roberts Horn|Bearclaw|Emerald"](40.35,-111.87,40.62,-111.52);
 way["landuse"="winter_sports"](40.35,-111.87,40.62,-111.52);
 relation["landuse"="winter_sports"](40.35,-111.87,40.62,-111.52);
 way["leisure"="park"]["name"~"Corner Canyon"](40.40,-111.90,40.56,-111.70);
 relation["leisure"="park"]["name"~"Corner Canyon"](40.40,-111.90,40.56,-111.70);
);
out center tags;
Q
./overpass.sh cache/ways.json <<'Q'
[out:json][timeout:150];
(
 way["highway"~"^(path|footway|track|cycleway|bridleway)$"](40.36,-111.70,40.44,-111.58);
 way["highway"~"^(path|footway|track|cycleway|bridleway)$"](40.45,-111.87,40.54,-111.74);
 way["aerialway"~"^(chair_lift|gondola|cable_car|mixed_lift|drag_lift|t-bar|platter|magic_carpet)$"](40.36,-111.62,40.40,-111.56);
 way["aerialway"~"^(chair_lift|gondola|cable_car|mixed_lift|drag_lift|t-bar|platter)$"](40.55,-111.67,40.61,-111.54);
 way["piste:type"="downhill"](40.36,-111.62,40.40,-111.56);
 way["piste:type"="downhill"](40.55,-111.67,40.61,-111.54);
);
out geom tags;
Q
