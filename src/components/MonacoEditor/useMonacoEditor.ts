// useMonacoEditor.ts
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

import { monaco } from "../../plugins/monaco"// the file from step 1
import { pythonLanguageServer } from "../../plugins/python-language-server";

import type { MonacoEditorEmits, MonacoEditorProps } from "./types";

// Re-export types for component usage
export type { MonacoEditorEmits, MonacoEditorProps };

export function useMonacoEditor(
  props: MonacoEditorProps,
  emit: MonacoEditorEmits
) {
  const editorContainer = ref<HTMLDivElement>();
  let editor: monaco.editor.IStandaloneCodeEditor | null = null;

  const defaultOptions: monaco.editor.IStandaloneEditorConstructionOptions = {
    automaticLayout: true,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: "on",
    wordWrap: "on",
    // Enable suggestions and coding features
    quickSuggestions: {
      other: true,
      comments: true,
      strings: true,
    },
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    wordBasedSuggestions: "allDocuments",
    parameterHints: { enabled: true },
    hover: { enabled: true },
    contextmenu: true,
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showClasses: true,
      showFunctions: true,
      showVariables: true,
      showModules: true,
      showProperties: true,
      showEvents: true,
      showOperators: true,
      showUnits: true,
      showValues: true,
      showConstants: true,
      showEnums: true,
      showEnumMembers: true,
      showColors: true,
      showFiles: true,
      showReferences: true,
      showFolders: true,
      showTypeParameters: true,
      showWords: true,
    },
    // Enable folding and navigation
    folding: true,
    foldingStrategy: "auto",
    showFoldingControls: "always",
    // Enable selection and editing features
    selectOnLineNumbers: true,
    roundedSelection: false,
    // Enable scrollbar and navigation
    scrollbar: {
      vertical: "visible",
      horizontal: "visible",
    },
    // Enable links and references
    links: true,
    colorDecorators: true,
  };

  const initEditor = async () => {
    if (!editorContainer.value) return;

    // Initialize Python language server if needed
    if (props.language === "python") {
      try {
        await pythonLanguageServer.initialize(monaco);
      } catch (error) {
        console.warn("Failed to initialize Python language server:", error);
      }
    }

    editor = monaco.editor.create(editorContainer.value, {
      value: props.modelValue ?? "",
      language: props.language ?? "json",
      theme: props.theme ?? "vs",
      readOnly: props.readOnly ?? false,
      ...defaultOptions,
      ...props.options,
    });

    editor.onDidChangeModelContent(() => {
      const value = editor?.getValue() ?? "";
      emit("update:modelValue", value);
      emit("change", value);
    });

    emit("editor-ready", editor);

    if (props.modelValue) editor.setValue(props.modelValue);
  };

  // watches (unchanged from your version) ...
  watch(
    () => props.modelValue,
    (v) => {
      if (editor && v !== undefined && v !== editor.getValue())
        editor.setValue(v);
    }
  );

  watch(
    () => props.language,
    (lang) => {
      if (editor && lang) {
        const model = editor.getModel();
        if (model) monaco.editor.setModelLanguage(model, lang);
      }
    }
  );

  watch(
    () => props.theme,
    (t) => {
      if (t) monaco.editor.setTheme(t);
    }
  );

  watch(
    () => props.readOnly,
    (ro) => {
      if (editor && ro !== undefined) editor.updateOptions({ readOnly: ro });
    }
  );

  onMounted(async () => {
    await nextTick();
    await initEditor();
  });

  onBeforeUnmount(() => {
    editor?.dispose();
    // Cleanup Python language server
    if (props.language === "python") {
      pythonLanguageServer.dispose();
    }
  });

  // public API
  const getValue = () => editor?.getValue() || "";
  const setValue = (v: string) => editor?.setValue(v);
  const focus = () => editor?.focus();
  const getModel = () => editor?.getModel();
  const updateOptions = (
    opts: monaco.editor.IStandaloneEditorConstructionOptions
  ) => editor?.updateOptions(opts);

  return {
    editorContainer,
    editor,
    getValue,
    setValue,
    focus,
    getModel,
    updateOptions,
  };
}
