#!/bin/sh
# Keep setup outside the game. No system-wide installs or administrator access.
set -u
root=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cache="$root/.leap"
runtime="$cache/node"

fail() { printf '\n%s\n' "$*" >&2; return 1; }

# File managers may run scripts without a terminal. Keep progress and quit visible.
if [ "${1:-}" != --in-terminal ] && [ ! -t 1 ] &&
   [ -n "${DISPLAY:-}${WAYLAND_DISPLAY:-}" ] && [ "$(uname -s)" = Linux ]; then
  if command -v gnome-terminal >/dev/null; then
    exec gnome-terminal -- /bin/sh "$root/LEAP.sh" --in-terminal
  elif command -v kgx >/dev/null; then
    exec kgx -- /bin/sh "$root/LEAP.sh" --in-terminal
  elif command -v konsole >/dev/null; then
    exec konsole -e /bin/sh "$root/LEAP.sh" --in-terminal
  elif command -v xfce4-terminal >/dev/null; then
    exec xfce4-terminal --execute /bin/sh "$root/LEAP.sh" --in-terminal
  elif command -v x-terminal-emulator >/dev/null; then
    exec x-terminal-emulator -e /bin/sh "$root/LEAP.sh" --in-terminal
  elif command -v xterm >/dev/null; then
    exec xterm -e /bin/sh "$root/LEAP.sh" --in-terminal
  fi
  fail 'Open LEAP.sh in a terminal so you can see setup progress and stop LEAP.'
  exit 1
fi

install_node() (
  set -eu
  case $(uname -s) in
    Linux) platform=linux ;;
    Darwin) platform=darwin ;;
    *) fail 'Use LEAP.bat on Windows, LEAP.command on macOS, or LEAP.sh on Linux.'; exit 1 ;;
  esac
  case $(uname -m) in
    x86_64|amd64) arch=x64 ;;
    aarch64|arm64) arch=arm64 ;;
    *) fail 'This launcher needs a 64-bit Intel, AMD or ARM computer.'; exit 1 ;;
  esac
  command -v tar >/dev/null || { fail 'LEAP needs tar to unpack Node.js.'; exit 1; }
  if command -v curl >/dev/null; then downloader=curl
  elif command -v wget >/dev/null; then downloader=wget
  else fail 'Install curl or wget, then open this launcher again.'; exit 1
  fi
  if command -v sha256sum >/dev/null; then checker=sha256sum
  elif command -v shasum >/dev/null; then checker=shasum
  else fail 'LEAP needs sha256sum or shasum to check the download.'; exit 1
  fi

  mkdir -p "$cache"
  # A second first-time launch must not replace a runtime still being unpacked.
  if ! mkdir "$cache/download.lock" 2>/dev/null; then
    owner=$(cat "$cache/download.lock/pid" 2>/dev/null || true)
    case $owner in
      ''|*[!0-9]*) fail 'LEAP setup is already open. If it was interrupted, delete .leap/download.lock and try again.'; exit 1 ;;
    esac
    if kill -0 "$owner" 2>/dev/null; then
      printf '\nLEAP is getting ready in another window. Keep that window open.\n'
      printf 'When it is ready, open http://localhost:5173 or run this launcher again.\n'
      exit 3
    fi
    rm -rf "$cache/download.lock"
    mkdir "$cache/download.lock" || exit 1
  fi
  printf '%s\n' "$$" > "$cache/download.lock/pid"
  stage=''
  trap 'test -z "$stage" || rm -rf "$stage"; rm -rf "$cache/download.lock"' 0
  trap 'exit 130' 2
  trap 'exit 143' 1 15
  stage=$(mktemp -d "$cache/download.XXXXXX")
  download() {
    if [ "$downloader" = curl ]; then
      if [ "${3:-}" = progress ]; then
        curl --fail --location --progress-bar --show-error --connect-timeout 20 --max-time 600 "$1" -o "$2"
      else
        curl --fail --location --silent --show-error --connect-timeout 20 --max-time 600 "$1" -o "$2"
      fi
    else
      if [ "${3:-}" = progress ]; then
        wget --progress=bar:force --timeout=60 --tries=2 "$1" -O "$2"
      else
        wget --quiet --timeout=60 --tries=2 "$1" -O "$2"
      fi
    fi
  }

  printf '\n[1/4] Getting Node.js, the tool that runs LEAP.\n'
  printf 'Setup stays in this game folder. No administrator access is needed.\n'
  printf 'Finding the current LTS release. The first start needs internet.\n'
  download https://nodejs.org/dist/index.tab "$stage/index.tab"
  version=$(awk -F '\t' 'NR > 1 && $10 != "-" && $10 != "" { print $1; exit }' "$stage/index.tab")
  printf '%s\n' "$version" | LC_ALL=C grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' || {
    fail 'Could not find the current Node.js LTS release. Open this launcher to try again.'; exit 1
  }
  name="node-$version-$platform-$arch"
  archive="$name.tar.gz"
  download "https://nodejs.org/dist/$version/SHASUMS256.txt" "$stage/checksums"
  printf 'Downloading Node.js %s...\n' "$version"
  download "https://nodejs.org/dist/$version/$archive" "$stage/$archive" progress
  printf 'Checking the download before unpacking it...\n'
  expected=$(awk -v file="$archive" '$2 == file { print $1 }' "$stage/checksums")
  if [ "$checker" = sha256sum ]; then
    actual=$(sha256sum "$stage/$archive" | awk '{print $1}')
  else
    actual=$(shasum -a 256 "$stage/$archive" | awk '{print $1}')
  fi
  [ -n "$expected" ] && [ "$actual" = "$expected" ] || {
    fail 'The Node.js download did not pass its check. Open this launcher to try again.'; exit 1
  }
  printf 'The download passed. Unpacking Node.js...\n'
  tar -xzf "$stage/$archive" -C "$stage"
  "$stage/$name/bin/node" --version
  test -f "$stage/$name/lib/node_modules/npm/bin/npm-cli.js"
  rm -rf "$runtime"
  mv "$stage/$name" "$runtime"
)

start_leap() {
  if ! "$runtime/bin/node" --version >/dev/null 2>&1 ||
     [ ! -f "$runtime/lib/node_modules/npm/bin/npm-cli.js" ]; then
    install_node
    result=$?
    [ "$result" -ne 3 ] || return 0
    [ "$result" -eq 0 ] || return "$result"
  fi
  "$runtime/bin/node" "$root/scripts/leap.mjs"
  result=$?
  # A future dependency may need a newer Node.js. Refresh once, then show errors.
  if [ "$result" -eq 42 ]; then
    install_node
    result=$?
    [ "$result" -ne 3 ] || return 0
    [ "$result" -eq 0 ] || return "$result"
    "$runtime/bin/node" "$root/scripts/leap.mjs"
    result=$?
  fi
  return "$result"
}

start_leap
result=$?
if [ "$result" -eq 130 ] || [ "$result" -eq 143 ]; then
  printf '\nLEAP setup stopped. Open this launcher when you want to try again.\n'
elif [ "$result" -eq 42 ]; then
  fail 'The current Node.js LTS cannot run this version of LEAP. Check for a game update.'
elif [ "$result" -ne 0 ]; then
  printf '\nLEAP could not start. Check the message above, then open this launcher to try again.\n' >&2
fi
if [ -t 0 ]; then
  printf '\nPress Enter to close this window.'
  read -r reply || true
fi
exit "$result"
