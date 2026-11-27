<script setup lang="ts">
// One release's packages: platform, size, SHA-256 and the download. This
// device's package comes first and is marked.
import { computed } from 'vue';
import { Download } from 'lucide-vue-next';
import type { Copy } from '../copy';
import { formatSize, matchesDevice, orderedArtifacts, platformLabel, shortDigest, type Release } from '../market';
import type { Visitor } from '../platform';
import CopyButton from './CopyButton.vue';

const props = defineProps<{
  release: Release;
  pluginName: string;
  visitor: Visitor;
  copy: Copy;
  sizeFormat: Intl.NumberFormat;
}>();

const artifacts = computed(() => orderedArtifacts(props.release, props.visitor).map(artifact => ({
  ...artifact,
  label: platformLabel(artifact.platform),
  thisDevice: matchesDevice(artifact, props.release, props.visitor),
})));
</script>

<template>
  <ul class="packages" role="list">
    <li v-for="artifact in artifacts" :key="artifact.platform" class="package">
      <span class="package-platform">
        {{ artifact.label }}
        <span v-if="artifact.thisDevice" class="ui-badge sm">{{ copy.thisDevice }}</span>
      </span>
      <span class="package-size mono">{{ formatSize(artifact.size, sizeFormat) }}</span>
      <span class="package-digest">
        <span class="digest-label">SHA-256</span>
        <code class="mono" :title="artifact.sha256">{{ shortDigest(artifact.sha256) }}</code>
        <CopyButton :text="artifact.sha256" :label="copy.copySha(artifact.label)" :copied-label="copy.copied" :failed-label="copy.copyFailed" />
      </span>
      <a class="ui-btn sm package-download" :href="artifact.href" download
        :aria-label="copy.downloadNamed(pluginName, release.version, artifact.label)">
        <Download :size="14" aria-hidden="true" />{{ copy.download }}
      </a>
    </li>
  </ul>
</template>

<style scoped>
.packages { display: grid; margin: 0; padding: 0; list-style: none; }
.package {
  display: grid;
  grid-template-columns: minmax(136px, 1fr) minmax(64px, auto) minmax(0, 2fr) auto;
  grid-template-areas: 'platform size digest download';
  align-items: center;
  gap: 4px 16px;
  min-height: 44px;
  padding: 6px 0;
  border-top: 1px solid var(--border-color);
}
.package-platform { grid-area: platform; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 8px; min-width: 0; color: var(--text-primary); font-size: 12px; font-weight: 500; }
.package-size { grid-area: size; color: var(--text-secondary); font-size: 11px; font-variant-numeric: tabular-nums; white-space: nowrap; }
.package-digest { grid-area: digest; display: flex; align-items: center; gap: 6px; min-width: 0; color: var(--text-secondary); font-size: 11px; }
.digest-label { flex-shrink: 0; }
.package-digest code { min-width: 0; overflow: hidden; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; }
.package-download { grid-area: download; justify-self: end; }
@container plugin (max-width: 559px) {
  .package {
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas: 'platform size' 'digest download';
    padding: 8px 0;
  }
  .package-size { justify-self: end; }
}
</style>
