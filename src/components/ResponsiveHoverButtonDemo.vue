<template>
  <div style="padding: 20px; display:flex; flex-direction:column; gap:16px; align-items:flex-start;">
    <h2>Responsive Hover Button Demo</h2>

    <ResponsiveHoverButton
      class="demo-btn"
      @activate="onActivate"
      :activateDelay="300"
    >
      Hover or Click me
    </ResponsiveHoverButton>

    <p>Last activated: <strong>{{ lastActivated }}</strong></p>

    <p>Try on touch devices (or emulate touch) — button also activates on click.</p>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ResponsiveHoverButton from '../views/ResponsiveHoverButton.vue'

const lastActivated = ref('never')

function onActivate(e: Event) {
  lastActivated.value = new Date().toLocaleTimeString()
}
</script>

<style scoped>
.demo-btn {
  padding: 12px 20px;
  border: 1px solid #2b6cb0;
  background: linear-gradient(180deg, #2b6cb0 0%, #2a4365 100%);
  color: white;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.demo-btn:active { transform: translateY(1px); }
</style>
