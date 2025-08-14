<template>
  <div ref="panel" class="panel" style="height: var(--panel-h)">
    <!-- content -->
    <div class="v-handle" @pointerdown="e => initResize(e as PointerEvent)" />
  </div>
  <button @click="reset">Reset</button>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useVerticalResize } from './useVerticalResize'

const panel = ref<HTMLElement | null>(null)

const { initResize, reset } = useVerticalResize(
  panel,
  (h) => console.log('final height:', h),
  () => console.log('reset'),
  { min: 120, max: 800, step: 8, initial: 240, cssVar: '--panel-h', origin: 'top' }
)
</script>

<style scoped>
.panel { position: absolute; width: 100%; background: #f7f7f7; bottom: 0 }
.v-handle {
  position: absolute; left: 0; top: 0; width: 100%; height: 1px;
  cursor: ns-resize; touch-action: none; /* needed for touch/pen dragging */
  background: rgba(0,0,0,0.06);
}
</style>