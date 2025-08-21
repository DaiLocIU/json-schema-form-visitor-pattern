<script setup lang="ts">
import 'jsoneditor/dist/jsoneditor.css'

import JSONEditor from 'jsoneditor'
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
defineOptions({ name: 'JsonEditorWidget' })

type JSONEditorMode = 'tree' | 'view' | 'form' | 'code' | 'text'

const props = defineProps({
  modelValue: { type: [Object, Array], required: true },
  mode: { type: String as () => JSONEditorMode, default: 'tree' },
  disabled: { type: Boolean, default: false }, // modes: tree, view, code, text, form
  schema: { type: Object, default: null }, // JSON schema for validation
  schemaRefs: { type: Object, default: null }, // Schema references for $ref resolution
  requireObjectType: { type: Boolean, default: false } // Custom validation to require type: "object"
})
const emit = defineEmits(['update:modelValue', 'validation-error'])

const container = ref(null)
let editorInstance: any = null

// Store validation errors for display
const validationErrors = ref<Array<{path: string[], message: string}>>([])
const hasValidated = ref(false)

// Clear validation errors display
const clearValidationErrors = () => {
  validationErrors.value = []
}

// Custom validation function to check for type: "object"
const validateObjectType = (data: any): Array<{path: string[], message: string}> => {
  console.log('Validating JSONEditor object type:', data)
  const errors: Array<{path: string[], message: string}> = []
  
  if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
    // Check if type property exists
    if (!('type' in data)) {
      errors.push({
        path: ['type'],
        message: 'Missing required property "type"'
      })
    } else if (data.type !== 'object') {
      errors.push({
        path: ['type'],
        message: 'Property "type" must be "object"'
      })
    }
  } else {
    errors.push({
      path: [],
      message: 'Root value must be an object'
    })
  }

  console.log('Validation errors:', errors)
  
  return errors
}

// Expose validation function
const validate = async () => {
  hasValidated.value = true
  const allErrors: any[] = []
  
  // Get current data from editor
  let currentData: any = null
  try {
    if (editorInstance) {
      currentData = editorInstance.get()
    }
  } catch {
    allErrors.push({
      path: [],
      message: 'Invalid JSON syntax'
    })
    validationErrors.value = allErrors
    emit('validation-error', allErrors)
    return false
  }
  
  // Custom type validation (only if enabled)
  if (props.requireObjectType) {
    const typeErrors = validateObjectType(currentData)
    console.log('Custom type validation errors:', typeErrors)
    allErrors.push(...typeErrors)
  }
  console.log('Current data for validation:', currentData)
  // JSONEditor schema validation
  if (editorInstance && editorInstance.validate) {
    const schemaErrors = await editorInstance.validate()
    allErrors.push(...schemaErrors)
  }
  

  // Store errors for display
  validationErrors.value = allErrors
  
  if (allErrors.length > 0) {
    emit('validation-error', allErrors)
    return false
  }
  
  // Clear errors if validation passes
  clearValidationErrors()
  return true
}

// Expose the validate function to parent components
defineExpose({
  validate,
  clearValidationErrors,
  getEditor: () => editorInstance
})

onMounted(() => {
  if (container.value) {
    // Prepare editor options
    const editorOptions: any = {
      mode: props.mode,
      onChange: () => {
        try {
          if (editorInstance) {
            const updated = editorInstance.get()
            emit('update:modelValue', updated)
            
            // Auto-validate on change if schema is provided or object type validation is required
            if (props.schema || props.requireObjectType) {
              validate()
            }
          }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // silently ignore parse errors
        }
      },
      onEditable: () => {
        if (props.disabled) {
          // In modes code and text, node is empty: no path, field, or value
          // returning false makes the text area read-only
          return false;
        }
        return true;
      },
    }

    // Add schema validation if schema is provided
    if (props.schema) {
      editorOptions.schema = props.schema
      if (props.schemaRefs) {
        editorOptions.schemaRefs = props.schemaRefs
      }
    }

    editorInstance = new JSONEditor(container.value as HTMLElement, editorOptions)

    if (editorInstance) {
      editorInstance.set(props.modelValue)
    }
  }
})

onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.destroy()
    editorInstance = null
  }
})

watch(() => props.modelValue, (newVal) => {
  if (editorInstance) {
    const current = editorInstance.get()
    if (JSON.stringify(current) !== JSON.stringify(newVal)) {
      editorInstance.set(newVal)
    }
  }
})

// Watch for schema changes
watch(() => props.schema, () => {
  // Recreate editor when schema changes
  if (editorInstance && container.value) {
    const currentValue = editorInstance.get()
    editorInstance.destroy()
    
    const editorOptions: any = {
      mode: props.mode,
      onChange: () => {
        try {
          if (editorInstance) {
            const updated = editorInstance.get()
            emit('update:modelValue', updated)
            
            // Auto-validate on change if schema is provided or object type validation is required
            if (props.schema || props.requireObjectType) {
              console.log('Validating JSONEditor after schema change')
              validate()
            }
          }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (e) {
          // silently ignore parse errors
        }
      },
      onEditable: () => {
        if (props.disabled) {
          return false;
        }
        return true;
      },
    }

    if (props.schema) {
      editorOptions.schema = props.schema
      if (props.schemaRefs) {
        editorOptions.schemaRefs = props.schemaRefs
      }
    }

    editorInstance = new JSONEditor(container.value as HTMLElement, editorOptions)
    editorInstance.set(currentValue)
  }
})
</script>

<template>
  <div class="jsoneditor-wrapper">
    <div ref="container" class="jsoneditor-container" style="height: 400px;">
    </div>
    
    <!-- Validation Errors Display -->
    <div v-if="validationErrors.length > 0" class="validation-errors">
      <div class="validation-header">
        <span class="error-icon">⚠️</span>
        <span class="error-title">Validation Errors ({{ validationErrors.length }})</span>
      </div>
      <ul class="error-list">
        <li v-for="(error, index) in validationErrors" :key="index" class="error-item">
          <span class="error-path" v-if="error.path && error.path.length > 0">
            {{ error.path.join('.') }}:
          </span>
          <span class="error-message">{{ error.message }}</span>
        </li>
      </ul>
    </div>

  </div>
</template>
<style lang="scss" scoped>
.jsoneditor-wrapper {
  position: relative;
}

.jsoneditor-container {
  position: relative;
}

.validation-success {
  margin-top: 8px;
  padding: 12px 16px;
  border: 1px solid #48bb78;
  border-radius: 6px;
  background-color: #c6f6d5;
  color: #2f855a;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.success-icon {
  font-size: 16px;
}

.success-message {
  font-weight: 600;
}

.validation-errors {
  margin-top: 8px;
  border: 1px solid #f56565;
  border-radius: 6px;
  background-color: #fed7d7;
  color: #c53030;
  font-size: 14px;
  max-height: 200px;
  overflow-y: auto;
}

.validation-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid #fc8181;
  background-color: #feb2b2;
  font-weight: 600;
}

.error-icon {
  font-size: 16px;
}

.error-title {
  font-weight: 600;
}

.error-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.error-item {
  padding: 8px 16px;
  border-bottom: 1px solid #fc8181;
  
  &:last-child {
    border-bottom: none;
  }
}

.error-path {
  font-weight: 600;
  margin-right: 8px;
  color: #9b2c2c;
}

.error-message {
  color: #c53030;
}

:deep(.jsoneditor-poweredBy) {
  display: none;
}
:deep(.jsoneditor-outer) {
  height: 400px;
}

/* Custom bold styling for non-default JSON schema values */
:deep(.jsoneditor-is-not-default) {
  font-weight: bold;
}

/* Schema validation error styling */
:deep(.jsoneditor-validation-error) {
  border-left: 3px solid #f56565;
  background-color: rgba(245, 101, 101, 0.1);
}

/* Schema validation warning styling */
:deep(.jsoneditor-validation-warning) {
  border-left: 3px solid #ed8936;
  background-color: rgba(237, 137, 54, 0.1);
}
</style>