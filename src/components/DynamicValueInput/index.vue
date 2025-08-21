<template>
  <div class="dynamic-value-input">
    <!-- Handle Value Options  -->
    <template
      v-if="
        props.optionsValue && props.keyName && props.optionsValue[props.keyName]
      "
    >
      <template v-if="props.optionsValue[props.keyName].enum">
        <el-select
          :model-value="modelValue"
          @update:model-value="updateValue"
          placeholder="Select or enter value"
          clearable
          :disabled="props.disabled"
          class="w-full"
        >
          <el-option
            v-for="(option, index) in props.optionsValue[props.keyName].enum"
            :key="index"
            :label="option"
            :value="option"
          />
        </el-select>
      </template>
    </template>

    <!-- String Type -->
    <template v-else-if="type === InputValueType.STRING">
      <el-input
        v-if="!props.enumValues?.length"
        :model-value="modelValue"
        @update:model-value="updateValue"
        placeholder="Enter string value"
        clearable
        :disabled="props.disabled"
      >
        <template #append>
          <el-button
            @click="openTextModal"
            :icon="Edit"
            :disabled="props.disabled"
          />
        </template>
      </el-input>
      <el-select
        v-else
        :model-value="modelValue"
        placeholder="Select or enter value"
        clearable
        :disabled="props.disabled"
        @update:model-value="updateValue"
        class="w-full"
      >
        <el-option
          v-for="value in props.enumValues"
          :key="value"
          :label="value"
          :value="value"
        />
      </el-select>
    </template>

    <!-- Integer Type -->
    <el-input
      v-else-if="type === InputValueType.INTEGER"
      :model-value="integerDisplayValue"
      @input="handleIntegerInput"
      placeholder="Enter integer value"
      clearable
      :disabled="props.disabled"
    />

    <!-- Float Type -->
    <el-input
      v-else-if="type === InputValueType.FLOAT"
      :model-value="floatDisplayValue"
      @input="handleFloatInput"
      placeholder="Enter float value"
      clearable
      :disabled="props.disabled"
    />

    <!-- Boolean Type -->
    <div
      v-else-if="type === InputValueType.BOOLEAN"
      class="flex items-center gap-3"
    >
      <el-switch
        :model-value="modelValue"
        @update:model-value="updateValue"
        active-text="True"
        :active-value="true"
        :inactive-value="false"
        :disabled="props.disabled"
      />
    </div>

    <!-- List Type -->
    <div
      v-else-if="type === InputValueType.LIST || type === InputValueType.ARRAY"
      class="space-y-2"
    >
      <div class="flex items-center gap-2">
        <el-input
          v-model="newListItem"
          placeholder="Add list item"
          @keyup.enter="addListItem"
          class="flex-1"
          :disabled="props.disabled"
        />
        <el-button
          type="primary"
          @click="addListItem"
          :disabled="!newListItem || props.disabled"
        >
          Add
        </el-button>
      </div>
      <div v-if="listItems.length > 0" class="space-y-1">
        <div
          v-for="(item, index) in listItems"
          :key="index"
          class="flex items-center gap-2 p-2 bg-gray-50 rounded"
        >
          <span class="flex-1">{{ item }}</span>
          <el-button
            type="danger"
            size="small"
            circle
            @click="removeListItem(index)"
            :disabled="props.disabled"
          >
            ✕
          </el-button>
        </div>
      </div>
    </div>

    <!-- JSON Schema Type -->
    <div v-else-if="type === InputValueType.JSON_SCHEMA" class="space-y-2">
      <JSONSchemaBuilder
        v-model="jsonSchemaValue"
        class="border border-gray-200 rounded p-3"
        :disabled="props.disabled"
        :requireObjectType="true"
      />
    </div>

    <!-- Image Type -->
    <div v-else-if="type === InputValueType.IMAGE" class="space-y-2">
      <el-upload
        class="image-uploader"
        :show-file-list="false"
        :before-upload="beforeImageUpload"
        :http-request="handleImageUpload"
        accept="image/*"
        drag
        :disabled="props.disabled"
      >
        <div v-if="!imagePreview" class="upload-area">
          <el-icon class="upload-icon"><Plus /></el-icon>
          <div class="upload-text">Click or drag image to upload</div>
          <div class="upload-hint">JPG, PNG, GIF up to 10MB</div>
        </div>
        <div v-else class="image-preview">
          <img :src="imagePreview" alt="Preview" class="preview-image" />
          <div class="image-overlay">
            <el-button
              type="danger"
              circle
              @click.stop="removeImage"
              :disabled="props.disabled"
            >
              <el-icon><Delete /></el-icon>
            </el-button>
          </div>
        </div>
      </el-upload>
      <div v-if="uploadError" class="text-red-500 text-sm mt-2">
        {{ uploadError }}
      </div>
    </div>

    <!-- Base64 File Type -->
    <div v-else-if="type === InputValueType.BASE64_FILE" class="space-y-2">
      <el-upload
        v-if="!modelValue || !modelValue.filename || !modelValue.content"
        class="image-uploader"
        :show-file-list="false"
        :before-upload="beforeBase64Upload"
        :http-request="handleBase64Upload"
        accept="*"
        drag
        :disabled="props.disabled"
      >
        <div class="upload-area">
          <el-icon class="upload-icon"><Plus /></el-icon>
          <div class="upload-text">Click or drag file to upload</div>
          <div class="upload-hint">Any file type, up to 10MB</div>
        </div>
      </el-upload>
      <div v-else class="space-y-2">
        <div class="flex flex-col gap-1">
          <el-tag type="info">
            {{ modelValue.filename }}
          </el-tag>
          <el-button
            size="small"
            type="primary"
            link
            @click="downloadBase64File"
            :disabled="props.disabled"
          >
            Download
          </el-button>
        </div>

        <el-button
          size="small"
          type="danger"
          @click="removeBase64File"
          class="absolute top-[-40px] right-0"
          :disabled="props.disabled"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>
      <div v-if="base64FileError" class="text-red-500 text-sm mt-2">
        {{ base64FileError }}
      </div>
    </div>

    <div
      v-else-if="type === InputValueType.TOOLS || type === InputValueType.TOOL"
      class="space-y-2"
    >
      <InfiniteSelect
        :model-value="modelValue"
        :query-key="['tools']"
        :query-fn="fetchTools"
        :get-option-key="getToolKey"
        :get-option-label="getToolLabel"
        :get-option-value="getToolValue"
        :multiple="type === InputValueType.TOOLS"
        value-key="id"
        :collapse-tags="true"
        :max-collapse-tags="2"
        placeholder="Select tools"
        filterable
        clearable
        searchable
        @update:model-value="updateValue"
        :disabled="props.disabled"
      />
    </div>
    <div v-else-if="type === InputValueType.STRUCT">
      <DynamicSchemaForm
        ref="schemaFormRef"
        :model-value="modelValue"
        @update:model-value="updateValue"
        :schema="jsonSchema || {}"
        :disabled="props.disabled"
      ></DynamicSchemaForm>
    </div>
    <!-- Default/Fallback for unknown types -->
    <el-input
      v-else
      :model-value="
        typeof modelValue === 'string' ? modelValue : JSON.stringify(modelValue)
      "
      @update:model-value="updateValue"
      placeholder="Enter value (JSON format)"
      type="textarea"
      :rows="3"
      :disabled="props.disabled"
    />
  </div>

  <!-- Text Modal for String Type -->
  <el-dialog
    v-model="showTextModal"
    title="Edit Text"
    width="800px"
    :close-on-click-modal="false"
  >
    <div class="monaco-editor-wrapper">
      <MonacoEditor
        v-model="textModalValue"
        language="python"
        :theme="'vs'"
        :height="'400px'"
        :read-only="props.disabled"
        @change="handleTextChange"
      />
    </div>
    <template #footer>
      <span class="dialog-footer">
        <el-button @click="cancelTextModal" :disabled="props.disabled"
          >Cancel</el-button
        >
        <el-button
          type="primary"
          @click="saveTextModal"
          :disabled="props.disabled"
          >Save</el-button
        >
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { Delete, Edit, Plus } from "@element-plus/icons-vue";
import {
  ElButton,
  ElDialog,
  ElIcon,
  ElInput,
  ElSwitch,
  ElUpload,
} from "element-plus";
import { ref } from "vue";

