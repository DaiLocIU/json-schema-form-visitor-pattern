import type * as monaco from "monaco-editor";

// Model - Data structure
export interface MonacoEditorModel {
  value: string;
  language: string;
  theme: string;
  readOnly: boolean;
  height: string;
  options: monaco.editor.IStandaloneEditorConstructionOptions;
}

// ViewModel - Business logic interface
export interface MonacoEditorViewModel {
  editorContainer: HTMLDivElement | undefined;
  editor: monaco.editor.IStandaloneCodeEditor | null;
  getValue(): string;
  setValue(value: string): void;
  focus(): void;
  getModel(): monaco.editor.ITextModel | null;
  updateOptions(options: monaco.editor.IEditorOptions): void;
}

// Props interface
export interface MonacoEditorProps {
  modelValue?: string;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  height?: string;
  options?: monaco.editor.IStandaloneEditorConstructionOptions;
}

// Events interface
export interface MonacoEditorEmits {
  (e: "update:modelValue", value: string): void;
  (e: "change", value: string): void;
  (e: "editor-ready", editor: monaco.editor.IStandaloneCodeEditor): void;
}

// Editor configuration
export interface EditorConfig {
  automaticLayout: boolean;
  minimap: { enabled: boolean };
  scrollBeyondLastLine: boolean;
  fontSize: number;
  lineNumbers: string;
  roundedSelection: boolean;
  scrollbar: {
    vertical: string;
    horizontal: string;
  };
  selectOnLineNumbers: boolean;
  wordWrap: string;
}
