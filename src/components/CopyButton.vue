<script setup lang="ts">
// An icon button that copies `text`, as the desktop's copy buttons do: the
// icon turns into a check for 1.5s and a status line announces the result.
import { onScopeDispose, ref } from 'vue';
import { Check, CircleAlert, Copy } from 'lucide-vue-next';

const props = defineProps<{ text: string; label: string; copiedLabel: string; failedLabel: string }>();
const result = ref<'copied' | 'failed' | null>(null);
let reset: ReturnType<typeof setTimeout> | undefined;

/** The selection copy browsers keep for pages the Clipboard API refuses (embedded views, older engines). */
function copyThroughSelection(text: string): boolean {
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    field.remove();
  }
}

async function copy(event: MouseEvent) {
  const button = event.currentTarget as HTMLButtonElement;
  clearTimeout(reset);
  let copied: boolean;
  try {
    await navigator.clipboard.writeText(props.text);
    copied = true;
  } catch {
    copied = copyThroughSelection(props.text);
    button.focus();
  }
  result.value = copied ? 'copied' : 'failed';
  reset = setTimeout(() => { result.value = null; }, copied ? 1500 : 3000);
}

onScopeDispose(() => clearTimeout(reset));
</script>

<template>
  <span class="copy">
    <button class="ui-icon-btn sm" :class="{ failed: result === 'failed' }" type="button" :title="label" :aria-label="label" @click="copy">
      <Check v-if="result === 'copied'" :size="14" class="ui-copied" aria-hidden="true" />
      <CircleAlert v-else-if="result === 'failed'" :size="14" aria-hidden="true" />
      <Copy v-else :size="14" aria-hidden="true" />
    </button>
    <span class="sr-only" role="status">{{ result === 'copied' ? copiedLabel : result === 'failed' ? failedLabel : '' }}</span>
  </span>
</template>

<style scoped>
.copy { display: inline-flex; flex-shrink: 0; }
.ui-icon-btn.failed { color: var(--sev-critical-fg); }
</style>
