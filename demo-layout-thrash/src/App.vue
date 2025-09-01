<template>
  <Stars></Stars>
  <Love></Love>
</template>
<script lang="ts">
import { defineComponent } from 'vue'
import Stars from './Stars.vue'
import Love from './Love.vue'

export default defineComponent({
  components: {
    Stars,
    Love
  }
})
</script>