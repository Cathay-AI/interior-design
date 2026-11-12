#!/bin/sh
# Assemble the public site for Vercel. Only allow-listed folders are copied,
# so internal docs in this private repo are never published by accident.
set -eu
rm -rf dist
mkdir -p dist/prototype dist/deck
cp site/index.html dist/index.html
cp prototype/fast-route/index.html prototype/fast-route/app.js dist/prototype/
cp -R prototype/fast-route/lib dist/prototype/lib
cp docs/proposal/deck-v3/index.html dist/deck/index.html
echo "built dist/: $(find dist -type f | wc -l) files"
