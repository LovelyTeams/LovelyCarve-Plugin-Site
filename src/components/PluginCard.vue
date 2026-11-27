<script setup lang="ts">
// A plugin as the desktop's market card shows it: icon tile, name and ID,
// one install action for the version LovelyCarve would pick, the facts of
// that version and its packages; other versions behind a disclosure.
import { computed, ref, useId } from 'vue';
import { AppWindow, ChevronRight, Puzzle, X } from 'lucide-vue-next';
import type { Copy, Locale } from '../copy';
import { availability, installHref, publishedDay, recommendedRelease, systemLabel, type Plugin, type Release } from '../market';
import type { Visitor } from '../platform';
import PackageList from './PackageList.vue';

const props = defineProps<{
  plugin: Plugin;
  copy: Copy;
  locale: Locale;
  visitor: Visitor;
  sizeFormat: Intl.NumberFormat;
}>();

const titleId = useId();
const english = computed(() => props.locale === 'en');
const name = computed(() => (english.value && props.plugin.englishName) || props.plugin.name);
const nameLang = computed(() => (english.value && !props.plugin.englishName ? 'zh-CN' : undefined));
const description = computed(() => (english.value && props.plugin.englishDescription) || props.plugin.description);
const descriptionLang = computed(() => (english.value && !props.plugin.englishDescription ? 'zh-CN' : undefined));
const release = computed(() => recommendedRelease(props.plugin, props.visitor.system));
/** The version last handed to LovelyCarve from this card. */
const sent = ref<string | null>(null);

/** Why this browser cannot install `target`, as a badge; null when it can. */
function blocked(target: Release): string | null {
  const system = props.visitor.system;
  switch (availability(target, props.visitor)) {
    case 'available': return null;
    case 'desktopOnly': return props.copy.desktopOnly;
    case 'otherSystem': return system && system !== 'mobile' ? props.copy.noPackageFor(systemLabel(system)) : null;
  }
}

const blockedReason = computed(() => blocked(release.value));
const permission = (key: string) => props.copy.permissions[key] ?? key;
</script>

<template>
  <li class="plugin">
    <article class="ui-card plugin-card" :aria-labelledby="titleId">
      <div class="plugin-head">
        <span class="plugin-icon" aria-hidden="true"><Puzzle :size="20" /></span>
        <div class="plugin-title">
          <h3 :id="titleId" :lang="nameLang">{{ name }}</h3>
          <span class="plugin-id mono">{{ plugin.id }}</span>
        </div>
        <div class="plugin-action">
          <span v-if="blockedReason" class="ui-badge">{{ blockedReason }}</span>
          <a v-else class="ui-btn primary" :href="installHref(plugin.id, release.version)"
            :aria-label="copy.installNamed(name, release.version)" @click="sent = release.version">
            <AppWindow :size="14" aria-hidden="true" />{{ copy.install }}
          </a>
        </div>
      </div>

      <div class="plugin-body">
        <p v-if="description" class="plugin-description" :lang="descriptionLang">{{ description }}</p>
        <div class="plugin-facts">
          <span class="ui-badge mono">{{ release.version }}</span>
          <span v-if="release.prerelease" class="ui-badge warn">{{ copy.prerelease }}</span>
          <span v-for="key in release.permissions" :key="key" class="ui-badge warn">{{ permission(key) }}</span>
          <span v-if="plugin.publisher">{{ plugin.publisher }}</span>
          <span v-if="plugin.license" class="mono">{{ plugin.license }}</span>
          <time class="mono" :datetime="release.published">{{ publishedDay(release.published) }}</time>
        </div>

        <div v-if="sent" class="ui-alert info sent" role="status">
          <AppWindow :size="14" aria-hidden="true" />
          <p class="sent-text"><strong>{{ copy.sent }}</strong> <span class="mono">{{ sent }}</span> <span class="sent-help">{{ copy.notOpened }} <a href="#install-package">{{ copy.manualInstall }}</a></span></p>
          <button class="ui-icon-btn sm" type="button" :title="copy.dismiss" :aria-label="copy.dismiss" @click="sent = null">
            <X :size="14" aria-hidden="true" />
          </button>
        </div>

        <PackageList :release="release" :plugin-name="name" :visitor="visitor" :copy="copy" :size-format="sizeFormat" />

        <details v-if="plugin.releases.length > 1" class="ui-disclosure versions">
          <summary><ChevronRight :size="14" class="ui-chevron" aria-hidden="true" />{{ copy.versions(plugin.releases.length) }}</summary>
          <ol class="version-list" role="list">
            <li v-for="item in plugin.releases" :key="item.version" class="version">
              <div class="version-head">
                <strong class="mono">{{ item.version }}</strong>
                <time class="mono" :datetime="item.published">{{ publishedDay(item.published) }}</time>
                <span v-if="item.prerelease" class="ui-badge sm warn">{{ copy.prerelease }}</span>
                <span v-for="key in item.permissions" :key="key" class="ui-badge sm warn">{{ permission(key) }}</span>
                <a v-if="!blocked(item)" class="ui-btn sm ghost version-install" :href="installHref(plugin.id, item.version)"
                  :aria-label="copy.installVersionNamed(name, item.version)" @click="sent = item.version">
                  <AppWindow :size="14" aria-hidden="true" />{{ copy.installVersion }}
                </a>
              </div>
              <PackageList :release="item" :plugin-name="name" :visitor="visitor" :copy="copy" :size-format="sizeFormat" />
            </li>
          </ol>
        </details>
      </div>
    </article>
  </li>
