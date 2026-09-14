#!/usr/bin/env bash
set -Eeuo pipefail

SERVICE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ROOT_DIR="$(cd "$SERVICE_DIR/.." && pwd)"
# shellcheck disable=SC1091
source "$ROOT_DIR/scripts/release/common.sh"

VERSION=""
TARGET=""
FORMAT="deb"
STAGING=""
OUTPUT=""
LOCAL_RELEASE_DIR=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --version) VERSION="$2"; shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    --format) FORMAT="$2"; shift 2 ;;
    --staging) STAGING="$2"; shift 2 ;;
    --output) OUTPUT="$2"; shift 2 ;;
    --local-release-dir) LOCAL_RELEASE_DIR="$2"; shift 2 ;;
    *) die "Unknown Frontend packaging argument: $1" 2 ;;
  esac
done

[ -n "$VERSION" ] && [ -n "$TARGET" ] && [ -n "$STAGING" ] && [ -n "$OUTPUT" ] ||
  die "Frontend packaging requires --version, --target, --staging and --output" 2
validate_semver "$VERSION"
assert_local_target "$TARGET"
assert_inside_workspace "$STAGING"
assert_inside_workspace "$OUTPUT"
require_command node
require_command npm
require_file "$SERVICE_DIR/package-lock.json"
if [ -n "$LOCAL_RELEASE_DIR" ]; then
  require_file "$LOCAL_RELEASE_DIR/release.json"
  require_file "$LOCAL_RELEASE_DIR/checksums.sha256"
  [ -d "$LOCAL_RELEASE_DIR/components" ] || die "Local release has no components directory: $LOCAL_RELEASE_DIR" 3
  node --input-type=module - "$LOCAL_RELEASE_DIR/release.json" "$VERSION" <<'NODE' || die "Local release version does not match Frontend version" 3
import fs from 'node:fs';
const [, , manifestPath, version] = process.argv;
if (JSON.parse(fs.readFileSync(manifestPath, 'utf8')).release !== version) process.exit(1);
NODE
fi

case "$FORMAT" in
  deb) MAKER="@electron-forge/maker-deb" ;;
  rpm) MAKER="@electron-forge/maker-rpm" ;;
  squirrel) MAKER="@electron-forge/maker-squirrel" ;;
  zip) MAKER="@electron-forge/maker-zip" ;;
  *) die "Unsupported Frontend format: $FORMAT" 2 ;;
esac
case "$TARGET:$FORMAT" in
  linux-*:deb|linux-*:rpm|win32-*:squirrel|darwin-*:zip) ;;
  *) die "Frontend format $FORMAT is not valid for target $TARGET" 2 ;;
esac

rm -rf "$STAGING"
SOURCE_DIR="$STAGING/source"
mkdir -p "$SOURCE_DIR" "$OUTPUT/installers" "$OUTPUT/.metadata/$TARGET" "$OUTPUT/logs"
LOG_FILE="$OUTPUT/logs/frontend.log"

log_info "Preparing versioned Frontend staging"
tar \
  --exclude='./.git' \
  --exclude='./node_modules' \
  --exclude='./out' \
  --exclude='./.vite' \
  --exclude='./coverage' \
  --exclude='./playwright-report' \
  --exclude='./test-results' \
  --exclude='./.env' \
  --exclude='./.env.*' \
  -cf - -C "$SERVICE_DIR" . | tar -xf - -C "$SOURCE_DIR"
run_logged "$LOG_FILE.version" npm --prefix "$SOURCE_DIR" version "$VERSION" \
  --no-git-tag-version --allow-same-version --ignore-scripts

node --input-type=module - "$SOURCE_DIR/standalone-release-source.json" "$LOCAL_RELEASE_DIR" <<'NODE'
import fs from 'node:fs';
const [, , file, directory] = process.argv;
fs.writeFileSync(file, `${JSON.stringify({ schemaVersion: 1, directory: directory || null }, null, 2)}\n`);
NODE
if [ -n "$LOCAL_RELEASE_DIR" ]; then
  log_info "Configuring Frontend to use local release assets: $LOCAL_RELEASE_DIR"
fi

log_info "Installing and testing Frontend staging"
run_logged "$LOG_FILE" npm --prefix "$SOURCE_DIR" ci --ignore-scripts
run_logged "$LOG_FILE.test" npm --prefix "$SOURCE_DIR" run test

log_info "Packaging Frontend with $MAKER"
run_logged "$LOG_FILE.make" npm --prefix "$SOURCE_DIR" run make -- --targets "$MAKER"

PACKAGE_DIR="$(find "$SOURCE_DIR/out" -maxdepth 2 -type d \( -name '*-x64' -o -name '*-arm64' \) | head -1)"
[ -n "$PACKAGE_DIR" ] || die "Electron Forge package directory not found" 5
run_logged "$LOG_FILE.smoke" node "$SERVICE_DIR/scripts/smoke-package.mjs" "$PACKAGE_DIR" "$VERSION"

case "$FORMAT" in
  deb) PATTERN='*.deb'; INSTALLER_EXT='deb' ;;
  rpm) PATTERN='*.rpm'; INSTALLER_EXT='rpm' ;;
  squirrel) PATTERN='*.exe'; INSTALLER_EXT='exe' ;;
  zip) PATTERN='*.zip'; INSTALLER_EXT='zip' ;;
esac
SOURCE_ARTIFACT="$(find "$SOURCE_DIR/out/make" -type f -name "$PATTERN" | head -1)"
[ -n "$SOURCE_ARTIFACT" ] || die "Frontend installer not found for format $FORMAT" 4
NAME="documents-frontend-v${VERSION}-${TARGET}.${INSTALLER_EXT}"
cp "$SOURCE_ARTIFACT" "$OUTPUT/installers/$NAME"

REVISION="$(git_revision "$SERVICE_DIR")"
node - "$OUTPUT/.metadata/$TARGET/frontend.json" "$VERSION" "$TARGET" "installers/$NAME" "$REVISION" <<'NODE'
import fs from 'node:fs';
const [, , file, version, target, artifact, revision] = process.argv;
fs.writeFileSync(file, `${JSON.stringify({
  component: 'frontend', version, target, artifact,
  runtime: { electron: true }, source: { repository: 'frontend', revision },
}, null, 2)}\n`);
NODE

log_info "Frontend installer created: $OUTPUT/installers/$NAME"
