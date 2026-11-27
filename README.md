# LovelyCarve 插件发布页

页面用 Vue 3 和 Vite 构建，GitHub Actions 使用 Bun 发布 `main` 的构建产物到 GitHub Pages。LovelyCarve 主仓库把这里固定为 `plugin-site/` 子模块。`docs/index.json` 是插件市场的官方索引：桌面版的「设置 → 插件市场」、CLI `plugin market` 和页面上的一键安装都只读取它。界面设计见 [DESIGN.md](DESIGN.md)。

[插件发布页](https://lovelyteams.github.io/LovelyCarve-Plugin-Site/) · [官方索引](https://lovelyteams.github.io/LovelyCarve-Plugin-Site/index.json) · [索引格式](https://github.com/LovelyTeams/LovelyCarve/blob/main/docs/PLUGIN_PROTOCOL.md#插件市场)

## 自荐插件

通过[插件自荐表单](https://github.com/LovelyTeams/LovelyCarve-Plugin-Site/issues/new?template=plugin-submission.yml)提交插件用途、项目地址、可安装的 `.lcpkg` 和兼容版本。请上传至少一张能看清插件实际输出的截图。

## 本地开发

Bun 负责依赖安装、测试和 Vite 构建。可用 `bun run typecheck` 单独检查 Vue 模板，该命令需要 Node.js 24，也会在发布前由 CI 执行。

```sh
bun install --frozen-lockfile
bun run dev
bun test
bun run build
```

构建会把 `docs/` 内的市场索引、插件包和品牌资源原样复制到 `dist/`。用 `bun run preview` 查看构建产物。

## 发布插件

1. 在 LovelyCarve 主仓库的干净工作树运行 `just pack-plugins`。
2. 将要发布的 `.lcpkg` 复制到本仓库的 `docs/`。每个插件版本和运行平台只保留一个包。已发布的包保持原文件名和字节。
3. 在主仓库运行 `just market-index plugin-site/docs LovelyCarve`。索引会读取包的清单和动态库头，保留已有包的发布日期并计算大小与 SHA-256。
4. 用 `bun run dev` 预览。检查下载与索引后，将站点仓库改动提交到 `main`，等待 GitHub Pages 部署，然后更新主仓库的子模块指针。

网页代码与自有图像采用 AGPL-3.0-only。品牌插画来自 LovelyCarve 的 `src/assets/app-icon-background.png`，标题栏图标来自 `src/assets/app-icon.png`，站点图标来自 `src-tauri/icons/32x32.png`。Quicksand 的许可见 [OFL](docs/assets/OFL.txt)。构建与发布记录随插件包附带。
