# 苹果快捷指令 (Shortcuts) 集成指南

想在 iPhone 上通过快捷指令直接获取最新的《新闻联播》文字稿？这里有教程！

## 方法 1: 本地 API 服务器 (推荐，即时获取)

如果你在电脑（或服务器）上运行此项目，可以使用 API。

1. **启动服务器**:
   ```bash
   npm start
   # 或
   node server.js
   ```
   确保你的电脑和 iPhone 在同一个 Wi-Fi 网络下。找到你电脑的局域网 IP 地址（例如 `192.168.1.5`）。

2. **创建快捷指令**:
   - 打开 iPhone 上的 **快捷指令 (Shortcuts)** 应用。
   - 点击 **+** 创建新快捷指令。
   - 添加 **获取 URL 内容 (Get Contents of URL)** 操作。
     - URL: `http://192.168.1.5:3000/api/news/latest` (请将 IP 替换为你电脑的 IP)
     - 方法: `GET`
   - 添加 **获取字典值 (Get Dictionary Value)** 操作。
     - 键 (Key): `content`
   - 添加 **从富文本制作 Markdown (Make Markdown from Rich Text)** (可选，用于更好的格式) 或直接查看。
   - 添加 **快速查看 (Quick Look)** 或 **显示结果 (Show Result)** 来阅读新闻。

## 方法 2: GitHub 原始内容 (无服务器，推荐)

如果你已经将此项目部署到 GitHub 并启用了 GitHub Action (每日自动更新)，你可以直接获取原始文件。

1. **获取 URL**:
   **注意**: 必须使用 `raw.githubusercontent.com` 开头的链接。
   
   URL 模板为:
   `https://raw.githubusercontent.com/LuckyLivio/XWLBConclusion/main/news/<YYYYMMDD>.md`

   例如: `https://raw.githubusercontent.com/LuckyLivio/XWLBConclusion/main/news/20260305.md`

2. **创建快捷指令**:
   - 添加 **日期 (Date)** 操作 (当前日期)。
   - 添加 **格式化日期 (Format Date)** 操作。
     - 格式字符串: `yyyyMMdd`
   - 添加 **文本 (Text)** 操作 (拼接 URL)。
     - 输入: `https://raw.githubusercontent.com/LuckyLivio/XWLBConclusion/main/news/`
     - 接着插入变量: `格式化后的日期`
     - 接着输入: `.md`
   - 添加 **获取 URL 内容 (Get Contents of URL)** 操作。
     - URL: `文本` (上面拼接好的结果)
     - 方法: `GET`
   - 添加 **从 Markdown 制作富文本 (Make Rich Text from Markdown)**。
   - 添加 **快速查看 (Quick Look)**。

## 自动推送 (Automatic Pushing)

本项目现包含一个 GitHub Action `.github/workflows/daily-fetch.yml`，它会在每天 UTC 时间 12:00 (北京时间 20:00) 自动运行，抓取新闻并推送到仓库。
你只需要将此代码推送到 GitHub 即可启用。
