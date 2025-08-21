// Python Language Server configuration using custom suggestions
export class PythonLanguageServer {
  private isInitialized = false;

  async initialize(monaco: any) {
    if (this.isInitialized) return;

    try {
      // Register Python language if not already registered
      if (
        !monaco.languages
          .getLanguages()
          .find((lang: any) => lang.id === "python")
      ) {
        monaco.languages.register({ id: "python" });
      }

      // Register completion provider for Python
      monaco.languages.registerCompletionItemProvider("python", {
        provideCompletionItems: (model: any, position: any) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions = [
            // Keywords
            ...[
              "False",
              "None",
              "True",
              "and",
              "as",
              "assert",
              "async",
              "await",
              "break",
              "class",
              "continue",
              "def",
              "del",
              "elif",
              "else",
              "except",
              "finally",
              "for",
              "from",
              "global",
              "if",
              "import",
              "in",
              "is",
              "lambda",
              "nonlocal",
              "not",
              "or",
              "pass",
              "raise",
              "return",
              "try",
              "while",
              "with",
              "yield",
            ].map((keyword) => ({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range,
              detail: "Python keyword",
            })),
            // Built-in functions
            ...[
              "print",
              "len",
              "range",
              "list",
              "dict",
              "set",
              "tuple",
              "str",
              "int",
              "float",
              "bool",
              "type",
              "isinstance",
              "hasattr",
              "getattr",
              "setattr",
              "dir",
              "help",
              "open",
              "enumerate",
              "zip",
              "map",
              "filter",
              "sorted",
              "reversed",
              "sum",
              "min",
              "max",
              "abs",
            ].map((func) => ({
              label: func,
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: func,
              range,
              detail: "Python built-in function",
            })),
            // Common modules
            ...[
              "os",
              "sys",
              "json",
              "datetime",
              "time",
              "random",
              "math",
              "re",
              "collections",
              "itertools",
              "functools",
              "pathlib",
              "requests",
              "numpy",
              "pandas",
              "matplotlib",
              "seaborn",
              "scipy",
              "sklearn",
            ].map((module) => ({
              label: module,
              kind: monaco.languages.CompletionItemKind.Module,
              insertText: module,
              range,
              detail: "Python module",
            })),
          ];

          return { suggestions };
        },
      });

      this.isInitialized = true;
      console.log("Python Language Server initialized with custom suggestions");
    } catch (error) {
      console.error("Failed to initialize Python Language Server:", error);
    }
  }

  dispose() {
    this.isInitialized = false;
  }
}

// Export singleton instance
export const pythonLanguageServer = new PythonLanguageServer();
