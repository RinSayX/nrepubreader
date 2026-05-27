# ReadEPUB

English | [简体中文](./README.md)

ReadEPUB is a local-only, offline cross-platform EPUB/TXT reader built with Expo Dev Client, React Native, and TypeScript. It targets Android and iOS.

The project focuses on a lightweight and private reading experience: importing local EPUB/TXT files, managing a library and series, paginated reading, reading progress persistence, dark mode, Chinese font support, and Chinese/English UI.

## Table of Contents

- [Features](#features)
- [Download](#download)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Android Release Builds](#android-release-builds)
- [Common Commands](#common-commands)
- [Project Structure](#project-structure)
- [Development Notes](#development-notes)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Features

- Local-only and offline: no account system, no cloud sync, no online bookstore. Books and reading data stay on the device.
- Local book import: import `.epub` and `.txt` files through the system file picker and copy them into the app private directory.
- Multi-file import: select and import multiple books at once, with metadata and covers completed after the initial import.
- Library management: books outside a series are shown directly; series are displayed as book-like cards using the first book cover.
- Series management: group different volumes of the same novel into one series; each book can belong to only one series.
- Search: search by book title, series name, and author.
- Paginated reading: EPUB is rendered with WebView and epub.js; TXT is rendered with WebView columns.
- Page navigation: previous/next controls, left/right tap zones, and horizontal swipe gestures.
- TXT chapter detection: recognizes common Chinese chapter headings; TXT files without headings are split into generated sections.
- Reading progress: stores EPUB CFI, TXT character position, and whole-book percentage, then restores the last position when reopened.
- Table of contents: open a left-side drawer while reading, view chapters, and jump to a selected chapter.
- Reader settings: dark mode, font size, line height, background color, text color, and Noto Sans SC.
- Language setting: Chinese and English.
- Global dark mode: the library, series pages, detail pages, settings, and reader all follow the selected mode.

## Download

Android APKs are available from [GitHub Releases](https://github.com/RinSayX/nrepubreader/releases).

Current releases provide ARM APKs:

- `arm64-v8a`: for most modern Android phones.
- `armeabi-v7a`: for 32-bit ARM devices.

> iOS is currently intended for source builds and local debugging. No public iOS package is provided yet.

## Screenshots

<table>
  <tr>
    <td><img src="screenshots/Image_01.jpg" width="250"></td>
    <td><img src="screenshots/Image_02.jpg" width="250"></td>
    <td><img src="screenshots/Image_03.jpg" width="250"></td>
    <td><img src="screenshots/Image_04.jpg" width="250"></td>
  </tr>
</table>

## Tech Stack

- [Expo](https://expo.dev/) + Expo Dev Client
- React Native
- TypeScript
- React Navigation
- Zustand
- SQLite local storage with `expo-sqlite`
- File access with `expo-file-system` and `expo-document-picker`
- EPUB rendering with `react-native-webview` and epub.js
- TXT rendering with WebView columns
- Jest tests

## Getting Started

### Requirements

- Node.js
- npm
- Android Studio for Android development
- macOS and Xcode for iOS development
- A physical device, Android emulator, or iOS simulator

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm start
```

This generates the local reader vendor script required by the WebView reader and starts Expo in Dev Client mode.

### Run on Android

```bash
npm run android
```

### Run on iOS

```bash
npm run ios
```

## Android Release Builds

Before building release APKs for the first time, generate a stable Android release keystore on your machine:

```bash
npm run setup:android-release-keystore
```

This command creates:

- `android/app/readerepub-release.jks`
- `android/keystore.properties`

These files contain the release signing key and passwords. They are excluded by `.gitignore` and must not be committed. Keep an offline backup; all future Android releases must use the same keystore, otherwise users cannot install updates over existing installations.

After the keystore is created, build ARM APKs:

```bash
npm run build:android:release-apks
```

Build outputs are written to the `dist/` directory.

## Common Commands

```bash
npm start
npm run android
npm run ios
npm run web
npm run generate:reader-vendor
npm run setup:android-release-keystore
npm run build:android:release-apks
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
├── scripts/
├── src/
│   ├── navigation/
│   ├── components/
│   ├── db/
│   ├── features/
│   │   ├── library/
│   │   ├── reader/
│   │   ├── series/
│   │   └── settings/
│   ├── i18n/
│   ├── repositories/
│   ├── services/
│   ├── theme/
│   └── types/
└── __tests__/
```

## Development Notes

- The app is local-only and offline. There is currently no account system, network sync, online bookstore, DRM support, highlights, notes, or full-text search.
- EPUB and TXT rendering happen inside WebView. React Native handles file import, local storage, navigation, reader settings, and persistence.
- Imported books are copied into the app private directory. Uninstalling the app removes the local library and reading progress, but does not delete the original source files.
- Android release APKs use a stable local keystore. Changing the keystore prevents upgrade installs over previous releases; users usually need to uninstall and reinstall, which removes data in the app private directory.
- Android uses adaptive icons. `assets/icon.png` is the general app icon, and `assets/adaptive-icon.png` is the Android foreground icon with safe padding. The current icon was AI-assisted and curated by the maintainer.
- The EPUB reader depends on JSZip and epub.js. Both are pinned npm dependencies, and `npm run generate:reader-vendor` generates the local reader vendor script from `node_modules`.

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

## Contributing

Issues and Pull Requests are welcome.

For larger changes, please open an Issue first to discuss the direction. Keep changes focused, run checks before submitting, and avoid committing native build outputs, signing files, personal configuration, or imported book files.

## License

This project is licensed under the [MIT License](./LICENSE).

Third-party dependencies, fonts, and visual assets are governed by their respective licenses. See [Third Party Notices](./THIRD_PARTY_NOTICES.md).
