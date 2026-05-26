#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(node -p "require('${ROOT_DIR}/package.json').version")"
OUTPUT_DIR="${ROOT_DIR}/dist"
ABIS=("armeabi-v7a" "arm64-v8a")
KEYSTORE_PROPERTIES="${ROOT_DIR}/android/keystore.properties"

if [[ ! -f "${KEYSTORE_PROPERTIES}" ]]; then
  echo "缺少 Android release keystore 配置：${KEYSTORE_PROPERTIES}"
  echo "请先运行：npm run setup:android-release-keystore"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "${KEYSTORE_PROPERTIES}"
set +a

required_vars=(
  READEPUB_RELEASE_STORE_FILE
  READEPUB_RELEASE_STORE_PASSWORD
  READEPUB_RELEASE_KEY_ALIAS
  READEPUB_RELEASE_KEY_PASSWORD
)

for var_name in "${required_vars[@]}"; do
  if [[ -z "${!var_name:-}" ]]; then
    echo "Android release keystore 配置缺少 ${var_name}。"
    exit 1
  fi
done

if [[ ! -f "${READEPUB_RELEASE_STORE_FILE}" ]]; then
  echo "找不到 Android release keystore 文件：${READEPUB_RELEASE_STORE_FILE}"
  exit 1
fi

node "${ROOT_DIR}/scripts/configure-android-release-signing.js"
node "${ROOT_DIR}/scripts/configure-android-version.js"

mkdir -p "${OUTPUT_DIR}"
rm -f "${OUTPUT_DIR}/ReadEPUB-v${VERSION}-android.apk"
rm -f "${OUTPUT_DIR}/ReadEPUB-v${VERSION}-android-"*.apk

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
