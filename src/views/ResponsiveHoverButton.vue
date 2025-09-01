<script lang="ts" setup>
import { ref, onBeforeUnmount } from 'vue';

// Detect touch environment similar to IS_TOUCH_ENV
const IS_TOUCH_ENV = window.matchMedia('(pointer: coarse)').matches;

type Emits = {
  (e: 'activate', ev: MouseEvent): void
}

const emit = defineEmits<Emits>();

const props = withDefaults(defineProps<{
  // Delay (ms) before hover activation on non-touch
  activateDelay?: number;
  // Optimize first-time activation (triggers instantly on first hover)
  firstActivationImmediate?: boolean;
}>(), {
  activateDelay: 200,
  firstActivationImmediate: true,
});

// Per-instance state
const isMouseInside = ref(false);
let openTimeout: number | undefined;
let isFirstTimeActivation = true;

function clearOpenTimeout() {
  if (openTimeout) {
    clearTimeout(openTimeout);
    openTimeout = undefined;
  }
}

function handleMouseEnter(e: MouseEvent) {
  if (IS_TOUCH_ENV) return; // Hover is irrelevant on touch

  isMouseInside.value = true;

  // First-time optimization to mitigate lazy-load delay
  if (props.firstActivationImmediate && isFirstTimeActivation) {
    isFirstTimeActivation = false;
    emit('activate', e);
    return;
  }

  clearOpenTimeout();
  openTimeout = window.setTimeout(() => {
    if (isMouseInside.value) emit('activate', e);
  }, props.activateDelay);
}

function handleMouseLeave() {
  if (IS_TOUCH_ENV) return;
  isMouseInside.value = false;
  // Cancel any pending activation when leaving
  clearOpenTimeout();
}

function handleClick(e: MouseEvent) {
  // On non-touch, click immediately activates
  // On touch, also activate immediately, mirroring React version
  isMouseInside.value = true;
  emit('activate', e);
}

onBeforeUnmount(() => {
  clearOpenTimeout();
});
</script>

<template>
  <!--
    Forward all attrs to allow consumers to style and add ARIA/size/etc.
    Events are controlled here to provide consistent activation behavior.
  -->
  <button
    v-bind="$attrs"
    @mouseenter="handleMouseEnter"
    @mouseleave="handleMouseLeave"
    @click="handleClick"
  >
    <slot />
  </button>
</template>

<style scoped>
/* No opinionated styling; the consumer can style via classes/attrs. */
</style>

