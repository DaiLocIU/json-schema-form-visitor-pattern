<template>
  <div ref="panel" class="panel" style="width: var(--panel-w)">
    <div class="h-handle" @pointerdown="e => initResize(e as PointerEvent)"></div>
    <!-- content -->
  </div>
  <button @click="reset">Reset</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useHorizontalResize } from './useResize'

const panel = ref<HTMLElement | null>(null)

const { initResize, reset } = useHorizontalResize(
  panel,
  (w) => console.log('final width:', w),
  () => console.log('reset'),
  { min: 200, max: 1000, step: 8, initial: 320, cssVar: '--panel-w', origin: 'left' }
)
</script>

<style scoped>
.panel { position: absolute; height: 320px; background: #f7f7f7; right: 0 }
.h-handle {
  position: absolute; top: 0; left: 0; width: 1px; height: 100%;
  cursor: ew-resize; touch-action: none; /* important for touch/pen dragging */
  background: rgba(0,0,0,0.06);
}
</style>