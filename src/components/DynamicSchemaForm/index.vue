<template>
  <div class="dynamic-schema-form">
    <div v-if="!schema" class="empty-schema">
      <ElAlert
        title="No schema defined"
        type="info"
        show-icon
        :closable="false"
      />
    </div>

    <!-- Tabs for Form View and JSON View -->
    <div v-else>
      <ElTabs v-model="activeTab" class="schema-tabs">
        <ElTabPane label="Form View" name="form">
          <div class="tab-content">
            <!-- Handle array schema (root level array) -->
            <div v-if="isArraySchema()" class="array-schema">
              <div class="array-header">
                <div class="array-controls">
                  <ElButton
                    type="primary"
                    @click="addArrayItem"
                    :icon="Plus"
                    size="small"
                  >
                    Add Item
                  </ElButton>
                </div>
              </div>

              <!-- Render array items -->
              <div
                v-for="(item, index) in getArrayItems()"
                :key="index"
                class="array-item"
              >
                <div class="array-item-header">
                  <span class="item-index">Item {{ index + 1 }}</span>
                  <ElButton
                    type="danger"
                    @click="removeArrayItem(index)"
                    :icon="Delete"
                    size="small"
                    text
                    v-if="getArrayItems().length > 1"
                  >
                    Remove
                  </ElButton>
                </div>

                <ElForm
                  ref="arrayFormRef"
                  :model="item"
                  :rules="getValidationRules"
                  label-position="top"
                  class="schema-form array-item-form"
                  @submit.prevent
                >
                  <!-- Render root level properties of array items -->
                  <template
                    v-for="(property, fieldKey) in getRootProperties()"
                    :key="fieldKey"
                  >
                    <ElFormItem
                      :label="getFieldLabel(property, String(fieldKey))"
                      :required="isRequired(String(fieldKey))"
                      :prop="String(fieldKey)"
                      class="form-field"
                    >
                      <template #label>
                        <div class="flex align-center gap-1">
                          <span class="text-sm text-gray-600">{{
                            getFieldLabel(property, String(fieldKey))
                          }}</span>
                          <TagType
                            :type="getType(property, String(fieldKey))"
                            class="ml-2"
                          />
                        </div>
                      </template>

                      <!-- anyOf type selection -->
                      <div
                        v-if="hasAnyOfSelection(property)"
                        class="anyof-selection"
                      >
                        <ElSelect
                          :model-value="
                            getSelectedAnyOfType(String(fieldKey), property)
                          "
                          @update:model-value="
                            (value) =>
                              setSelectedAnyOfType(String(fieldKey), value)
                          "
                          placeholder="Select type"
                          class="mb-2"
                        >
                          <ElOption
                            v-for="option in getAnyOfOptions(property)"
                            :key="option.value"
                            :label="option.label"
                            :value="option.value"
                          />
                        </ElSelect>
                        <!-- Render input based on selected type -->
                        <DynamicValueInput
                          :model-value="item[fieldKey]"
                          @update:model-value="
                            (value) =>
                              handleFieldUpdate(String(fieldKey), value, index)
                          "
                          :type="
                            getSelectedAnyOfType(String(fieldKey), property)
                          "
                          :placeholder="
                            getFieldPlaceholder(property, String(fieldKey))
                          "
                          :enum-values="property.enum"
                        />
                      </div>

                      <!-- Regular input for non-anyOf fields -->

                      <DynamicValueInput
                        v-else
                        :model-value="item[fieldKey]"
                        @update:model-value="
                          (value) =>
                            handleFieldUpdate(String(fieldKey), value, index)
                        "
                        :type="mapSchemaTypeToDynamicInput(property)"
                        :placeholder="
                          getFieldPlaceholder(property, String(fieldKey))
                        "
                        :enum-values="property.enum"
                      />

                      <div
                        v-if="property.description"
                        class="field-description"
                      >
                        {{ property.description }}
                      </div>
                    </ElFormItem>
                  </template>

                  <!-- Render nested object groups for array items -->
                  <template
                    v-for="group in getTopLevelGroups()"
                    :key="group.path"
                  >
                    <ObjectGroup
                      :group="group"
                      :form-data="item"
                      :get-field-label="getFieldLabel"
                      :get-field-placeholder="getFieldPlaceholder"
                      :is-required="isRequired"
                      :get-type="getType"
                      :map-schema-type-to-dynamic-input="
                        mapSchemaTypeToDynamicInput
                      "
                      @update-field="
                        (fieldKey, value) =>
                          handleFieldUpdate(fieldKey, value, index)
                      "
                    />
                  </template>
                </ElForm>
              </div>
            </div>

            <!-- Handle object schema -->
            <div v-else-if="!schema.properties" class="empty-schema">
              <ElAlert
                title="No schema properties defined"
                type="info"
                show-icon
                :closable="false"
              />
            </div>

            <ElForm
              v-else
              ref="mainFormRef"
              :model="formData"
              :rules="getValidationRules"
              label-position="top"
              class="schema-form"
              @submit.prevent
            >
              <!-- Render root level properties first -->
              <template
                v-for="(property, fieldKey) in getRootProperties()"
                :key="fieldKey"
              >
                <ElFormItem
                  :label="getFieldLabel(property, String(fieldKey))"
                  :required="isRequired(String(fieldKey))"
                  :prop="String(fieldKey)"
                  class="form-field"
                >
                  <template #label>
                    <div class="flex align-center gap-1">
                      <span class="text-sm text-gray-600">{{
                        getFieldLabel(property, String(fieldKey))
                      }}</span>
                      <TagType
                        :type="getType(property, String(fieldKey))"
                        class="ml-2"
                      />
                    </div>
                  </template>

                  <!-- anyOf type selection -->
                  <div
                    v-if="hasAnyOfSelection(property)"
                    class="anyof-selection"
                  >
                    <ElSelect
                      :model-value="
                        getSelectedAnyOfType(String(fieldKey), property)
                      "
                      @update:model-value="
                        (value) => setSelectedAnyOfType(String(fieldKey), value)
                      "
                      placeholder="Select type"
                      class="mb-2"
                    >
                      <ElOption
                        v-for="option in getAnyOfOptions(property)"
                        :key="option.value"
                        :label="option.label"
                        :value="option.value"
                      />
                    </ElSelect>

                    <!-- Render input based on selected type -->
                    <DynamicValueInput
                      :model-value="(formData as Record<string, any>)[fieldKey]"
                      @update:model-value="
                        (value) => handleFieldUpdate(String(fieldKey), value)
                      "
                      :type="getSelectedAnyOfType(String(fieldKey), property)"
                      :placeholder="
                        getFieldPlaceholder(property, String(fieldKey))
                      "
                    />
                  </div>

                  <!-- Regular input for non-anyOf fields -->
                  <DynamicValueInput
                    v-else
                    v-model="(formData as Record<string, any>)[fieldKey]"
                    :type="mapSchemaTypeToDynamicInput(property)"
                    :placeholder="
                      getFieldPlaceholder(property, String(fieldKey))
                    "
                  />

                  <div v-if="property.description" class="field-description">
                    {{ property.description }}
                  </div>
                </ElFormItem>
              </template>

              <!-- Render nested object groups -->
              <template v-for="group in getTopLevelGroups()" :key="group.path">
                <ObjectGroup
                  :group="group"
                  :form-data="formData"
                  :get-field-label="getFieldLabel"
                  :get-field-placeholder="getFieldPlaceholder"
                  :is-required="isRequired"
                  :get-type="getType"
                  :map-schema-type-to-dynamic-input="
                    mapSchemaTypeToDynamicInput
                  "
                  @update-field="handleFieldUpdate"
                />
              </template>
            </ElForm>
          </div>
        </ElTabPane>

        <!-- JSON View Tab -->
        <ElTabPane label="JSON View" name="json">
          <div class="json-tab-content">
            <JsonEditor
              :model-value="jsonData"
              @update:model-value="handleJsonChange"
              :mode="'code'"
              :schema="schema"
            />
          </div>
        </ElTabPane>
      </ElTabs>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Delete, Plus } from "@element-plus/icons-vue";
