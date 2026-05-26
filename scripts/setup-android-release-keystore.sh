#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ANDROID_DIR="${ROOT_DIR}/android"
KEYSTORE_FILE="${ANDROID_DIR}/app/readerepub-release.jks"
KEYSTORE_PROPERTIES="${ANDROID_DIR}/keystore.properties"
KEY_ALIAS="readerepub"

if [[ ! -d "${ANDROID_DIR}/app" ]]; then
  echo "找不到 android/app 目录，请先运行 npx expo prebuild 或 npm run android 生成 Android 项目。"
  exit 1
fi

if [[ -f "${KEYSTORE_FILE}" || -f "${KEYSTORE_PROPERTIES}" ]]; then
  echo "已存在 Android release keystore 配置，未覆盖："
  echo "- ${KEYSTORE_FILE}"
  echo "- ${KEYSTORE_PROPERTIES}"
  exit 0
fi

if ! command -v keytool >/dev/null 2>&1; then
  echo "找不到 keytool。请先安装 JDK，并确保 keytool 在 PATH 中。"
  exit 1
fi

STORE_PASSWORD="$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")"
KEY_PASSWORD="${STORE_PASSWORD}"

keytool -genkeypair \
  -v \
  -storetype PKCS12 \
  -keystore "${KEYSTORE_FILE}" \
  -alias "${KEY_ALIAS}" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "${STORE_PASSWORD}" \
  -keypass "${KEY_PASSWORD}" \
  -dname "CN=ReadEPUB, OU=ReadEPUB, O=ReadEPUB, L=Unknown, ST=Unknown, C=CN"

umask 077
{
  printf "READEPUB_RELEASE_STORE_FILE=%s\n" "${KEYSTORE_FILE}"
  printf "READEPUB_RELEASE_STORE_PASSWORD=%s\n" "${STORE_PASSWORD}"
  printf "READEPUB_RELEASE_KEY_ALIAS=%s\n" "${KEY_ALIAS}"
  printf "READEPUB_RELEASE_KEY_PASSWORD=%s\n" "${KEY_PASSWORD}"
} > "${KEYSTORE_PROPERTIES}"

echo "Android release keystore 已创建。"
echo "请安全备份以下两个文件；丢失后将无法为已安装用户继续发布可覆盖升级的 APK："
echo "- ${KEYSTORE_FILE}"
echo "- ${KEYSTORE_PROPERTIES}"