import DynamicSchemaForm from "../DynamicSchemaForm/index.vue";
import InfiniteSelect from "../InfiniteSelect/InfiniteSelect.vue";
import JSONSchemaBuilder from "../JSONSchemaBuilder/index.vue";
import MonacoEditor from "../MonacoEditor/MonacoEditor.vue";
import { InputValueType } from "../../typings/inputValueType"

import { useDynamicValueInput } from "./index.viewmodel";

defineOptions({
  name: "DynamicValueInput",
});

interface Props {
  modelValue: any;
  type: string;
  placeholder?: string;
  optionsWorkFlow?: Array<{ name: string; id: string }>;
  // Multiple selection props
  multiple?: boolean;
  collapseTags?: boolean;
  collapseTagsTooltip?: boolean;
  maxCollapseTags?: number;
  // type struct
  jsonSchema?: Record<string, any>;
  
  enumValues?: Array<string>;
  disabled?: boolean;
  keyName?: string;
  optionsValue?: Record<string, any>; // this is for default value or enum value
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Enter value",
  multiple: false,
  collapseTags: false,
  collapseTagsTooltip: false,
  maxCollapseTags: 1,
  disabled: false,
});

const emit = defineEmits<{
  "update:modelValue": [value: any];
}>();

// Use the viewmodel
const {
  newListItem,
  listItems,
  imagePreview,
  uploadError,
  jsonSchemaValue,
  integerDisplayValue,
  floatDisplayValue,
  updateValue,
  addListItem,
  removeListItem,
  handleIntegerInput,
  handleFloatInput,
  beforeImageUpload,
  handleImageUpload,
  removeImage,
  beforeBase64Upload,
  handleBase64Upload,
  removeBase64File,
  base64FileError,

  // Text modal methods
  showTextModal,
  textModalValue,
  openTextModal,
  cancelTextModal,
  saveTextModal,
} = useDynamicValueInput(props, emit);

