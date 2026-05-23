# ReadEPUB

跨平台本地 EPUB 阅读器，使用 Expo Dev Client、React Native、TypeScript、SQLite 和 WebView + epub.js 构建。

## 功能

- 本地 `.epub` 导入，复制到应用私有目录并解析标题、作者、封面和标识。
- 书库排序：最近阅读、导入时间、标题。
- 手动创建书籍系列，把书加入系列并调整系列内顺序。
- 分页阅读器，保存 `CFI` 和百分比进度，下次打开自动恢复。
- 夜间模式、中文字体、字号、行高、背景和文字颜色设置。

## 开发

```bash
npm install
npm run ios
npm run android
```

Expo SDK 55 使用 Dev Client 流程，`npm start` 会启动 `expo start --dev-client`。

## 测试

```bash
npm test
npm run typecheck
```

## 说明

阅读器 HTML 目前通过 CDN 加载 `epub.js`。如果要完全离线运行，需要把 `epub.min.js` 固化为本地 asset，并在 `src/reader/readerHtml.ts` 中改为读取本地脚本内容或注入本地脚本。
