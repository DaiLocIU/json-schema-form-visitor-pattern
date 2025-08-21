<template>
  <div class="json-schema-builder bg-white">
    <ElTabs v-model="activeTab" @tab-change="handleTabChange">
      <ElTabPane label="Designer" name="designer">
        <SchemaObject
          :entity="rootEntity"
          @add-property="addProperty"
          @remove-property="removeProperty"
        />
      </ElTabPane>
      
      <ElTabPane label="JSON Schema" name="json">
        
        <div class="json-editor-container">
          <div class="json-editor-header">
            <span class="editor-title">JSON Schema Editor</span>
            <ElButton 
              type="primary" 
              size="small" 
              @click="validateAndApplyJson"
            >
              Apply JSON
            </ElButton>
          </div>
          <JsonEditor
            ref="jsonEditorRef"
            v-model="jsonEditorObject"
            :mode="'code'"
            @error="handleJsonError"
            @valid="handleJsonValid"
            class="json-editor"
            :require-object-type="requireObjectType"
          />
          
          <div v-if="jsonError" class="json-error">
            <ElAlert
              :title="jsonError"
              type="error"
              show-icon
              :closable="false"
            />
          </div>
          
          <div v-if="jsonWarning" class="json-warning">
            <ElAlert
              :title="jsonWarning"
              :type="jsonWarning.includes('successfully') ? 'success' : 'warning'"
              show-icon
              :closable="false"
            />
          </div>
        </div>
      </ElTabPane>
    </ElTabs>
  </div>
</template>

<script setup lang="ts">
import { ElAlert, ElButton, ElTabPane, ElTabs } from 'element-plus';
import { ref } from 'vue';

import JsonEditor from '../JsonEditor/index.vue';
import SchemaObject from '../SchemaObject/index.vue';
import { useJSONSchemaBuilder } from './index.viewmodel';

// Define props and emits
const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  },
  requireObjectType: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:modelValue']);

// JsonEditor ref
const jsonEditorRef = ref();

// Initialize the schema builder with all UI state and methods
const {
  rootEntity,
  addProperty,
  removeProperty,
  activeTab,
  jsonEditorObject,
  jsonError,
  jsonWarning,
  hasValidJson,
  validateAndApplyJson: originalValidateAndApplyJson,
  handleTabChange,
  handleJsonError,
  handleJsonValid,
} = useJSONSchemaBuilder(props.modelValue, (newJson) => {
  emit('update:modelValue', newJson);
});

// Override validateAndApplyJson to pass the ref
const validateAndApplyJson = () => {
  return originalValidateAndApplyJson(jsonEditorRef.value);
};
</script>



<style scoped>
.json-schema-builder {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.json-editor-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
}

.json-editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.editor-title {
  font-weight: 500;
  color: #606266;
}

.json-editor {
  flex: 1;
}

.json-error,
.json-warning {
  margin-top: 8px;
}

:deep(.el-tabs__content) {
  height: calc(100% - 40px);
  overflow: hidden;
}

:deep(.el-tab-pane) {
  height: 100%;
  overflow-y: auto;
}
</style>