</template>

<style scoped>
.plugin { container: plugin / inline-size; list-style: none; }
.plugin-card { display: grid; gap: 12px; padding: 16px; }
.plugin-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas: 'icon title action';
  align-items: center;
  gap: 8px 12px;
}
.plugin-icon { grid-area: icon; display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--radius-md); background: var(--primary-soft); color: var(--primary-color); }
.plugin-title { grid-area: title; display: grid; gap: 2px; min-width: 0; }
.plugin-title h3 { color: var(--text-primary); font-size: 14px; font-weight: 600; line-height: 1.4; overflow-wrap: anywhere; }
.plugin-id { overflow: hidden; color: var(--text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.plugin-action { grid-area: action; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
.plugin-body { display: grid; gap: 12px; min-width: 0; }
.plugin-description { max-width: 72ch; color: var(--text-secondary); font-size: 13px; line-height: 1.7; overflow-wrap: anywhere; text-wrap: pretty; }
.plugin-description:lang(zh-CN) { word-break: keep-all; }
.plugin-facts { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 12px; color: var(--text-secondary); font-size: 12px; }
.plugin-facts .mono:not(.ui-badge) { font-size: 11px; }
.sent { align-items: center; }
.sent-text { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.sent-help { margin-left: 4px; white-space: nowrap; }
.sent-text a { color: inherit; font-weight: 600; }
.versions > summary { width: fit-content; min-height: 28px; border-radius: var(--radius-sm); color: var(--text-secondary); font-size: 12px; }
.versions > summary:hover { color: var(--primary-color); }
.version-list { display: grid; gap: 16px; margin: 8px 0 0; padding: 0; list-style: none; }
.version-head { display: flex; flex-wrap: wrap; align-items: center; gap: 6px 10px; min-height: 32px; }
.version-head strong { color: var(--text-primary); font-size: 12px; font-weight: 600; }
.version-head time { color: var(--text-secondary); font-size: 11px; }
.version-install { margin-left: auto; }
@container plugin (min-width: 560px) {
  .plugin-card { padding: 20px 24px; }
  .plugin-body { padding-left: 52px; }
}
@container plugin (max-width: 559px) {
  .plugin-head { grid-template-columns: auto minmax(0, 1fr); grid-template-areas: 'icon title' 'action action'; }
  .plugin-action { justify-content: flex-start; }
  .plugin-action .ui-btn.primary { flex: 1; }
}
</style>
