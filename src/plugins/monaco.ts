// monaco.ts (or inside your composable module, top-level)
import * as monaco from "monaco-editor";
// IMPORTANT: import workers via Vite’s ?worker query
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker";
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker";
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker";
import TsWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";

// Only run in browser
if (typeof window !== "undefined") {
  // Attach workers for each language label
  (self as any).MonacoEnvironment = {
    getWorker(_: string, label: string) {
      switch (label) {
        case "json":
          return new JsonWorker();
        case "css":
        case "scss":
        case "less":
          return new CssWorker();
        case "html":
        case "handlebars":
        case "razor":
          return new HtmlWorker();
        case "typescript":
        case "javascript":
          return new TsWorker();
        case "python":
          // For Python, we'll use the default editor worker
          // Language server will be handled by monaco-languageclient
          return new EditorWorker();
        default:
          return new EditorWorker();
      }
    },
  };
}

export { monaco };
