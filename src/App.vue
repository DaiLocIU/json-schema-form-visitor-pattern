<!-- App.vue -->
<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div id="app">
    <!-- Navigation -->
    <nav style="background: #2c3e50; padding: 1rem 0; margin-bottom: 0;">
      <div style="max-width: 1200px; margin: 0 auto; padding: 0 20px;">
        <div style="display: flex; align-items: center; gap: 2rem;">
          <h2 style="color: white; margin: 0;">Vue Dynamic Form</h2>
          <div style="display: flex; gap: 1rem;">
            <RouterLink 
              to="/" 
              style="color: #ecf0f1; text-decoration: none; padding: 0.5rem 1rem; border-radius: 4px; transition: background-color 0.3s;"
              active-class="active-link"
            >
              JSON Schema Forms
            </RouterLink>
            <RouterLink 
              to="/dynamic-input-test" 
              style="color: #ecf0f1; text-decoration: none; padding: 0.5rem 1rem; border-radius: 4px; transition: background-color 0.3s;"
              active-class="active-link"
            >
              Dynamic Input Test
            </RouterLink>
            <RouterLink 
              to="/responsive-hover-button-test" 
              style="color: #ecf0f1; text-decoration: none; padding: 0.5rem 1rem; border-radius: 4px; transition: background-color 0.3s;"
              active-class="active-link"
            >
              Hover Button Test
            </RouterLink>
          </div>
        </div>
      </div>
    </nav>

    <!-- Main Content -->
    <main>
      <RouterView />
    </main>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #f5f7fa;
}

#app {
  min-height: 100vh;
}

nav a:hover {
  background-color: rgba(255, 255, 255, 0.1) !important;
}

.active-link {
  background-color: rgba(255, 255, 255, 0.2) !important;
}
</style>
