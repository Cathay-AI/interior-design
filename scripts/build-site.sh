#!/bin/sh
# Assemble the full-site prototype and its two interactive studios.
# Only allow-listed files are copied. The deck is published separately on GitHub Pages.
set -eu
rm -rf dist
mkdir -p dist
cp prototype/fast-route/index.html prototype/fast-route/app.js dist/
cp -R prototype/fast-route/lib dist/lib
cp -R prototype/fast-route/vendor dist/vendor
cp -R prototype/fast-route/assets dist/assets
node scripts/bundle-room.mjs
mkdir -p dist/fast-route dist/style-studio
mv dist/index.html dist/app.js dist/lib dist/vendor dist/assets dist/fast-route/
cp prototype/wireframe/index.html prototype/wireframe/oak.css prototype/wireframe/oak.js dist/
cp -R docs/proposal/product-design/. dist/style-studio/
echo "built dist/: $(find dist -type f | wc -l) files"
