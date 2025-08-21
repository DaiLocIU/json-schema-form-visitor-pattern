<template>
  <div class="monaco-editor-container">
    <div ref="editorContainer" class="editor-container"></div>
  </div>
</template>

<script setup lang="ts">
import {
  type MonacoEditorEmits,
  type MonacoEditorProps,
  useMonacoEditor,
} from "./useMonacoEditor";

const props = withDefaults(defineProps<MonacoEditorProps>(), {
  modelValue: "",
  language: "json",
  theme: "vs",
  readOnly: false,
  height: "400px",
  options: () => ({}),
});

const emit = defineEmits<MonacoEditorEmits>();

// Use ViewModel
const {
  editorContainer,
  editor,
  getValue,
  setValue,
  focus,
  getModel,
  updateOptions,
} = useMonacoEditor(props, emit);

// Expose editor instance and methods
defineExpose({
  editor,
  getValue,
  setValue,
  focus,
  getModel,
  updateOptions,
});
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  border-radius: 8px;
  overflow: hidden;
}

.editor-container {
  height: v-bind(height);
  min-height: 200px;
}
</style>
