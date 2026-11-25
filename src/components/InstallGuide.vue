<script setup lang="ts">
import { computed, onScopeDispose, ref } from 'vue';
import { Check, Copy } from 'lucide-vue-next';
import { catalogCopy, type Locale } from '../copy';
import { officialIndex } from '../market';

const props = defineProps<{ locale: Locale; indexHref: string }>();
const copy = computed(() => catalogCopy[props.locale]);
const sourceLink = ref<HTMLAnchorElement | null>(null);
const copyResult = ref<'copied' | 'manual' | null>(null);
const nativeCommand = 'CommandEvent' in window && 'commandForElement' in HTMLButtonElement.prototype;
let clearResult: ReturnType<typeof setTimeout> | undefined;

async function copySource() {
  copyResult.value = null;
  try {
    await navigator.clipboard.writeText(officialIndex);
    copyResult.value = 'copied';
  } catch {
    const link = sourceLink.value;
    if (link) {
      link.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(link);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    copyResult.value = 'manual';
  }
  clearTimeout(clearResult);
  clearResult = setTimeout(() => { copyResult.value = null; }, 5000);
}

function handleCopyCommand(event: Event) {
  if ('command' in event && event.command === '--copy') void copySource();
}

onScopeDispose(() => clearTimeout(clearResult));
</script>

<template>
  <section class="wrap page-section install-guide" id="install">
    <h2>{{ copy.installTitle }}</h2>
    <div class="install-methods">
      <section>
        <h3>{{ copy.marketTitle }}</h3>
        <p>{{ copy.marketSteps }}</p>
        <div class="market-source">
          <a
            id="source-url"
            ref="sourceLink"
            class="source-url"
            :href="indexHref"
            @command="handleCopyCommand"
          >{{ officialIndex }}</a>
          <button
            class="ui-btn"
            type="button"
            command="--copy"
            commandfor="source-url"
            @click="!nativeCommand && copySource()"
          >
            <Check v-if="copyResult === 'copied'" :size="16" aria-hidden="true" />
            <Copy v-else :size="16" aria-hidden="true" />
            {{ copy.copy }}
          </button>
        </div>
        <p class="copy-status" role="status">{{ copyResult ? copy[copyResult === 'copied' ? 'copied' : 'manualCopy'] : '' }}</p>
      </section>
      <section>
        <h3>{{ copy.manualTitle }}</h3>
        <p>{{ copy.manualSteps }}</p>
        <p>{{ copy.bundled }}</p>
      </section>
    </div>
  </section>
</template>
