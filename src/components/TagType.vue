<template>
  <span
    :class="getTypeColor(type as InputValueType)"
    class="text-xs px-1 py-1 bg-gray-100 rounded"
  >
    {{ type }}
  </span>
</template>
<script setup lang="ts">
import { type InputValueType } from "../typings/inputValueType";
import { getTypeColor } from "../utils/helpers";

defineProps<{
  type: InputValueType;
}>();
</script>
