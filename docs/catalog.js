const english = new URLSearchParams(window.location.search).get("lang") === "en";
const locale = english ? "en" : "zh-CN";
const copy = english ? {
  loading: "Loading plugins…",
  empty: "No plugins have been published yet.",
  failure: "Could not load the plugin catalog. Open the market index or try again later.",
  index: "Open market index",
  count: (count) => `${count} ${count === 1 ? "plugin" : "plugins"}`,
  download: "Download",
  checksum: "SHA-256 checksum",
  copied: "Market URL copied.",
  manual: "Select and copy the market URL from the link above.",
} : {
  loading: "正在读取插件…",
  empty: "暂无已发布的插件。",
  failure: "插件列表加载失败。你可以打开市场索引，或稍后重试。",
  index: "打开市场索引",
  count: (count) => `${count} 个插件`,
  download: "下载",
  checksum: "SHA-256 校验值",
  copied: "已复制市场源地址。",
  manual: "请选中上方的市场源地址并手动复制。",
};

const catalog = document.querySelector("#catalog");
const status = document.querySelector("#catalog-status");
const indexURL = new URL("./index.json", document.baseURI);
const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" });
const numberFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

document.documentElement.lang = locale;
if (english) {
  document.title = "Plugin releases · LovelyCarve";
  for (const element of document.querySelectorAll("[data-en]")) {
    element.textContent = element.dataset.en;
  }
  for (const element of document.querySelectorAll("[data-en-label]")) {
    element.setAttribute("aria-label", element.dataset.enLabel);
  }
  document.querySelector('meta[name="description"]').content =
    "Download LovelyCarve plugins or add the official market source in the app.";
}

const languageLink = document.querySelector("#language");
if (english) {
  languageLink.textContent = "简体中文";
  languageLink.lang = "zh-CN";
  languageLink.hreflang = "zh-CN";
}
function updateLanguageLink() {
  const alternate = new URL(window.location.href);
  if (english) alternate.searchParams.delete("lang");
  else alternate.searchParams.set("lang", "en");
  languageLink.href = alternate;
}
updateLanguageLink();
window.addEventListener("hashchange", updateLanguageLink);

function fromTemplate(id) {
  return document.getElementById(id).content.firstElementChild.cloneNode(true);
}

function setText(parent, selector, value) {
  parent.querySelector(selector).textContent = value;
}

function sizeLabel(size) {
  if (size >= 1024 ** 2) return `${numberFormat.format(size / 1024 ** 2)} MiB`;
  if (size >= 1024) return `${numberFormat.format(size / 1024)} KiB`;
  return `${numberFormat.format(size)} B`;
}

function platformLabel(platform) {
  const separator = platform.lastIndexOf("-");
  const system = platform.slice(0, separator);
  const arch = platform.slice(separator + 1);
  const systems = { windows: "Windows", linux: "Linux", macos: "macOS" };
  const architectures = { x86_64: "x64", aarch64: "ARM64", x86: "x86" };
  return systems[system] ? `${systems[system]} ${architectures[arch] ?? arch}` : platform;
}

function packageURL(value) {
  const url = new URL(value, indexURL);
  const directory = new URL("./", indexURL);
  const local = url.origin === directory.origin && url.pathname.startsWith(directory.pathname);
  if ((!local && url.protocol !== "https:") || url.username || url.password || url.hash) {
    throw new Error("Unexpected package URL");
  }
  return url;
}

function renderDownload(artifact, name, version) {
  const entry = fromTemplate("package-template");
  const platform = platformLabel(artifact.platform);
  const link = entry.querySelector(".download-link");
  const url = packageURL(artifact.url);
  link.href = url;
  link.setAttribute("aria-label", `${copy.download} ${name} v${version} · ${platform}`);
  setText(entry, ".download-label", `${copy.download} .lcpkg`);
  setText(entry, ".platform", platform);
  setText(entry, ".size", sizeLabel(artifact.size));

  const summary = entry.querySelector("summary");
  summary.textContent = copy.checksum;
  summary.setAttribute("aria-label", `${copy.checksum} · ${name} v${version} · ${platform}`);
  setText(entry, "code", artifact.sha256);
  return entry;
}

function renderVersion(release, name) {
  const row = fromTemplate("version-template");
  setText(row, ".version-number", `v${release.version}`);
  const date = row.querySelector("time");
  date.dateTime = release.published;
  date.textContent = dateFormat.format(new Date(release.published));
  const downloads = row.querySelector(".downloads");
  for (const artifact of release.packages) {
    downloads.append(renderDownload(artifact, name, release.version));
  }
  return row;
}

function renderPlugin(plugin) {
  const entry = fromTemplate("plugin-template");
  const translations = english ? plugin.locales?.en : undefined;
  const name = translations?.["plugin.name"] ?? plugin.name;
  const description = translations?.["plugin.description"] ?? plugin.description;
  setText(entry, "h3", name);
  setText(entry, ".plugin-id", plugin.id);

  if (description) setText(entry, ".description", description);
  else entry.querySelector(".description").remove();
  if (english && !translations?.["plugin.name"]) entry.querySelector("h3").lang = "zh-CN";
  if (english && description && !translations?.["plugin.description"]) entry.querySelector(".description").lang = "zh-CN";

  const credit = [plugin.publisher, plugin.license].filter(Boolean);
  if (credit.length) setText(entry, ".publisher", credit.join(" · "));
  else entry.querySelector(".publisher").remove();

  const versions = entry.querySelector(".versions");
  const released = [...plugin.versions].sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
  for (const release of released) versions.append(renderVersion(release, name));
  return entry;
}

async function loadCatalog() {
  status.textContent = copy.loading;
  try {
    const response = await fetch(indexURL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const index = await response.json();
    if (index.format !== 1 || !Array.isArray(index.packages)) throw new Error("Unsupported market index");
    catalog.replaceChildren(...index.packages.map(renderPlugin));
    document.querySelector("#release-count").textContent = copy.count(index.packages.length);
    status.textContent = index.packages.length ? "" : copy.empty;
  } catch {
    const indexLink = document.createElement("a");
    indexLink.href = indexURL;
    indexLink.textContent = copy.index;
    status.replaceChildren(copy.failure, " ", indexLink);
  }
}
void loadCatalog();

const sourceButton = document.querySelector("#copy-source");
const sourceLink = document.querySelector("#source-url");
const copyStatus = document.querySelector("#copy-status");

let copyMessageTimer;

async function copySource(source) {
  clearTimeout(copyMessageTimer);
  copyStatus.textContent = "";
  try {
    await navigator.clipboard.writeText(source.textContent.trim());
    copyStatus.textContent = copy.copied;
  } catch {
    source.focus();
    const range = document.createRange();
    range.selectNodeContents(source);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    copyStatus.textContent = copy.manual;
  }
  copyMessageTimer = setTimeout(() => { copyStatus.textContent = ""; }, 5000);
}

if ("CommandEvent" in window && "commandForElement" in HTMLButtonElement.prototype) {
  sourceLink.addEventListener("command", (event) => {
    if (event.command === "--copy" && event.source === sourceButton) void copySource(sourceLink);
  });
} else {
  sourceButton.addEventListener("click", () => void copySource(sourceLink));
}
sourceButton.hidden = false;
