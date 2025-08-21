<template>
  <div 
    class="object-group" 
    :class="`level-${group.level}`"
  >
    <div class="object-group-header">
      <h4>{{ group.title }}</h4>
      <div v-if="group.description" class="object-group-description">
        {{ group.description }}
      </div>
    </div>
    
    <div class="object-group-content">
      <!-- Render properties of this group -->
      <template v-for="(property, fieldKey) in group.properties" :key="fieldKey">
        <ElFormItem 
          :label="getFieldLabel(property, String(fieldKey))"
          :required="isRequired(String(fieldKey))"
          :prop="String(fieldKey)"
          class="form-field"
        >
          <template #label>
            <div class="flex align-center gap-1">
                <span class="text-sm text-gray-600">{{ getFieldLabel(property, String(fieldKey)) }}</span>
                <TagType :type="getType(property, String(fieldKey))" class="ml-2" />
            </div>
          </template>
          <DynamicValueInput
            :model-value="formData[fieldKey]"
            @update:model-value="(value: any) => $emit('update-field', String(fieldKey), value)"
            :type="mapSchemaTypeToDynamicInput(property)"
            :placeholder="getFieldPlaceholder(property, String(fieldKey))"
            :enum-values="property.enum"
          />
          
          <div v-if="property.description" class="field-description">
            {{ property.description }}
          </div>
        </ElFormItem>
      </template>
      
      <!-- Recursively render nested child groups -->
      <template v-for="childGroup in group.children" :key="childGroup.path">
        <ObjectGroup 
          :group="childGroup"
          :form-data="formData"
          :get-field-label="getFieldLabel"
          :get-field-placeholder="getFieldPlaceholder"
          :is-required="isRequired"
          :get-type="getType"
          :map-schema-type-to-dynamic-input="mapSchemaTypeToDynamicInput"
          @update-field="(fieldKey: string, value: any) => $emit('update-field', fieldKey, value)"
        />
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElFormItem } from 'element-plus';

import type { InputValueType } from '@/typings/inputValueType';

import DynamicValueInput from '../DynamicValueInput/index.vue';
import TagType from '../TagType.vue';

defineOptions({
  name: "ObjectGroup",
});

defineProps<{
  group: any;
  formData: Record<string, any>;
  getType: (property: any, fieldKey: string) => InputValueType;
  getFieldLabel: (property: any, fieldKey: string) => string;
  getFieldPlaceholder: (property: any, fieldKey: string) => string;
  isRequired: (fieldKey: string) => boolean;
  mapSchemaTypeToDynamicInput: (property: any) => string;
}>();

defineEmits<{
  (e: 'update-field', fieldKey: string, value: any): void;
}>();
</script>

<style scoped>
.object-group {
  padding: 16px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fafbfc;
}

.object-group.level-1 {
  margin-left: 0;
}

.object-group.level-2 {
  background-color: #f5f7fa;
}

.object-group.level-3 {
  background-color: #f0f2f5;
}

.object-group.level-4 {
  background-color: #ebedf0;
}

/* For deeper levels, continue the pattern */
.object-group:where([class*="level-"]:not(.level-1):not(.level-2):not(.level-3):not(.level-4)) {
  background-color: #e6e8eb;
}

.object-group-header {
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.object-group-header h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
}

.object-group-description {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

.object-group-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-field {
  margin-bottom: 0;
}

.field-description {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
}

:deep(.el-form-item__content) {
  line-height: normal;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .object-group.level-2,
  .object-group.level-3,
  .object-group.level-4 {
    margin-left: 10px;
  }
  
  .field-description {
    font-size: 11px;
  }
}
</style>
