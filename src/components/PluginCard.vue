<script setup lang="ts">
import { computed } from 'vue';
import { ArrowDownToLine, ExternalLink, Package } from 'lucide-vue-next';
import { catalogCopy, type Locale } from '../copy';
import { formatSize, installHref, platformLabel, type Plugin } from '../market';

const props = defineProps<{
  plugin: Plugin;
  locale: Locale;
  dateFormat: Intl.DateTimeFormat;
  sizeFormat: Intl.NumberFormat;
}>();
const copy = computed(() => catalogCopy[props.locale]);
const english = computed(() => props.locale === 'en');
const name = computed(() => (english.value && props.plugin.englishName) || props.plugin.name);
const description = computed(() => (english.value && props.plugin.englishDescription) || props.plugin.description);
const attribution = computed(() => [props.plugin.publisher, props.plugin.license].filter(Boolean).join(' · '));
</script>

<template>
  <li class="plugin-container">
    <article class="ui-card plugin-card">
      <div class="plugin-summary">
        <span class="plugin-icon"><Package :size="22" aria-hidden="true" /></span>
        <div class="plugin-heading">
          <h3 :lang="english && !plugin.englishName ? 'zh-CN' : undefined">{{ name }}</h3>
        </div>
        <code class="plugin-id">{{ plugin.id }}</code>
        <p v-if="description" class="plugin-description" :lang="english && !plugin.englishDescription ? 'zh-CN' : undefined">
          {{ description }}
        </p>
        <p v-if="attribution" class="plugin-attribution">{{ attribution }}</p>
      </div>

      <ul class="version-list" role="list">
        <li v-for="release in plugin.releases" :key="release.version" class="version">
          <div class="release-heading">
            <div class="release-meta">
              <strong>v{{ release.version }}</strong>
              <time :datetime="release.published">{{ dateFormat.format(new Date(release.published)) }}</time>
            </div>
            <a
              class="ui-btn primary install-link"
              :href="installHref(plugin.id, release.version)"
              :aria-label="`${copy.webInstall} · ${name} v${release.version}`"
              aria-describedby="web-install-help"
            >{{ copy.webInstall }} <ExternalLink :size="14" aria-hidden="true" /></a>
          </div>
          <ul class="artifact-list" role="list">
            <li v-for="artifact in release.artifacts" :key="artifact.platform" class="artifact">
              <div class="artifact-actions">
                <div class="artifact-meta">
                  <strong>{{ platformLabel(artifact.platform) }}</strong>
                  <span>{{ formatSize(artifact.size, sizeFormat) }}</span>
                </div>
                <a
                  class="ui-btn download-link"
                  :href="artifact.href"
                  :aria-label="`${copy.download} .lcpkg · ${name} v${release.version} · ${platformLabel(artifact.platform)}`"
                  download
                >{{ copy.download }} .lcpkg <ArrowDownToLine :size="16" aria-hidden="true" /></a>
              </div>
              <details class="checksum">
                <summary :aria-label="`${copy.checksum} · ${name} v${release.version} · ${platformLabel(artifact.platform)}`">
                  {{ copy.checksum }}
                </summary>
                <code>{{ artifact.sha256 }}</code>
              </details>
            </li>
          </ul>
        </li>
      </ul>
    </article>
  </li>
</template>
