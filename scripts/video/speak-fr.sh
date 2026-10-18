#!/usr/bin/env sh
set -eu
if [ "$#" -ne 2 ]; then
  printf 'Usage: speak-fr.sh sortie.wav narration-utf8.txt\n' >&2
  exit 2
fi
lab_speech_bin=${LAB_ESPEAK_BIN:-espeak-ng}
"$lab_speech_bin" -b 1 -v fr-fr -s "${LAB_SPEECH_WPM:-155}" -a 130 -w "$1" -f "$2"
