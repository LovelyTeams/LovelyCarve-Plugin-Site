<script setup lang="ts">
// The three ways in: the link from a card, the app's own Plugin market, and
// a downloaded package. The package card is the target of a card's
// 「手动安装」 link.
import { AppWindow, PackagePlus, Store } from 'lucide-vue-next';
import type { Copy } from '../copy';

defineProps<{ copy: Copy }>();

const methods = [
  { key: 'link', icon: AppWindow, id: undefined },
  { key: 'market', icon: Store, id: undefined },
  { key: 'package', icon: PackagePlus, id: 'install-package' },
] as const;
</script>

<template>
  <section id="install" class="install" aria-labelledby="install-title">
    <h2 id="install-title" class="ui-section-title">{{ copy.installGuide }}</h2>
    <ul class="methods ui-stagger" role="list">
      <li v-for="method in methods" :id="method.id" :key="method.key" class="ui-card method" :tabindex="method.id ? -1 : undefined">
        <span class="method-icon" aria-hidden="true"><component :is="method.icon" :size="18" /></span>
        <h3>{{ copy.methods[method.key].title }}</h3>
        <ol class="steps">
          <li v-for="step in copy.methods[method.key].steps" :key="step">{{ step }}</li>
        </ol>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.install { display: grid; gap: 16px; margin-top: 48px; scroll-margin-top: 16px; }
.methods { display: grid; grid-template-columns: repeat(auto-fit, minmax(208px, 1fr)); gap: 16px; margin: 0; padding: 0; list-style: none; }
.method {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 16px;
  scroll-margin-top: 16px;
  transition: border-color var(--motion-fast) var(--ease-swift), box-shadow var(--motion-fast) var(--ease-swift);
}
.method:target { border-color: var(--primary-color); box-shadow: 0 0 0 3px var(--primary-glow); outline: none; }
.method-icon { display: grid; place-items: center; width: 36px; height: 36px; border-radius: var(--radius-md); background: var(--primary-soft); color: var(--primary-color); }
.method h3 { color: var(--text-primary); font-size: 13px; font-weight: 600; line-height: 1.4; }
.steps { display: grid; gap: 6px; margin: 0; padding: 0; counter-reset: step; list-style: none; }
.steps li { display: flex; gap: 8px; color: var(--text-secondary); font-size: 12px; line-height: 1.6; counter-increment: step; }
.steps li::before {
  content: counter(step);
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 18px;
  height: 18px;
  margin-top: 1px;
  border-radius: 999px;
  background: var(--chip-count-bg);
  color: var(--text-secondary);
  font: 500 11px/1 var(--font-mono);
}
</style>
