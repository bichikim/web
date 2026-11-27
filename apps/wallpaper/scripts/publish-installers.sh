#!/usr/bin/env bash
set -euo pipefail

root="${1:?Installer artifact directory required}"
: "${CLOUDFLARE_ACCOUNT_ID:?Set CLOUDFLARE_ACCOUNT_ID}"
: "${AWS_ACCESS_KEY_ID:?Set WALLPAPER_R2_ACCESS_KEY_ID}"
: "${AWS_SECRET_ACCESS_KEY:?Set WALLPAPER_R2_SECRET_ACCESS_KEY}"
: "${GITHUB_RUN_ID:?GitHub run ID required}"
: "${GITHUB_RUN_ATTEMPT:?GitHub run attempt required}"
channel="${RELEASE_CHANNEL:-stable}"
case "$channel" in
  stable|beta) ;;
  *) echo "Invalid release channel" >&2; exit 1 ;;
esac
version="$(jq -er '.version' apps/wallpaper/src-tauri/tauri.conf.json)"
build="$GITHUB_RUN_ID-$GITHUB_RUN_ATTEMPT"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[[:alnum:]_.-]+)?$ && "$build" =~ ^[0-9]+-[0-9]+$ ]]
bucket=poffo-wallpaper-distribution
endpoint="https://$CLOUDFLARE_ACCOUNT_ID.r2.cloudflarestorage.com"
origin=https://wallpaper-files.pomofi.io
prefix="releases/$version/$build"
scratch="$(mktemp -d)"
trap 'rm -rf "$scratch"' EXIT

stage_installer() {
  local target="$1" id="$2" extension="$3"
  local -a inputs=("$root/poffo-wallpaper-desktop-$target-$GITHUB_RUN_ID/"*."$extension")
  if [[ "${#inputs[@]}" != 1 || ! -s "${inputs[0]}" ]]; then
    echo "Expected one installer for $target" >&2
    exit 1
  fi
  cp "${inputs[0]}" "$scratch/$id.$extension"
}
stage_installer aarch64-apple-darwin macos-arm64 dmg
stage_installer x86_64-apple-darwin macos-x64 dmg
stage_installer x86_64-pc-windows-msvc windows-x64 exe

sizes='{}'
for file in "$scratch/"*.{dmg,exe}; do
  name="${file##*/}"
  bytes="$(wc -c < "$file" | tr -d '[:space:]')"
  sha="$(sha256sum "$file" | cut -d ' ' -f 1)"
  aws s3 cp "$file" "s3://$bucket/$prefix/$name" --endpoint-url "$endpoint" \
    --only-show-errors --content-type application/octet-stream \
    --content-disposition "attachment; filename=Poffo-Wallpaper-$version-$name" \
    --cache-control 'public, max-age=31536000, immutable'
  actual_sha="$(curl --fail --silent --show-error --retry 3 "$origin/$prefix/$name" | sha256sum | cut -d ' ' -f 1)"
  if [[ "$sha" != "$actual_sha" ]]; then
    echo "Download checksum mismatch for $name" >&2
    exit 1
  fi
  sizes="$(jq -c --arg name "${name%.*}" --argjson bytes "$bytes" '. + {($name): $bytes}' <<< "$sizes")"
done

jq -n --arg version "$version" --arg build "$build" --arg channel "$channel" --argjson sizes "$sizes" \
  '{version: $version, build: $build, channel: $channel, sizes: $sizes}' > "$scratch/latest.json"
aws s3 cp "$scratch/latest.json" "s3://$bucket/releases/latest.json" --endpoint-url "$endpoint" \
  --only-show-errors --content-type application/json --cache-control 'no-store'
curl --fail --silent --show-error --retry 3 "$origin/releases/latest.json" | cmp "$scratch/latest.json" -
