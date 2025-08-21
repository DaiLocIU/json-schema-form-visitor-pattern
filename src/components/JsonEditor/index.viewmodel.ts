import { computed, nextTick, ref, watch } from 'vue';

export interface JsonEditorProps {
  modelValue: string;
  rows?: number;
  placeholder?: string;
  showControls?: boolean;
}

export const useJsonEditor = (
  props: JsonEditorProps,
  emit: (event: 'update:modelValue' | 'error' | 'valid', value: string | boolean) => void
) => {
  // JSON editor ref
  const jsonEditorRef = ref();
  
  // Local JSON value state
  const jsonValue = ref(props.modelValue || '');
  const jsonError = ref('');
  
  // Watch for external changes to modelValue
  watch(() => props.modelValue, (newValue) => {
    if (newValue !== jsonValue.value) {
      jsonValue.value = newValue || '';
    }
  });

  // Watch for local changes and emit to parent
  watch(jsonValue, (newValue) => {
    emit('update:modelValue', newValue);
  });

  // Handle JSON input changes
  const handleJsonChange = (value: any) => {
    console.log('JSONEditor input changedddd:', value);
    jsonValue.value = value;
    validateJsonOnly();
  };

  // Format JSON with cursor position preservation
  const formatJson = () => {
    try {
      const parsed = JSON.parse(jsonValue.value);
      
      // Get current cursor position from textarea element
      let cursorPosition = 0;
      let textareaElement: HTMLTextAreaElement | null = null;
      
      if (jsonEditorRef.value && jsonEditorRef.value.$el) {
        textareaElement = jsonEditorRef.value.$el.querySelector('.el-textarea__inner') as HTMLTextAreaElement;
        if (textareaElement) {
          cursorPosition = textareaElement.selectionStart || 0;
        }
      }
      
      // Format the JSON
      const formattedJson = JSON.stringify(parsed, null, 2);
      jsonValue.value = formattedJson;
      jsonError.value = '';
      emit('valid', true);
      
      // Restore cursor position after Vue has updated the DOM
      nextTick(() => {
        if (textareaElement) {
          // Ensure cursor position doesn't exceed the new content length
          const newPosition = Math.min(cursorPosition, formattedJson.length);
          textareaElement.setSelectionRange(newPosition, newPosition);
          textareaElement.focus();
        }
      });
    } catch (error) {
      const errorMessage = `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
      jsonError.value = errorMessage;
      emit('error', errorMessage);
      emit('valid', false);
    }
  };

  // Validate JSON without formatting
  const validateJson = () => {
    try {
      JSON.parse(jsonValue.value);
      jsonError.value = '';
      emit('valid', true);
    } catch (error) {
      const errorMessage = `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
      jsonError.value = errorMessage;
      emit('error', errorMessage);
      emit('valid', false);
    }
  };

  // Internal validation for real-time feedback
  const validateJsonOnly = () => {
    try {
      JSON.parse(jsonValue.value);
      jsonError.value = '';
      emit('valid', true);
    } catch (error) {
      const errorMessage = `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown error'}`;
      jsonError.value = errorMessage;
      emit('error', errorMessage);
      emit('valid', false);
    }
  };

  // JSON syntax highlighting function
  const getHighlightedJson = () => {
    const json = jsonValue.value;
    if (!json) return '';

    try {
      // Try to parse to check if valid
      JSON.parse(json);
      
      // If valid, apply syntax highlighting
      return json
        .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
          let cls = 'json-number';
          if (/^"/.test(match)) {
            if (/:$/.test(match)) {
              cls = 'json-key';
            } else {
              cls = 'json-string';
            }
          } else if (/true|false/.test(match)) {
            cls = 'json-boolean';
          } else if (/null/.test(match)) {
            cls = 'json-null';
          }
          return `<span class="${cls}">${match}</span>`;
        })
        .replace(/([{}])/g, '<span class="json-brace">$1</span>')
        .replace(/(\[|\])/g, '<span class="json-bracket">$1</span>')
        .replace(/,/g, '<span class="json-comma">,</span>');
    } catch (error) {
      // If invalid JSON, highlight everything in red
      return `<span class="json-error-text">${json}</span>`;
    }
  };

  return {
    jsonValue,
    jsonError,
    jsonEditorRef,
    handleJsonChange,
    formatJson,
    validateJson,
    getHighlightedJson,
  };
};
