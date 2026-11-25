# LovelyCarve 插件发布页

静态站点通过 GitHub Pages 从 `main` 的 `/docs` 目录发布。LovelyCarve 主仓库把这里固定为 `plugin-site/` 子模块。页面与桌面端插件市场共用 `docs/index.json`。

[插件发布页](https://lovelyteams.github.io/LovelyCarve-Plugin-Site/) · [市场索引](https://lovelyteams.github.io/LovelyCarve-Plugin-Site/index.json) · [索引格式](https://github.com/LovelyTeams/LovelyCarve/blob/main/docs/PLUGIN_PROTOCOL.md#插件市场)

## 发布插件

1. 在 LovelyCarve 主仓库的干净工作树运行 `just pack-plugins`。
2. 将要发布的 `.lcpkg` 复制到本仓库的 `docs/`。每个插件版本和运行平台只保留一个包。已发布的包保持原文件名和字节。
3. 在主仓库运行 `just market-index plugin-site/docs LovelyCarve`。索引会读取包的清单和动态库头，保留已有包的发布日期并计算大小与 SHA-256。
4. 用 `python -m http.server 8000 --directory docs` 预览。检查下载与索引后，将站点仓库改动提交到 `main`，然后更新主仓库的子模块指针。

网页代码与自有图像采用 AGPL-3.0-only。品牌插画来自 LovelyCarve 的 `src/assets/app-icon.png`，站点图标来自 `src-tauri/icons/32x32.png`。Quicksand 的许可见 [OFL](docs/assets/OFL.txt)。构建与发布记录随插件包附带。
