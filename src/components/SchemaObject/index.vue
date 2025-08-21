<template>
  <div class="w-full my-2">
    <div
      class="flex items-center gap-2 rounded-md cursor-pointer transition-all duration-300 hover:bg-[#f5f5f5] px-[8px] py-[2.5px] pb-[2px] ml-[20px] relative"
      @click="toggleExpand">
      <el-button text size="small" type="primary" @click.stop="addNew" class="!text-2xl absolute top-[-3px] left-[-28px] h-[unset] py-0 px-1">
        +
      </el-button>
      <span class="inline-block w-4 text-center text-xs text-[#2196f3] transition-transform duration-300"
        :class="{ 'rotate-90': isExpanded }">
        ▶
      </span>
      <span class="font-semibold  leading-normal text-[13px] Object">
        {{ 'Object' }}
      </span>
      <span class="text-xs text-gray-500">
        {{ '{' + (props.entity._properties?.length || 0) + '}' }}
      </span>
     
    </div>

    <div v-show="isExpanded" class="ml-[20px]">
      <div v-for="(prop, idx) in props.entity._properties" :key="prop.__ID__">
        <div class="relative group">
          <div class="pl-[8px] py-[2.5px] pb-[2px] ml-[20px] hover:bg-[#f5f5f5]">
            <SchemaField 
              :field="prop" 
              @add-property="(entity) => $emit('add-property', entity)"
              @remove-property="(entity, idx) => $emit('remove-property', entity, idx)" 
            />
          </div>
          <el-button type="danger" size="small" circle @click="remove(idx)" class="absolute top-[7px] right-3 !w-[16px] !h-[16px]">
            ✕
          </el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElButton, ElTag } from 'element-plus';

import SchemaField from '../SchemaField/index.vue';
import { useSchemaObject } from './index.viewmodel';

const props = defineProps(['entity']);
const emit = defineEmits(['add-property', 'remove-property']);

// Use the view model with unique entity ID
const entityId = props.entity.__ID__ || props.entity._key || 'root';
const { isExpanded, toggleExpand } = useSchemaObject(entityId);

function addNew() {
  emit('add-property', props.entity);
}

function remove(idx: number) {
  emit('remove-property', props.entity, idx);
}
</script>

<style scoped lang="scss">
/* Only keep necessary Element Plus customizations that can't be done with Tailwind */
:deep(.el-tag) {
  font-size: 12px;
}

:deep(.el-button) {
  font-size: 12px;
}

/* Nested object styling with deeper levels */
.schema-object .schema-object {
  margin-top: 8px;
}

:deep(.schema-object .schema-object .object-header) {
  background-color: #ecf5ff;
}
.Object {
  color: #2196f3 !important;
}
</style>