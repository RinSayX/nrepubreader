#!/usr/bin/env node
/* global __dirname */

const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const packageJson = require(path.join(rootDir, "package.json"));
const buildGradlePath = path.join(rootDir, "android", "app", "build.gradle");

if (!fs.existsSync(buildGradlePath)) {
  console.error("找不到 android/app/build.gradle，请先运行 npx expo prebuild 或 npm run android 生成 Android 项目。");
  process.exit(1);
}

const versionName = packageJson.version;
const match = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(versionName);
if (!match) {
  console.error(`package.json version 不是有效的 x.y.z 格式：${versionName}`);
  process.exit(1);
}

const [, major, minor, patch] = match.map(Number);
const derivedVersionCode = major * 10000 + minor * 100 + patch;
const versionCode = Number(process.env.READEPUB_ANDROID_VERSION_CODE || derivedVersionCode);

if (!Number.isInteger(versionCode) || versionCode <= 0 || versionCode > 2100000000) {
  console.error(`Android versionCode 不合法：${versionCode}`);
  process.exit(1);
}

let source = fs.readFileSync(buildGradlePath, "utf8");
source = source.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
source = source.replace(/versionName\s+"[^"]+"/, `versionName "${versionName}"`);

fs.writeFileSync(buildGradlePath, source);
console.log(`Android version is ready: versionName=${versionName}, versionCode=${versionCode}.`);
