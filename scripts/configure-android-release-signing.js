#!/usr/bin/env node
/* global __dirname */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const buildGradlePath = path.join(rootDir, "android", "app", "build.gradle");

if (!fs.existsSync(buildGradlePath)) {
  console.error("找不到 android/app/build.gradle，请先运行 npx expo prebuild 或 npm run android 生成 Android 项目。");
  process.exit(1);
}

let source = fs.readFileSync(buildGradlePath, "utf8");

const signingVariables = `def readEPUBReleaseStoreFile = System.getenv("READEPUB_RELEASE_STORE_FILE")
def readEPUBReleaseStorePassword = System.getenv("READEPUB_RELEASE_STORE_PASSWORD")
def readEPUBReleaseKeyAlias = System.getenv("READEPUB_RELEASE_KEY_ALIAS")
def readEPUBReleaseKeyPassword = System.getenv("READEPUB_RELEASE_KEY_PASSWORD")

`;

if (!source.includes("readEPUBReleaseStoreFile")) {
  source = source.replace("android {", `${signingVariables}android {`);
}

const debugSigningBlock = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

const releaseSigningBlock = `${debugSigningBlock}
        release {
            storeFile file(readEPUBReleaseStoreFile)
            storePassword readEPUBReleaseStorePassword
            keyAlias readEPUBReleaseKeyAlias
            keyPassword readEPUBReleaseKeyPassword
        }`;

if (!source.includes("release {\n            storeFile file(readEPUBReleaseStoreFile)")) {
  if (!source.includes(debugSigningBlock)) {
    console.error("无法定位 Android debug signingConfig，请检查 android/app/build.gradle。");
    process.exit(1);
  }
  source = source.replace(debugSigningBlock, releaseSigningBlock);
}

const debugReleaseSigningLine = "            signingConfig signingConfigs.debug";
const formalReleaseSigningLine = "            signingConfig signingConfigs.release";
const releaseBuildComment = `            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
`;

if (source.includes(releaseBuildComment + debugReleaseSigningLine)) {
  source = source.replace(releaseBuildComment + debugReleaseSigningLine, formalReleaseSigningLine);
} else {
  const releaseBlockStart = source.indexOf("        release {");
  if (releaseBlockStart === -1) {
    console.error("无法定位 Android release buildType，请检查 android/app/build.gradle。");
    process.exit(1);
  }
  const afterReleaseStart = source.slice(releaseBlockStart);
  const debugLineInRelease = afterReleaseStart.indexOf(debugReleaseSigningLine);
  const formalLineInRelease = afterReleaseStart.indexOf(formalReleaseSigningLine);
  if (debugLineInRelease !== -1 && (formalLineInRelease === -1 || debugLineInRelease < formalLineInRelease)) {
    const absoluteIndex = releaseBlockStart + debugLineInRelease;
    source = `${source.slice(0, absoluteIndex)}${formalReleaseSigningLine}${source.slice(
      absoluteIndex + debugReleaseSigningLine.length
    )}`;
  }
}

fs.writeFileSync(buildGradlePath, source);
console.log("Android release signing configuration is ready.");