// Ref to access DynamicSchemaForm validation method
const schemaFormRef = ref();

// Validation method for struct types
const validateStructForm = async (): Promise<boolean> => {
  if (props.type === InputValueType.STRUCT && schemaFormRef.value) {
    console.log("Validating struct form...");
    try {
      return await schemaFormRef.value.validateForm();
    } catch (error) {
      console.error("Struct validation error:", error);
      return false;
    }
  }
  return true; // Non-struct types always pass validation
};

// Expose validation method for parent components
defineExpose({
  validateStructForm,
});

const handleTextChange = (newValue: string) => {
  textModalValue.value = newValue;
};

function downloadBase64File() {
  if (!props.modelValue || !props.modelValue.content) return;
  const filename = props.modelValue.filename || "file.bin";
  const content = props.modelValue.content;
  let href = "";
  if (typeof content === "string" && content.startsWith("data:")) {
    href = content;
  } else {
    href = `data:application/octet-stream;base64,${content}`;
  }
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
</script>

<style scoped>
.dynamic-value-input {
  width: 100%;
}

/* Image upload styles */
.image-uploader :deep(.el-upload) {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
  width: 100%;
  height: 200px;
}
.image-uploader :deep(.el-upload-dragger) {
  width: 100%;
  height: 100%;
  padding: 0;
}

.image-uploader :deep(.el-upload:hover) {
  border-color: #409eff;
}

.upload-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #8c939d;
}

.upload-icon {
  font-size: 28px;
  margin-bottom: 16px;
}

.upload-text {
  font-size: 14px;
  margin-bottom: 8px;
}

.upload-hint {
  font-size: 12px;
  color: #c0c4cc;
}

.image-preview {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.image-overlay {
  position: absolute;
  top: 8px;
  right: 8px;
  opacity: 0;
  transition: opacity 0.3s;
}

.image-preview:hover .image-overlay {
  opacity: 1;
}

/* Monaco Editor styles */
.monaco-editor-wrapper {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
}
</style>
