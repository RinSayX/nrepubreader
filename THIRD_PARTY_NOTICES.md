# Third-Party Notices

ReadEPUB is licensed under the MIT License. Third-party software, fonts, and assets included in or used by this project are licensed under their respective licenses.

This notice summarizes notable direct dependencies and bundled assets. The complete dependency inventory is defined by `package.json` and `package-lock.json`.

## Bundled Reader Dependencies

The following libraries are bundled into `src/reader/vendorScripts.ts` and distributed with the application package.

| Component | Version | Purpose | License | Source |
| --- | --- | --- | --- | --- |
| JSZip | 3.10.1 | ZIP reading for EPUB files | MIT OR GPL-3.0-or-later | https://github.com/Stuk/jszip |
| epub.js | 0.3.93 | EPUB rendering in WebView | BSD-2-Clause | https://github.com/futurepress/epub.js |

JSZip is dual-licensed. This project uses JSZip under the MIT License option.

## Runtime Dependencies

| Component | Purpose | License |
| --- | --- | --- |
| Expo / Expo SDK modules | React Native application runtime and native APIs | MIT |
| React / React Native | UI and native application runtime | MIT |
| React Navigation | Navigation | MIT |
| Zustand | State management | MIT |
| react-native-webview | WebView container for EPUB/TXT reading | MIT |
| fast-xml-parser | EPUB metadata XML parsing | MIT |

## Fonts

| Component | Version | Purpose | License | Source |
| --- | --- | --- | --- | --- |
| @expo-google-fonts/noto-sans-sc | 0.4.3 | Noto Sans SC font package | MIT AND OFL-1.1 | https://github.com/expo/google-fonts |
| Noto Sans SC font files | bundled by @expo-google-fonts/noto-sans-sc | Chinese font rendering | SIL Open Font License 1.1 | https://fonts.google.com/noto/specimen/Noto+Sans+SC |

## Project Assets

| Asset | Purpose | Source / License |
| --- | --- | --- |
| `assets/icon.png` | Application icon | AI-generated project asset |
| `assets/adaptive-icon.png` | Android adaptive icon foreground | AI-generated project asset |

## License Text Locations

Representative upstream license files are available in installed dependencies after `npm install`:

| Component | Local license file |
| --- | --- |
| JSZip | `node_modules/jszip/LICENSE.markdown` |
| epub.js | `node_modules/epubjs/license` |
| @expo-google-fonts/noto-sans-sc package | `node_modules/@expo-google-fonts/noto-sans-sc/LICENSE` |
| Noto Sans SC font files | `node_modules/@expo-google-fonts/noto-sans-sc/LICENSE_FONT` |

