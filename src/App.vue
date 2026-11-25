<script setup lang="ts">
import { onMounted, onScopeDispose, ref, shallowRef } from 'vue';
import { ArrowDown, CircleAlert, Package } from 'lucide-vue-next';
import { catalogCopy, type Locale } from './copy';
import { readMarket, type Plugin } from './market';
import InstallGuide from './components/InstallGuide.vue';
import PluginCard from './components/PluginCard.vue';

const projectUrl = 'https://github.com/LovelyTeams/LovelyCarve';
const siteRepository = 'https://github.com/LovelyTeams/LovelyCarve-Plugin-Site';
const indexUrl = new URL('./index.json', document.baseURI);
const locale: Locale = new URLSearchParams(window.location.search).get('lang') === 'en' ? 'en' : 'zh-CN';
const copy = catalogCopy[locale];
const otherLocale = locale === 'en' ? 'zh-CN' : 'en';
const languageHref = ref('');

const assets = `${import.meta.env.BASE_URL}assets/`;
const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' });
const sizeFormat = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });
const plugins = shallowRef<Plugin[]>([]);
const state = ref<'loading' | 'ready' | 'error'>('loading');
let request: AbortController | undefined;

document.documentElement.lang = locale;
document.title = `${copy.title} · LovelyCarve`;
document.querySelector('meta[name="description"]')?.setAttribute('content', copy.description);

function updateLanguageHref() {
  const url = new URL(window.location.href);
  if (locale === 'en') url.searchParams.delete('lang');
  else url.searchParams.set('lang', 'en');
  languageHref.value = url.href;
}

async function loadCatalog() {
  request?.abort();
  const current = new AbortController();
  request = current;
  state.value = 'loading';
  try {
    const response = await fetch(indexUrl, { signal: current.signal, cache: 'no-cache' });
    if (!response.ok) throw new Error(`Market index: HTTP ${response.status}`);
    const catalog = readMarket(await response.json(), indexUrl);
    if (current.signal.aborted) return;
    plugins.value = catalog;
    state.value = 'ready';
  } catch {
    if (!current.signal.aborted) state.value = 'error';
  }
}

updateLanguageHref();
onMounted(() => {
  window.addEventListener('hashchange', updateLanguageHref);
  void loadCatalog();
});
onScopeDispose(() => {
  window.removeEventListener('hashchange', updateLanguageHref);
  request?.abort();
});
</script>

<template>
  <a class="skip-link" href="#page-title">{{ copy.skip }}</a>
  <header class="site-header">
    <div class="wrap site-nav">
      <a class="brand" :href="projectUrl" lang="en">
        <img :src="`${assets}32x32.png`" width="32" height="32" alt="">
        LovelyCarve
      </a>
      <nav class="nav-links" :aria-label="copy.navigation">
        <a class="ui-btn ghost" href="#releases">{{ copy.releases }}</a>
        <a class="ui-btn ghost" href="#install">{{ copy.installGuide }}</a>
      </nav>
      <a class="ui-btn ghost locale-link" :href="languageHref" :lang="otherLocale" :hreflang="otherLocale">
        {{ otherLocale === 'en' ? 'English' : '简体中文' }}
      </a>
    </div>
  </header>

  <main>
    <section class="hero">
      <div class="wrap hero-layout">
        <div class="hero-copy">
          <h1 id="page-title" tabindex="-1">{{ copy.title }}</h1>
          <p>{{ copy.description }}</p>
          <div class="hero-actions">
            <a class="ui-btn primary" href="#releases">
              {{ copy.browse }} <ArrowDown :size="16" aria-hidden="true" />
            </a>
            <a class="ui-btn" href="#install">{{ copy.addSource }}</a>
          </div>
        </div>
        <div class="hero-art">
          <img
            :src="`${assets}lovelycarve-512.webp`"
            :srcset="`${assets}lovelycarve-256.webp 256w, ${assets}lovelycarve-512.webp 512w`"
            sizes="(max-width: 37.5rem) 1px, (max-width: 52rem) 180px, 244px"
            alt=""
            width="512"
            height="512"
            fetchpriority="high"
          >
        </div>
      </div>
    </section>

    <section class="wrap page-section" id="releases">
      <div class="section-heading">
        <h2>{{ copy.available }}</h2>
        <span v-if="state === 'ready'" class="section-count">{{ copy.count(plugins.length) }}</span>
      </div>
      <p v-if="state === 'ready' && plugins.length" id="web-install-help" class="section-help">{{ copy.desktopHelp }}</p>
      <p v-if="state === 'loading'" class="ui-empty">{{ copy.loading }}</p>
      <div v-else-if="state === 'error'" class="ui-alert">
        <p role="alert"><CircleAlert :size="18" aria-hidden="true" /> {{ copy.failure }}</p>
        <button type="button" class="ui-btn" @click="loadCatalog">{{ copy.retry }}</button>
        <a class="ui-btn ghost" :href="indexUrl.href">{{ copy.index }}</a>
      </div>
      <p v-else-if="!plugins.length" class="ui-empty" role="status">
        <Package :size="24" aria-hidden="true" /> {{ copy.empty }}
      </p>
      <ul v-else class="catalog" role="list" :aria-label="copy.available">
        <PluginCard
          v-for="plugin in plugins"
          :key="plugin.id"
          :plugin="plugin"
          :locale="locale"
          :date-format="dateFormat"
          :size-format="sizeFormat"
        />
      </ul>
    </section>

    <InstallGuide :locale="locale" :index-href="indexUrl.href" />
  </main>

  <footer class="site-footer">
    <div class="wrap footer-layout">
      <span class="brand" lang="en">LovelyCarve</span>
      <div class="footer-links">
        <a class="ui-btn ghost" :href="`${siteRepository}/issues/new?template=plugin-submission.yml`">{{ copy.submit }}</a>
        <a class="ui-btn ghost" href="https://github.com/LovelyTeams/LovelyCarve-Plugins">{{ copy.pluginSource }}</a>
        <a class="ui-btn ghost" :href="`${projectUrl}/blob/main/docs/PLUGIN_PROTOCOL.md#插件市场`">{{ copy.documentation }}</a>
        <a class="ui-btn ghost" :href="siteRepository">{{ copy.websiteSource }}</a>
      </div>
    </div>
  </footer>
</template>
