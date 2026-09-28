#!/usr/bin/env bash
# Downloads the self-hosted Ruffle Flash emulator into vendor/ruffle/.
# The site falls back to the unpkg CDN when vendor/ruffle is empty, so this
# is optional for local testing but used by the GitHub Pages workflow.
set -euo pipefail

VERSION="${RUFFLE_VERSION:-0.6.0}"
DEST="$(cd "$(dirname "$0")/.." && pwd)/vendor/ruffle"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$TMP"
npm pack "@ruffle-rs/ruffle@${VERSION}" --silent >/dev/null
tar -xzf "ruffle-rs-ruffle-${VERSION}.tgz"
mkdir -p "$DEST"
cp package/*.js package/*.wasm package/LICENSE_* "$DEST"/
rm -f "$DEST"/*.map
echo "Ruffle ${VERSION} installed in ${DEST}"
