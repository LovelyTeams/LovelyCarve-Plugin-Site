<script setup lang="ts">
// The page as LovelyCarve's window: the title bar on the frame, the content
// on an inset sheet. The catalog is the official index this page publishes
// and the desktop reads.
import { computed, onMounted, onScopeDispose, ref, shallowRef } from 'vue';
import { CircleAlert, Loader2, Puzzle } from 'lucide-vue-next';
import { catalogCopy, type Locale } from './copy';
import { publishedDay, readMarket, type Plugin } from './market';
import { currentVisitor, detectVisitor, type Visitor } from './platform';
import { watchSystem } from './theme';
import InstallGuide from './components/InstallGuide.vue';
import PluginCard from './components/PluginCard.vue';
import SiteBar from './components/SiteBar.vue';

const projectUrl = 'https://github.com/LovelyTeams/LovelyCarve';
const siteRepository = 'https://github.com/LovelyTeams/LovelyCarve-Plugin-Site';
const indexUrl = new URL('./index.json', document.baseURI);
const assets = `${import.meta.env.BASE_URL}assets/`;
const locale: Locale = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh-CN';
const copy = catalogCopy[locale];
const sizeFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
const plugins = shallowRef<Plugin[]>([]);
const state = ref<'loading' | 'ready' | 'error'>('loading');
const failure = ref('');
const visitor = shallowRef<Visitor>(currentVisitor());
const languageHrefs = ref<Record<Locale, string>>({ 'zh-CN': '', en: '' });
let request: AbortController | undefined;
let stopSystem: (() => void) | undefined;

document.documentElement.lang = locale;
document.title = copy.title;
document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description);

const versionCount = computed(() => plugins.value.reduce((total, plugin) => total + plugin.releases.length, 0));
const updated = computed(() => {
  let latest: string | undefined;
  for (const plugin of plugins.value) {
    for (const release of plugin.releases) {
      if (!latest || Date.parse(release.published) > Date.parse(latest)) latest = release.published;
    }
  }
  return latest;
});

function updateLanguageHrefs() {
  const href = (target: Locale) => {
    const url = new URL(window.location.href);
    if (target === 'en') url.searchParams.set('lang', 'en');
    else url.searchParams.delete('lang');
    return url.href;
  };
  languageHrefs.value = { 'zh-CN': href('zh-CN'), en: href('en') };
}

