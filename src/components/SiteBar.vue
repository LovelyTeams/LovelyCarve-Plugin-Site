<script setup lang="ts">
// The window frame's title bar: the app's wordmark, the page sections, the
// language and the theme, laid out like LovelyCarve's titlebar chips.
import { computed } from 'vue';
import { Moon, PackagePlus, Puzzle, Sun } from 'lucide-vue-next';
import type { Copy, Locale } from '../copy';
import { setTheme, theme } from '../theme';

const props = defineProps<{
  copy: Copy;
  locale: Locale;
  languageHrefs: Record<Locale, string>;
  projectUrl: string;
  mark: string;
}>();

const languages = [
  { locale: 'zh-CN', label: '中文' },
  { locale: 'en', label: 'English' },
] as const;
const nextTheme = computed(() => (theme.value === 'dark' ? 'light' : 'dark'));
const themeLabel = computed(() => (nextTheme.value === 'dark' ? props.copy.toDark : props.copy.toLight));
</script>

<template>
  <header class="site-bar">
    <a class="bar-brand" :href="projectUrl" :title="copy.home" lang="en">
      <img :src="mark" width="20" height="20" alt="">
      <span class="wordmark">LovelyCarve<span class="dot">.</span></span>
    </a>
    <nav class="bar-nav" :aria-label="copy.navigation">
      <a class="ui-btn sm bar-chip" href="#plugins"><Puzzle :size="14" aria-hidden="true" />{{ copy.plugins }}</a>
      <a class="ui-btn sm bar-chip" href="#install"><PackagePlus :size="14" aria-hidden="true" />{{ copy.installGuide }}</a>
    </nav>
    <div class="bar-actions">
      <nav class="ui-seg" :aria-label="copy.language">
        <a v-for="language in languages" :key="language.locale" class="ui-seg-item" :href="languageHrefs[language.locale]"
          :lang="language.locale" :hreflang="language.locale"
          :aria-current="language.locale === locale ? 'true' : undefined">{{ language.label }}</a>
      </nav>
      <button class="ui-icon-btn" type="button" :title="themeLabel" :aria-label="themeLabel"
        @click="setTheme(nextTheme, $event.currentTarget as Element)">
        <Moon v-if="nextTheme === 'dark'" :size="16" aria-hidden="true" />
        <Sun v-else :size="16" aria-hidden="true" />
      </button>
    </div>
  </header>
</template>

<style scoped>
.site-bar { display: flex; align-items: center; gap: 8px; min-height: 52px; padding: 8px 12px 8px 16px; }
.bar-brand { display: inline-flex; align-items: center; gap: 10px; flex-shrink: 0; min-height: 32px; margin-right: 8px; padding-right: 4px; text-decoration: none; }
.wordmark {
  font: 700 14px/1 var(--font-brand), sans-serif;
  letter-spacing: -0.02em;
  background: var(--brand-wordmark-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.dot { color: var(--brand-dot-color); -webkit-text-fill-color: var(--brand-dot-color); }
.bar-nav { display: flex; align-items: center; gap: 4px; min-width: 0; }
.bar-chip { background: transparent; color: var(--text-primary); }
.bar-chip:hover { background: var(--hover-bg); }
.bar-actions { display: flex; align-items: center; gap: 8px; margin-left: auto; }
@media (max-width: 600px) {
  .bar-nav { display: none; }
}
</style>
