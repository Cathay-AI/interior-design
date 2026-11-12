#!/bin/sh
# Assemble the product site for Vercel: the 快速找風格 prototype at the root.
# Only allow-listed files are copied. The deck is published separately on GitHub Pages.
set -eu
rm -rf dist
mkdir -p dist
cp prototype/fast-route/index.html prototype/fast-route/app.js dist/
cp -R prototype/fast-route/lib dist/lib
cp -R prototype/fast-route/vendor dist/vendor
cp -R prototype/fast-route/assets dist/assets
cp -R prototype/fast-route/privacy prototype/fast-route/terms dist/
echo "built dist/: $(find dist -type f | wc -l) files"
