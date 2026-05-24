# ReadEPUB

ReadEPUB 是一个本地优先的跨平台 EPUB 阅读器，基于 Expo Dev Client、React Native 和 TypeScript 构建，目标平台为 Android 和 iOS。

它专注于一个轻量、私有、可离线使用的阅读体验：导入本地 EPUB、管理书库和系列、分页阅读、保存阅读进度，并支持夜间模式和中文字体。

## Features

- 本地 EPUB 导入：通过系统文件选择器导入 `.epub` 文件，并复制到应用私有目录。
- 书库管理：未加入系列的书籍直接显示；系列以书籍卡片形式展示，并使用系列第一本书的封面。
- 系列管理：创建系列，把同一部小说的不同册放在一个系列里；一本书只属于一个系列。
- 搜索：支持按书籍名称、系列名称和作者搜索。
- 分页阅读：基于 WebView 和 epub.js 渲染 EPUB，支持上一页、下一页和左右滑动翻页。
- 阅读进度：自动保存 CFI 和百分比进度，再次打开书籍时恢复上次位置。
- 目录跳转：阅读时可从左侧目录抽屉查看章节，并跳转到指定章节。
- 阅读设置：支持夜间模式、字号、行高、背景色、文字颜色和中文字体。
- 全局夜间模式：书库、系列页、详情页、设置页和阅读页统一跟随夜间模式。
- 本地存储：书籍、系列、进度和阅读偏好都保存在本机 SQLite 和应用私有文件目录中。

## Screenshots

Screenshots are not included yet. Contributions are welcome.

## Tech Stack

- [Expo](https://expo.dev/) + Expo Dev Client
- React Native
- TypeScript
- React Navigation
- Zustand
- SQLite via `expo-sqlite`
- File access via `expo-file-system` and `expo-document-picker`
- EPUB rendering via `react-native-webview` + epub.js
- Tests with Jest

## Getting Started

### Prerequisites

- Node.js
- npm
- Android Studio for Android development
- Xcode for iOS development on macOS
- A physical device or emulator/simulator

### Install Dependencies

```bash
npm install
```

### Start the Dev Server

```bash
npm start
```

This starts Expo in Dev Client mode.

### Run on Android

```bash
npm run android
```

If icons, app name, native permissions, or other native resources do not update on the device, uninstall the previous build first:

```bash
adb uninstall com.rinsay.nrepubreader
npm run android
```

### Run on iOS

```bash
npm run ios
```

## Scripts

```bash
npm start
npm run android
npm run ios
npm run web
npm run typecheck
npm run lint
npm test
```

## Project Structure

```text
.
├── App.tsx
├── app.json
├── assets/
├── src/
│   ├── components/
│   ├── db/
│   ├── reader/
│   ├── repositories/
│   ├── screens/
│   ├── services/
│   ├── store/
│   ├── theme/
│   └── types.ts
└── __tests__/
```

## Development Notes

- This app is local-first. There is no account system, cloud sync, online bookstore, DRM support, highlights, notes, or full-text search yet.
- EPUB rendering is handled inside a WebView. React Native owns file import, storage, navigation, settings, and persistence.
- Books imported into the app are copied into the app private directory. Uninstalling the app will remove the local library and reading progress.
- The Android project uses adaptive icons. `assets/icon.png` is the general app icon; `assets/adaptive-icon.png` is the Android foreground icon with safe padding.

## Testing

Run all tests:

```bash
npm test
```

Run TypeScript checks:

```bash
npm run typecheck
```

Run ESLint:

```bash
npm run lint
```

## Roadmap

- User-imported custom fonts
- Highlights and notes
- Full-text search
- OPDS or online catalog support
- Optional backup/export for local library metadata
- Improved EPUB compatibility and offline bundled epub.js

## Contributing

Issues and pull requests are welcome.

For larger changes, please open an issue first to discuss the direction. Keep changes focused, run tests before submitting, and avoid committing generated native build output.

## License

No license has been added yet. If this repository is intended to be open source, add a license file such as MIT, Apache-2.0, or GPL before encouraging reuse.
