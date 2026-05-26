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

const signingVariables = `def readEPUBKeystoreProperties = new Properties()
def readEPUBKeystorePropertiesFile = rootProject.file("keystore.properties")
if (readEPUBKeystorePropertiesFile.exists()) {
    readEPUBKeystoreProperties.load(new FileInputStream(readEPUBKeystorePropertiesFile))
}

def readEPUBReleaseStoreFile = System.getenv("READEPUB_RELEASE_STORE_FILE") ?: readEPUBKeystoreProperties["READEPUB_RELEASE_STORE_FILE"]
def readEPUBReleaseStorePassword = System.getenv("READEPUB_RELEASE_STORE_PASSWORD") ?: readEPUBKeystoreProperties["READEPUB_RELEASE_STORE_PASSWORD"]
def readEPUBReleaseKeyAlias = System.getenv("READEPUB_RELEASE_KEY_ALIAS") ?: readEPUBKeystoreProperties["READEPUB_RELEASE_KEY_ALIAS"]
def readEPUBReleaseKeyPassword = System.getenv("READEPUB_RELEASE_KEY_PASSWORD") ?: readEPUBKeystoreProperties["READEPUB_RELEASE_KEY_PASSWORD"]
def hasReadEPUBReleaseSigning = readEPUBReleaseStoreFile &&
    readEPUBReleaseStorePassword &&
    readEPUBReleaseKeyAlias &&
    readEPUBReleaseKeyPassword &&
    file(readEPUBReleaseStoreFile).exists()

`;

const legacySigningVariables = `def readEPUBReleaseStoreFile = System.getenv("READEPUB_RELEASE_STORE_FILE")
def readEPUBReleaseStorePassword = System.getenv("READEPUB_RELEASE_STORE_PASSWORD")
def readEPUBReleaseKeyAlias = System.getenv("READEPUB_RELEASE_KEY_ALIAS")
def readEPUBReleaseKeyPassword = System.getenv("READEPUB_RELEASE_KEY_PASSWORD")

`;

if (source.includes(legacySigningVariables)) {
  source = source.replace(legacySigningVariables, signingVariables);
} else if (!source.includes("readEPUBKeystoreProperties") && !source.includes("readEPUBReleaseStoreFile")) {
  source = source.replace("android {", `${signingVariables}android {`);
}

const debugSigningBlock = `        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }`;

const releaseSigningBlock = `${debugSigningBlock}
        if (hasReadEPUBReleaseSigning) {
            release {
                storeFile file(readEPUBReleaseStoreFile)
                storePassword readEPUBReleaseStorePassword
                keyAlias readEPUBReleaseKeyAlias
                keyPassword readEPUBReleaseKeyPassword
            }
        }`;

const legacyReleaseSigningBlock = `${debugSigningBlock}
        release {
            storeFile file(readEPUBReleaseStoreFile)
            storePassword readEPUBReleaseStorePassword
            keyAlias readEPUBReleaseKeyAlias
            keyPassword readEPUBReleaseKeyPassword
        }`;

if (source.includes(legacyReleaseSigningBlock)) {
  source = source.replace(legacyReleaseSigningBlock, releaseSigningBlock);
} else if (!source.includes("storeFile file(readEPUBReleaseStoreFile)")) {
  if (!source.includes(debugSigningBlock)) {
    console.error("无法定位 Android debug signingConfig，请检查 android/app/build.gradle。");
    process.exit(1);
  }
  source = source.replace(debugSigningBlock, releaseSigningBlock);
}

source = source.replace(
  `        debug {
            signingConfig signingConfigs.release
        }`,
  `        debug {
            if (hasReadEPUBReleaseSigning) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }
        }`
);

source = updateReleaseBuildTypeSigning(source);

fs.writeFileSync(buildGradlePath, source);
console.log("Android release signing configuration is ready.");

function updateReleaseBuildTypeSigning(sourceText) {
  const buildTypesStart = sourceText.indexOf("    buildTypes {");
  if (buildTypesStart === -1) {
    console.error("无法定位 Android buildTypes，请检查 android/app/build.gradle。");
    process.exit(1);
  }

  const releaseBlockStart = sourceText.indexOf("        release {", buildTypesStart);
  if (releaseBlockStart === -1) {
    console.error("无法定位 Android release buildType，请检查 android/app/build.gradle。");
    process.exit(1);
  }

  const releaseBlockEnd = findBlockEnd(sourceText, sourceText.indexOf("{", releaseBlockStart));
  const releaseBlock = sourceText.slice(releaseBlockStart, releaseBlockEnd + 1);
  if (releaseBlock.includes("hasReadEPUBReleaseSigning")) {
    return sourceText;
  }

  const releaseSigningConfigBlock = `            if (hasReadEPUBReleaseSigning) {
                signingConfig signingConfigs.release
            } else {
                signingConfig signingConfigs.debug
            }`;
  const releaseBuildComment = `            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
`;
  const nextReleaseBlock = releaseBlock
    .replace(releaseBuildComment, "")
    .replace("            signingConfig signingConfigs.debug", releaseSigningConfigBlock)
    .replace("            signingConfig signingConfigs.release", releaseSigningConfigBlock);

  return `${sourceText.slice(0, releaseBlockStart)}${nextReleaseBlock}${sourceText.slice(releaseBlockEnd + 1)}`;
}

function findBlockEnd(sourceText, openingBraceIndex) {
  let depth = 0;
  for (let index = openingBraceIndex; index < sourceText.length; index += 1) {
    const char = sourceText[index];
    if (char === "{") {
      depth += 1;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  console.error("Android build.gradle 块结构不完整，请检查文件。");
  process.exit(1);
}
