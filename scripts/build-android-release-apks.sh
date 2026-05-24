#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('${ROOT_DIR}/package.json').version")"
OUTPUT_DIR="${ROOT_DIR}/dist"
ABIS=("armeabi-v7a" "arm64-v8a" "x86" "x86_64")

mkdir -p "${OUTPUT_DIR}"
rm -f "${OUTPUT_DIR}/ReadEPUB-v${VERSION}-android.apk"

for ABI in "${ABIS[@]}"; do
  echo "Building ReadEPUB ${VERSION} for ${ABI}..."
  (
    cd "${ROOT_DIR}/android"
    ./gradlew assembleRelease \
      -PreactNativeArchitectures="${ABI}" \
      -Pandroid.enableSeparateBuildPerCPUArchitecture=false
  )

  cp \
    "${ROOT_DIR}/android/app/build/outputs/apk/release/app-release.apk" \
    "${OUTPUT_DIR}/ReadEPUB-v${VERSION}-android-${ABI}.apk"
done

echo "Android APKs written to ${OUTPUT_DIR}:"
ls -lh "${OUTPUT_DIR}"/ReadEPUB-v"${VERSION}"-android-*.apk
