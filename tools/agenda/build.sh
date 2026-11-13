#!/bin/sh
# Builds the calendar helper (agenda.swift, EventKit) into tools/agenda/build/agenda, its Info.plist (the calendar
# usage descriptions macOS asks for) embedded in the binary, ad hoc signed. macOS only; needs swiftc (Xcode or its
# command line tools). tools/install.sh runs it and copies the binary to ~/.local/share/world-of-codecraft/agenda.
set -eu
DIR=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$DIR/build"
swiftc -O -swift-version 5 "$DIR/agenda.swift" -o "$DIR/build/agenda" \
  -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist -Xlinker "$DIR/Info.plist"
codesign -s - -f -i dev.world-of-codecraft.agenda "$DIR/build/agenda" 2>/dev/null