import {
  ElAlert,
  ElButton,
  ElForm,
  ElFormItem,
  ElOption,
  ElSelect,
  ElTabPane,
  ElTabs,
} from "element-plus";

import DynamicValueInput from "../DynamicValueInput/index.vue";
import JsonEditor from '../JsonEditor/index.vue';
import TagType from "../TagType.vue";
import { useDynamicSchemaForm } from "./index.viewmodel";
import ObjectGroup from "./ObjectGroup.vue";

defineOptions({
  name: "DynamicSchemaForm",
});

const props = defineProps<{
  modelValue: Record<string, any> | any[] | undefined;
  schema: Record<string, any>;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: Record<string, any> | any[]): void;
}>();

// Initialize the dynamic schema form with all logic
const {
  formData,
  jsonData,
  getType,
  getFieldLabel,
  getFieldPlaceholder,
  isRequired,
  mapSchemaTypeToDynamicInput,
  getRootProperties,
  getTopLevelGroups,
  handleFieldUpdate,
  isArraySchema,
  // Array management
  addArrayItem,
  removeArrayItem,
  getArrayItems,
  // anyOf type selection
  getAnyOfOptions,
  hasAnyOfSelection,
  getSelectedAnyOfType,
  setSelectedAnyOfType,
  // Form refs and validation
  mainFormRef,
  arrayFormRef,
  getValidationRules,
  validateForm,
  // Tab functionality
  activeTab,
  handleJsonChange,
} = useDynamicSchemaForm(props, emit);

// Expose validation method for parent components
defineExpose({
  validateForm,
});
</script>

<style scoped>
:deep(.el-form-item__label) {
  display: flex;
}
.dynamic-schema-form {
  width: 100%;
}

.empty-schema {
  padding: 20px;
  text-align: center;
}

.schema-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field {
  margin-bottom: 0;
}

/* Array Management Styles */
.array-header {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 20px;
}

.array-controls {
  display: flex;
  justify-content: flex-end;
}

.array-item {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  background-color: #fafbfc;
}

.array-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.item-index {
  font-weight: 600;
  color: #409eff;
  font-size: 14px;
}

.array-item-form {
  gap: 12px;
}

/* anyOf Selection Styles */
.anyof-selection {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.anyof-selection .el-select {
  width: 200px;
}

.mb-2 {
  margin-bottom: 8px;
}

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

/* Handle nested object styling */
:deep(.dynamic-value-input) {
  width: 100%;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .schema-form {
    gap: 12px;
  }

  .field-description {
    font-size: 11px;
  }

  .array-item {
    padding: 12px;
  }

  .array-item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .anyof-selection .el-select {
    width: 100%;
  }
}

/* Tab styles */
.schema-tabs {
  margin-bottom: 20px;
}

.tab-content {
  padding: 16px 0;
}

.json-tab-content {
  padding: 16px 0;
}
</style>
