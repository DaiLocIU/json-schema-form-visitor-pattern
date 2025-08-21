<template>
  <div class="w-full">
    <div class="flex items-center justify-between" :class="{'pr-10': !props.isArrayItem}">
      <div class="flex items-center gap-2 flex-1">
        <el-input
          v-if="!props.isRoot && !props.isArrayItem"
          v-model="field._key"
          placeholder="Property name"
          class="!w-[110px]"
          size="small"
        />
          <el-select
          v-if="!props.isRoot"
          v-model="field._type[0]"
          class="!w-[85px]"
          size="small"
          placeholder="Select type"
        >
          <template #label="{ value }">
            <span  
              :style="{ color: getTypeColor(value) }"
              class="font-bold"
            >
              {{ value }}
            </span>
          </template>
          <el-option
            v-for="option in typeOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          >
            
            <span
              :style="{ color: getTypeColor(option.value) }"
              class="font-semibold"
            >
              {{ option.label }}
            </span>
          </el-option>
        </el-select>
      </div>
      <div class="flex items-center gap-2">
        <el-checkbox 
          v-if="!props.isRoot && !props.isArrayItem" 
          v-model="field._required"
          class="text-sm !h-[unset]"
        >
          Required
        </el-checkbox>
        <el-button 
          :type="showAdvanced ? 'primary' : 'default'"
          text 
          :icon="EditPen"
          @click="toggleAdvanced"  
          class="!h-[unset] !p-0 !text-base"
          :class="[
            { 'pointer-events-none invisible': props.field._type[0] === 'Object' }
          ]"
        />
      </div>
    </div>

  

    <!-- Advanced Configuration -->
    <div v-show="showAdvanced" class="bg-gray-50 border border-gray-200 rounded-md p-3 mt-2 mb-2">
      <div class="flex gap-2 mb-2">
        <el-input
          v-model="field._description"
          placeholder="Description"
          class="flex-1"
          size="small"
        />
      </div>
      <template v-if="field._type[0] === 'String'">
        <div class="flex gap-2 mb-2 items-center">
          <el-input
            type="number"
            v-model.number="field._minLength"
            placeholder="Min Length"
            size="small"
            class="flex-1"
          />
          <el-input
            type="number"
            v-model.number="field._maxLength"
            placeholder="Max Length"
            size="small"
            class="flex-1"
          />
        </div>
        <div class="flex gap-2 mb-2 items-center">
          <el-input
            v-model="field._pattern"
            placeholder="Pattern (regex)"
            size="small"
            class="flex-1"
          />
          <el-input
            v-model="field._format"
            placeholder="Format"
            size="small"
            class="flex-1"
          />
        </div>
        <div class="flex gap-2 mb-0 items-center">
          <el-input
            v-model="field._default"
            placeholder="Default value"
            size="small"
            class="flex-1"
          />
          <el-input
            v-model="field._enum"
            placeholder="Enum (comma separated)"
            size="small"
            class="flex-1"
          />
        </div>
      </template>

      <template v-else-if="field._type[0] === 'Integer' || field._type[0] === 'Number'">
        <div class="flex gap-2 mb-2 items-center">
          <el-input
            type="number"
            v-model.number="field._minimum"
            placeholder="Minimum"
            size="small"
            class="flex-1"
          />
          <el-input
            type="number"
            v-model.number="field._maximum"
            placeholder="Maximum"
            size="small"
            class="flex-1"
          />
        </div>
        <div class="flex gap-2 mb-2 items-center">
          <el-input
            type="number"
            v-model.number="field._multipleOf"
            placeholder="Multiple of"
            size="small"
            class="flex-1"
          />
          <el-input
            v-model="field._format"
            placeholder="Format"
            size="small"
            class="flex-1"
          />
        </div>
        <div class="flex gap-2 mb-0 items-center">
          <el-input
            v-model="field._default"
            placeholder="Default value"
            size="small"
            class="flex-1"
          />
          <el-input
            v-model="field._enum"
            placeholder="Enum (comma separated)"
            size="small"
            class="flex-1"
          />
        </div>
      </template>

      <template v-else-if="field._type[0] === 'Array'">
        <div class="flex gap-2 mb-0 items-center">
          <el-input
            type="number"
            v-model.number="field._minItems"
            placeholder="Min Items"
            size="small"
            class="flex-1"
          />
          <el-input
            type="number"
            v-model.number="field._maxItems"
            placeholder="Max Items"
            size="small"
            class="flex-1"
          />
          <el-checkbox v-model="field._uniqueItems">
            Unique Items
          </el-checkbox>
        </div>
      </template>

      <template v-else-if="field._type[0] === 'Boolean'">
        <div class="flex gap-2 mb-0 items-center">
          <el-select
            v-model="field._default"
            placeholder="Default value"
            size="small"
            class="flex-1"
          >
            <el-option label="Default value" value="" />
            <el-option label="true" value="true" />
            <el-option label="false" value="false" />
          </el-select>
        </div>
      </template>
    </div>

    <!-- Nested structures -->
    <template v-if="field._type[0] === 'Object'">
      <SchemaObject 
        :entity="field" 
        @add-property="(entity: unknown) => $emit('add-property', entity)"
        @remove-property="(entity: unknown, idx: number) => $emit('remove-property', entity, idx)"
      />
    </template>

    <template v-else-if="field._type[0] === 'Array'">
      <div class="mt-3 p-3 bg-purple-50 border border-dashed border-purple-400 rounded-md">
        <div class="mb-2">
          <el-tag size="small" color="#a78bfa" class="text-white">Array Items</el-tag>
        </div>
        <SchemaField 
          :field="field._items[0]" 
          :isRoot="false"
          :isArrayItem="true"
          @add-property="(entity: unknown) => $emit('add-property', entity)"
          @remove-property="(entity: unknown, idx: number) => $emit('remove-property', entity, idx)"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  EditPen,
} from '@element-plus/icons-vue'
import { ElButton, ElCheckbox, ElInput, ElOption, ElSelect, ElTag } from 'element-plus';
import { onMounted, onUnmounted } from 'vue';

import SchemaObject from '../SchemaObject/index.vue';
import { useSchemaField } from './index.viewmodel';
import SchemaField from './index.vue';

const props = defineProps(['field', 'isRoot', 'isArrayItem']);
defineEmits(['add-property', 'remove-property']);

// Use the view model
const {
  showAdvanced,
  typeOptions,
  getTypeColor,
  setupTypeWatcher,
  toggleAdvanced
} = useSchemaField();

// Setup watcher for type changes
let unwatchType: (() => void) | undefined;

onMounted(() => {
  unwatchType = setupTypeWatcher(props.field);
});

onUnmounted(() => {
  if (unwatchType) {
    unwatchType();
  }
});
</script>


<style scoped>
:deep(.el-tag) {
  border: none;
  font-weight: 500;
  color: white !important;
}

:deep(.el-tag .el-tag__content) {
  color: white !important;
}

:deep(.el-input) {
  font-size: 13px;
}

:deep(.el-select) {
  font-size: 13px;
}

:deep(.el-checkbox) {
  font-size: 13px;
}

/* Nested styling improvements */
.schema-field .schema-object {
  margin-top: 12px;
}

.schema-field .schema-field {
  margin-top: 8px;
}
:deep(.el-checkbox__input .el-checkbox__label){
  font-size: 13px !important;
}
:deep(.el-checkbox__input.is-checked+.el-checkbox__label){
  color: #606266;
}
</style>