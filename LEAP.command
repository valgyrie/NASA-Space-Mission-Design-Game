#!/bin/sh
# Finder opens .command files in Terminal.
exec /bin/sh "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)/LEAP.sh"
