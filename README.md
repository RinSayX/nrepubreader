# ReadEPUB

ReadEPUB 是一个本地优先的跨平台 EPUB/TXT 阅读器，基于 Expo Dev Client、React Native 和 TypeScript 构建，目标平台为 Android 和 iOS。

它专注于一个轻量、私有、可离线使用的阅读体验：导入本地 EPUB/TXT、管理书库和系列、分页阅读、保存阅读进度，并支持夜间模式和中文字体。

## 功能特性

- 本地书籍导入：通过系统文件选择器导入 `.epub` 和 `.txt` 文件，并复制到应用私有目录。
- 书库管理：未加入系列的书籍直接显示；系列以书籍卡片形式展示，并使用系列第一本书的封面。
- 系列管理：创建系列，把同一部小说的不同册放在一个系列里；一本书只属于一个系列。
- 搜索：支持按书籍名称、系列名称和作者搜索。
- 分页阅读：EPUB 基于 WebView 和 epub.js 渲染，TXT 使用 WebView 分栏分页，支持上一页、下一页和左右滑动翻页。
- TXT 自动目录：支持识别常见中文章节标题；无目录 TXT 会按固定长度生成分段目录。
- 阅读进度：自动保存 EPUB CFI、TXT 字符位置和整本书百分比，再次打开书籍时恢复上次位置。
- 目录跳转：阅读时可从左侧目录抽屉查看章节，并跳转到指定章节。
- 阅读设置：支持夜间模式、字号、行高、背景色、文字颜色和中文字体。
- 全局夜间模式：书库、系列页、详情页、设置页和阅读页统一跟随夜间模式。
- 本地存储：书籍、系列、进度和阅读偏好都保存在本机 SQLite 和应用私有文件目录中。

## 截图

暂未添加截图，欢迎补充。

## 技术栈

- [Expo](https://expo.dev/) + Expo Dev Client
- React Native
- TypeScript
- React Navigation
- Zustand
- 基于 `expo-sqlite` 的 SQLite 本地存储
- 基于 `expo-file-system` 和 `expo-document-picker` 的文件访问
- 基于 `react-native-webview` + epub.js 的 EPUB 渲染
- 基于 WebView 分栏分页的 TXT 渲染
- 基于 Jest 的测试

## 快速开始

### 环境要求

- Node.js
- npm
- Android 开发需要 Android Studio
- iOS 开发需要 macOS 和 Xcode
- 一台物理设备，或 Android 模拟器 / iOS 模拟器

### 安装依赖

```bash
npm install
```

### 启动开发服务

```bash
npm start
```

该命令会以 Expo Dev Client 模式启动开发服务。

### 部署到 Android

```bash
npm run android
```

### 部署到 iOS

```bash
npm run ios
```

## 常用命令

```bash
npm start
npm run android
npm run ios
npm run web
npm run typecheck
npm run lint
npm test
```

## 项目结构

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

## 开发说明

- 该应用采用本地优先设计。目前没有账号系统、云同步、在线书城、DRM 支持、划线、笔记和全文搜索等功能。
- EPUB 和 TXT 渲染都在 WebView 内完成。React Native 负责文件导入、本地存储、页面导航、阅读设置和数据持久化。
- 导入的书籍会被复制到应用私有目录。卸载应用会删除本地书库和阅读进度，但不会删除原书籍文件。
- Android 项目使用自适应图标。`assets/icon.png` 是通用应用图标；`assets/adaptive-icon.png` 是带安全边距的 Android 前景图标。当前图标由 AI 辅助生成并经项目维护者整理后使用。
- EPUB 阅读器依赖 JSZip 和 epub.js。二者都作为 npm 依赖锁定版本，并通过 `npm run generate:reader-vendor` 从 `node_modules` 生成本地 reader vendor 脚本，避免运行时从 CDN 加载。

## 测试

运行全部测试：

```bash
npm test
```

运行 TypeScript 检查：

```bash
npm run typecheck
```

运行 ESLint：

```bash
npm run lint
```

## 参与贡献

欢迎提交 Issue 和 Pull Request。

如果要进行较大的功能改动，建议先创建 Issue 讨论方向。请尽量保持改动聚焦，提交前运行测试，并避免提交生成的原生构建产物。

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。

第三方依赖、字体和视觉资源遵循其各自许可证，详见 [第三方组件与许可证声明](./THIRD_PARTY_NOTICES.md)。