async function loadCatalog() {
  request?.abort();
  const current = new AbortController();
  request = current;
  state.value = 'loading';
  failure.value = '';
  try {
    const response = await fetch(indexUrl, { signal: current.signal, cache: 'no-cache' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const catalog = readMarket(await response.json(), indexUrl);
    if (current.signal.aborted) return;
    plugins.value = catalog;
    state.value = 'ready';
  } catch (error) {
    if (current.signal.aborted) return;
    failure.value = error instanceof Error ? error.message : String(error);
    state.value = 'error';
  }
}

updateLanguageHrefs();
onMounted(() => {
  window.addEventListener('hashchange', updateLanguageHrefs);
  stopSystem = watchSystem();
  void loadCatalog();
  void detectVisitor().then(detected => { visitor.value = detected; });
});
onScopeDispose(() => {
  window.removeEventListener('hashchange', updateLanguageHrefs);
  stopSystem?.();
  request?.abort();
});
</script>

<template>
  <a class="skip-link" href="#main">{{ copy.skip }}</a>
  <div class="frame">
    <SiteBar :copy="copy" :locale="locale" :language-hrefs="languageHrefs" :project-url="projectUrl" :mark="`${assets}lovelycarve-mark.webp`" />
    <div class="sheet">
      <main id="main" class="sheet-main" tabindex="-1">
        <header class="intro">
          <img
            class="intro-tile"
            :src="`${assets}lovelycarve-tile-96.webp`"
            :srcset="`${assets}lovelycarve-tile-96.webp 1x, ${assets}lovelycarve-tile-192.webp 2x`"
            width="88"
            height="88"
            alt=""
          >
          <div class="intro-text">
            <h1>{{ copy.heading }}</h1>
            <p v-if="state === 'ready'" class="intro-stats">
              <span class="stat"><strong>{{ plugins.length }}</strong> {{ copy.pluginUnit(plugins.length) }}</span> <span class="stat"><strong>{{ versionCount }}</strong> {{ copy.versionUnit(versionCount) }}</span> <span v-if="updated" class="stat">{{ copy.updated }} <time :datetime="updated">{{ publishedDay(updated) }}</time></span>
            </p>
          </div>
        </header>

        <section id="plugins" class="plugins" :aria-label="copy.plugins" :aria-busy="state === 'loading'">
          <div v-if="state === 'loading'" class="ui-empty catalog-state" role="status">
            <span class="ui-empty-icon accent"><Loader2 :size="24" class="spin" aria-hidden="true" /></span>
            <p>{{ copy.loading }}</p>
          </div>
          <div v-else-if="state === 'error'" class="ui-alert danger catalog-failure" role="alert">
            <CircleAlert :size="16" aria-hidden="true" />
            <div class="failure-text">
              <strong>{{ copy.failure }}</strong>
              <span class="mono">{{ failure }}</span>
            </div>
            <div class="failure-actions">
              <button class="ui-btn sm" type="button" @click="loadCatalog">{{ copy.retry }}</button>
              <a class="ui-btn sm ghost" :href="indexUrl.href">{{ copy.openIndex }}</a>
            </div>
          </div>
          <div v-else-if="!plugins.length" class="ui-empty catalog-state">
            <span class="ui-empty-icon"><Puzzle :size="28" aria-hidden="true" /></span>
            <p class="ui-empty-title">{{ copy.empty }}</p>
          </div>
          <ul v-else class="catalog ui-stagger" role="list">
            <PluginCard
              v-for="plugin in plugins"
              :key="plugin.id"
              :plugin="plugin"
              :copy="copy"
              :locale="locale"
              :visitor="visitor"
              :size-format="sizeFormat"
            />
          </ul>
        </section>

        <InstallGuide :copy="copy" />
      </main>

      <footer class="sheet-foot">
        <div class="foot-links">
          <a class="ui-btn sm ghost" :href="`${siteRepository}/issues/new?template=plugin-submission.yml`">{{ copy.submit }}</a>
          <a class="ui-btn sm ghost" href="https://github.com/LovelyTeams/LovelyCarve-Plugins">{{ copy.pluginSource }}</a>
          <a class="ui-btn sm ghost" :href="`${projectUrl}/blob/main/docs/PLUGIN_PROTOCOL.md#插件市场`">{{ copy.documentation }}</a>
          <a class="ui-btn sm ghost" :href="siteRepository">{{ copy.websiteSource }}</a>
        </div>
        <a class="foot-index mono" :href="indexUrl.href">index.json</a>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.skip-link {
  position: absolute;
  z-index: 10;
  top: 8px;
  left: 16px;
  padding: 8px 12px;
  border-radius: var(--radius-md);
  background: var(--surface-secondary);
  box-shadow: var(--card-shadow-hover);
}
.skip-link:not(:focus) { clip-path: inset(50%); }
.frame { display: flex; flex-direction: column; min-height: 100vh; min-height: 100dvh; }
/* The workspace sheet: inset in the frame with an 8px gutter, as in the app. */
.sheet {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  margin: 0 8px 8px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: var(--bg-primary);
  box-shadow: var(--card-shadow);
}
.sheet-main { flex: 1; width: min(1040px, 100% - 64px); margin: 0 auto; padding: 40px 0 56px; outline: none; }
.intro { display: flex; align-items: center; gap: 20px; margin-bottom: 32px; }
.intro-tile { flex-shrink: 0; width: 88px; height: 88px; border-radius: var(--radius-lg); box-shadow: var(--card-shadow); }
.intro-text { display: grid; gap: 8px; min-width: 0; }
h1 { color: var(--text-primary); font-size: 24px; font-weight: 600; line-height: 1.3; }
.intro-stats { display: flex; flex-wrap: wrap; gap: 4px 16px; color: var(--text-secondary); font-size: 12px; }
.stat { white-space: nowrap; }
.stat strong, .stat time { color: var(--text-primary); font-family: var(--font-mono); font-weight: 600; font-variant-numeric: tabular-nums; }
.plugins { scroll-margin-top: 16px; }
.catalog { display: grid; gap: 16px; margin: 0; padding: 0; list-style: none; }
.catalog-state { min-height: 200px; }
.catalog-failure { align-items: center; flex-wrap: wrap; }
.failure-text { display: flex; flex: 1; flex-direction: column; gap: 2px; min-width: 200px; overflow-wrap: anywhere; }
.failure-text .mono { font-size: 11px; }
.failure-actions { display: flex; gap: 6px; }
.sheet-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 16px;
  min-height: 44px;
  padding: 6px 12px;
  border-top: 1px solid var(--border-color);
  border-radius: 0 0 calc(var(--radius-lg) - 1px) calc(var(--radius-lg) - 1px);
  background: var(--surface-primary);
}
.foot-links { display: flex; flex-wrap: wrap; gap: 2px; }
.foot-index { margin-left: auto; padding: 0 8px; color: var(--text-secondary); font-size: 11px; }
.foot-index:hover { color: var(--primary-color); }
@media (max-width: 640px) {
  .sheet-main { width: calc(100% - 32px); padding: 24px 0 40px; }
  .intro { gap: 16px; margin-bottom: 24px; }
  .intro-tile { width: 64px; height: 64px; }
}
:root[data-motion='full'] .intro-tile { animation: ui-bounce-in var(--motion-slow) var(--ease-spring) backwards; }
:root[data-motion='full'] .intro-text { animation: ui-rise-in var(--motion-slow) var(--ease-out) 80ms backwards; }
:root[data-motion='full'] .catalog { --ui-stagger-base: 140ms; --ui-rise-distance: 12px; }
</style>
