#!/usr/bin/env bash
# Master the game's music for the web (ticket 25; see docs/audio/README.md).
# Cuts each looping track to its loop (before Lyria's fade-out), normalises every
# track to -16 LUFS with true peaks at or below -1 dB, and re-encodes to 128 kbps MP3.
#
#   scripts/master_music.sh <folder with the original MP3s> <output folder>
#
# The originals are in git history (commit 899a864; stingers ff21515).
set -euo pipefail
src=${1:?original folder}
out=${2:?output folder}
mkdir -p "$out"

# id  start(s)  end(s, empty = whole track)
tracks=(
  "menu-theme 0 "
  "site-calm-a 0 165.5"
  "site-calm-b 5.8 153.5"
  "designer-focus 0 117"
  "launch 0 "
  "flight-orbit 2 153.5"
  "anomaly 13 58"
  "stinger-success 0 "
  "stinger-failure 0 "
  "era-history 0 "
)

for line in "${tracks[@]}"; do
  read -r id start end <<<"$line"
  cut=(-ss "$start")
  [[ -n "${end:-}" ]] && cut+=(-to "$end")
  # Pass 1: measure. Target -1.5 dB true peak, so MP3 encoding stays under -1 dB.
  json=$(ffmpeg -hide_banner -nostats "${cut[@]}" -i "$src/$id.mp3" \
    -af loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
  get() { grep "\"$1\"" <<<"$json" | sed 's/.*: "\(.*\)".*/\1/'; }
  # Pass 2: normalise with the measured values; 20 ms fades stop clicks at the cuts.
  ffmpeg -hide_banner -loglevel error -y "${cut[@]}" -i "$src/$id.mp3" \
    -af "loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true,afade=t=in:d=0.02,areverse,afade=t=in:d=0.02,areverse,aresample=44100" \
    -c:a libmp3lame -b:a 128k -map_metadata -1 "$out/$id.mp3"
  echo "$id done"
done
