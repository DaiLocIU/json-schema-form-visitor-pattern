<script setup lang="ts">
import { computed, inject, ref, defineOptions } from 'vue'
import CompositeRenderer from './CompositeRenderer.vue'
import {
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSwitch,
  ElSelect,
  ElOption,
  ElDatePicker,
  ElTimePicker,
  ElCard,
  ElButton,
  ElText,
  ElTable,
  ElTableColumn,
  ElTag,
  ElPopconfirm,
  ElCollapse,
  ElCollapseItem,
  ElBadge,
  ElDivider,
  ElDropdown,
  ElDropdownMenu,
  ElDropdownItem,
  ElTooltip,
  ElIcon,
  ElDialog,
} from 'element-plus'

defineOptions({ name: 'FieldRenderer' })

const props = withDefaults(defineProps<{
  schema: Record<string, any>,
  path?: (string|number)[],
  modelValue?: any
}>(), { path: () => [] })

const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()

const jsf = inject('jsf') as any
if (!jsf) throw new Error('FieldRenderer requires jsf injection')

const schResolved = computed(() => jsf.resolveSchema(props.schema))
const tmpKey = ref('')
const dynamicCollapsed = ref([])
const editingKey = ref<string | null>(null)
const editKeyValue = ref('')
const expandedRows = ref<string[]>([])

// Auto-collapse when there are more than 3 dynamic properties
const shouldAutoCollapse = computed(() => dynamicKeys.value.length > 3)

// Quick templates for common values
const quickTemplates = computed(() => {
  const type = apResolvedSchema.value?.type
  if (!type) return []
  
  const templates: Array<{ label: string, value: any }> = []
  if (type === 'string') {
    templates.push(
      { label: 'Empty string', value: '' },
      { label: 'Sample text', value: 'sample' },
      { label: 'UUID format', value: '00000000-0000-0000-0000-000000000000' }
    )
  } else if (type === 'number') {
    templates.push(
      { label: 'Zero', value: 0 },
      { label: 'One', value: 1 },
      { label: 'Hundred', value: 100 }
    )
  } else if (type === 'boolean') {
    templates.push(
      { label: 'True', value: true },
      { label: 'False', value: false }
    )
  }
  return templates
})

// Resolved schema for additionalProperties (if object schema provided)
const apResolvedSchema = computed(() => {
  const ap = schResolved.value.additionalProperties
  return ap && typeof ap === 'object' ? jsf.resolveSchema(ap) : undefined
})

// Dynamic (additional) property keys present in current model but not declared in properties
const dynamicKeys = computed(() => {
  const mv = props.modelValue ?? {}
  if (Array.isArray(mv) || mv == null || typeof mv !== 'object') return []
  const fixed = Object.keys(schResolved.value.properties || {})
  return Object.keys(mv).filter(k => !fixed.includes(k))
})

// Declared properties grouped for better layout
const declaredPropsGroups = computed(() => {
  const props = schResolved.value.properties || {}
  const entries = Object.entries(props)
  const groups: Array<Array<[string, any]>> = []
  
  for (let i = 0; i < entries.length; i += 2) {
    groups.push(entries.slice(i, i + 2))
  }
  return groups
})

// Step 1: dynamicRows metadata (key, value, type, complex, preview)
const dynamicRows = computed(() => {
  const mv = (props.modelValue && typeof props.modelValue === 'object' && !Array.isArray(props.modelValue)) ? props.modelValue : {}
  return dynamicKeys.value.map(key => {
    const value = (mv as any)[key]
    // derive type: prefer apResolvedSchema.type if single primitive; else typeof runtime
    let typ: string | undefined = apResolvedSchema.value?.type
    if (!typ) {
      if (Array.isArray(value)) typ = 'array'
      else if (value === null) typ = 'null'
      else typ = typeof value
    }
    const complex = ['object','array'].includes(typ) || !!apResolvedSchema.value?.oneOf || !!apResolvedSchema.value?.anyOf
    let preview = ''
    if (complex) {
      if (Array.isArray(value)) preview = `[${value.length}]`
      else if (value && typeof value === 'object') preview = '{…}'
      else preview = typ || ''
    } else {
      preview = value == null ? '' : String(value)
    }
    return { key, value, type: typ, complex, preview }
  })
})

function setChild(key: string | number, childVal: any) {
  const cur = (props.modelValue == null) ? (schResolved.value.type === 'array' ? [] : {}) : { ...props.modelValue }
  cur[key as any] = childVal
  emit('update:modelValue', cur)
}
function removeAt(index: number) {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  arr.splice(index, 1)
  emit('update:modelValue', arr)
}
function addItem(initVal: any) {
  const arr = Array.isArray(props.modelValue) ? [...props.modelValue] : []
  arr.push(initVal)
  emit('update:modelValue', arr)
}

function addDynamic() {
  if (!schResolved.value.additionalProperties) return
  const key = tmpKey.value.trim()
  if (!key) return
  
  // Check for duplicates
  const existing = Object.keys(props.modelValue || {})
  if (existing.includes(key)) {
    // Could show a toast/message here
    return
  }
  
  let init: any = ''
  if (apResolvedSchema.value) {
    init = jsf.initBySchema(apResolvedSchema.value)
  }
  setChild(key, init)
  tmpKey.value = ''
  
  // Auto-expand if collapsed and user just added first few items
  if (shouldAutoCollapse.value && dynamicCollapsed.value.length === 0) {
    dynamicCollapsed.value = ['dynamic-props']
  }
}

function handleKeyPress(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    addDynamic()
  }
}

function removeDynamic(key: string) {
  const cur = (props.modelValue && typeof props.modelValue === 'object' && !Array.isArray(props.modelValue)) ? { ...props.modelValue } : {}
  if (key in cur) {
    delete cur[key]
    emit('update:modelValue', cur)
  }
}

function updateDynamicValue(key: string, val: any) {
  setChild(key, val)
}

function addQuickTemplate(template: { label: string, value: any }) {
  if (!tmpKey.value.trim()) return
  setChild(tmpKey.value.trim(), template.value)
  tmpKey.value = ''
}

function startEditKey(key: string) {
  editingKey.value = key
  editKeyValue.value = key
}

function cancelEditKey() {
  editingKey.value = null
  editKeyValue.value = ''
}

function saveEditKey() {
  if (!editingKey.value || !editKeyValue.value.trim()) return
  if (editKeyValue.value === editingKey.value) {
    cancelEditKey()
    return
  }
  
  // Check for duplicates
  const existing = Object.keys(props.modelValue || {})
  if (existing.includes(editKeyValue.value.trim())) {
    // Could show error toast
    return
  }
  
  // Move value to new key
  const currentValue = (props.modelValue as any)?.[editingKey.value]
  removeDynamic(editingKey.value)
  setChild(editKeyValue.value.trim(), currentValue)
  
  cancelEditKey()
}

function toggleRowExpansion(key: string) {
  const index = expandedRows.value.indexOf(key)
  if (index > -1) {
    expandedRows.value.splice(index, 1)
  } else {
    expandedRows.value.push(key)
  }
}
</script>

<template>
  <!-- Composite (oneOf/anyOf) -->
  <CompositeRenderer
    v-if="schResolved.oneOf || schResolved.anyOf"
    :schema="schResolved"
    :path="path"
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
  />

  <!-- string / enum -->
  <ElFormItem v-else-if="schResolved.type === 'string' || Array.isArray(schResolved.enum)">
    <template #label>
      <div class="lbl-row">
        <span class="lbl-text">{{ schResolved.title ?? (path[path.length-1] ?? 'string') }}</span>
      </div>
    </template>
    <template #default>
      <ElSelect
        v-if="Array.isArray(schResolved.enum)"
        :model-value="modelValue"
        filterable
        clearable
        class="inp"
        placeholder="Select or enter value"
        @change="$emit('update:modelValue', $event)"
      >
        <ElOption v-for="(o,i) in schResolved.enum" :key="i" :label="String(o)" :value="o" />
      </ElSelect>

      <ElTimePicker
        v-else-if="schResolved.format === 'time'"
        :model-value="modelValue"
        class="inp"
        @change="$emit('update:modelValue', $event)"
      />

      <ElDatePicker
        v-else-if="['date','date-time'].includes(schResolved.format)"
        :type="schResolved.format === 'date' ? 'date' : 'datetime'"
        :model-value="modelValue"
        class="inp"
        @change="$emit('update:modelValue', $event)"
      />

      <ElInput
        v-else
        :model-value="modelValue"
        clearable
        class="inp"
        placeholder="Enter string value"
        @input="$emit('update:modelValue', $event)"
      />
    </template>
  </ElFormItem>

  <!-- number / integer -->
  <ElFormItem v-else-if="schResolved.type === 'number' || schResolved.type === 'integer'">
    <template #label>
      <div class="lbl-row">
        <span class="lbl-text">{{ schResolved.title ?? (path[path.length-1] ?? schResolved.type) }}</span>
      </div>
    </template>
    <template #default>
      <ElInputNumber
        :model-value="modelValue"
        :step="schResolved.multipleOf ?? (schResolved.type === 'integer' ? 1 : 1)"
        :min="schResolved.minimum"
        :max="schResolved.maximum"
        class="inp"
        @change="$emit('update:modelValue', $event)"
      />
    </template>
  </ElFormItem>

  <!-- boolean -->
  <ElFormItem v-else-if="schResolved.type === 'boolean'">
    <template #label>
      <div class="lbl-row">
        <span class="lbl-text">{{ schResolved.title ?? (path[path.length-1] ?? 'boolean') }}</span>
      </div>
    </template>
    <template #default>
      <div class="switch-row">
        <ElSwitch :model-value="modelValue" @change="$emit('update:modelValue', $event)" />
      </div>
    </template>
  </ElFormItem>

  <!-- object -->
  <div v-else-if="schResolved.type === 'object' || schResolved.properties" class="group">
    <ElCard shadow="never" class="card-prop">
      <template #header v-if="schResolved.title">
        <div class="group-title">{{ schResolved.title }}</div>
      </template>
      <template #default>
        <!-- Declared properties in responsive grid -->
        <div v-if="Object.keys(schResolved.properties || {}).length" class="declared-props">
          <div class="props-grid">
            <div v-for="(childSchema, key) in schResolved.properties || {}" :key="key" class="prop-item">
              <FieldRenderer
                :schema="childSchema"
                :path="[...path, key]"
                :model-value="(modelValue ?? {})[key]"
                @update:model-value="v => setChild(key, v)"
              />
            </div>
          </div>
        </div>

        <!-- Add dynamic property -->
        <div v-if="schResolved.additionalProperties" class="ap-section">
          <ElDivider content-position="left">
            <span class="section-title">Additional Properties</span>
            <ElBadge v-if="dynamicKeys.length" :value="dynamicKeys.length" class="badge-count" />
          </ElDivider>
          
          <div class="ap-controls">
            <ElInput 
              v-model="tmpKey" 
              placeholder="Enter property key" 
              clearable 
              class="key-input"
              @keypress="handleKeyPress"
              :class="{ 'duplicate-key': tmpKey && Object.keys(props.modelValue || {}).includes(tmpKey.trim()) }"
            />
            <ElButton 
              type="primary" 
              @click="addDynamic"
              :disabled="!tmpKey.trim() || Object.keys(props.modelValue || {}).includes(tmpKey.trim())"
            >
              Add
            </ElButton>
            
            <!-- Quick templates dropdown -->
            <ElDropdown v-if="quickTemplates.length && tmpKey.trim()" trigger="click">
              <ElButton type="info" plain size="small">
                Templates <ElIcon class="el-icon--right"><ArrowDown /></ElIcon>
              </ElButton>
              <template #dropdown>
                <ElDropdownMenu>
                  <ElDropdownItem 
                    v-for="template in quickTemplates" 
                    :key="template.label"
                    @click="addQuickTemplate(template)"
                  >
                    {{ template.label }}
                  </ElDropdownItem>
                </ElDropdownMenu>
              </template>
            </ElDropdown>
          </div>
          
          <div v-if="tmpKey && Object.keys(props.modelValue || {}).includes(tmpKey.trim())" class="duplicate-warning">
            <ElIcon><WarningFilled /></ElIcon> Key already exists
          </div>
        </div>

        <!-- Dynamic properties collapsible section -->
        <div v-if="schResolved.additionalProperties" class="dynamic-section">
          <!-- Only show table and expansion when there are dynamic keys -->
          <template v-if="dynamicKeys.length > 0">
            <ElTable
              :data="dynamicRows"
              border
              size="small"
              class="dyn-table"
              row-key="key"
              empty-text="No additional properties added yet"
            >
            <ElTableColumn label="Key" min-width="120">
              <template #default="{ row }">
                <div v-if="editingKey === row.key" class="key-editor">
                  <ElInput 
                    v-model="editKeyValue" 
                    size="small" 
                    @keyup.enter="saveEditKey"
                    @keyup.escape="cancelEditKey"
                    @blur="saveEditKey"
                  />
                </div>
                <div v-else class="key-display" @dblclick="startEditKey(row.key)">
                  <span>{{ row.key }}</span>
                  <ElTooltip content="Double-click to edit">
                    <ElIcon class="edit-hint"><Edit /></ElIcon>
                  </ElTooltip>
                </div>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="Type" width="90">
              <template #default="{ row }">
                <ElTag size="small" :type="row.complex ? 'warning' : 'info'">{{ row.type }}</ElTag>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="Value" min-width="200">
              <template #default="{ row }">
                <div v-if="!row.complex" class="inline-editor">
                  <ElSwitch
                    v-if="row.type === 'boolean'"
                    :model-value="row.value"
                    @change="v => updateDynamicValue(row.key, v)"
                  />
                  <ElInputNumber
                    v-else-if="row.type === 'number' || row.type === 'integer'"
                    :model-value="row.value"
                    @change="v => updateDynamicValue(row.key, v)"
                    class="w100"
                    size="small"
                  />
                  <ElInput
                    v-else
                    :model-value="row.value"
                    clearable
                    class="w100"
                    size="small"
                    @input="v => updateDynamicValue(row.key, v)"
                  />
                </div>
                <div v-else class="value-preview">
                  {{ row.preview }} 
                  <ElButton 
                    type="primary" 
                    link 
                    size="small" 
                    @click="toggleRowExpansion(row.key)"
                  >
                    {{ expandedRows.includes(row.key) ? 'Collapse' : 'Expand' }}
                  </ElButton>
                </div>
              </template>
            </ElTableColumn>
            
            <ElTableColumn label="Actions" width="80" align="center">
              <template #default="{ row }">
                <ElPopconfirm title="Remove this property?" @confirm="() => removeDynamic(row.key)">
                  <template #reference>
                    <ElButton link type="danger" size="small">
                      <ElIcon><Delete /></ElIcon>
                    </ElButton>
                  </template>
                </ElPopconfirm>
              </template>
            </ElTableColumn>
          </ElTable>

          <!-- Inline expansion content for complex properties -->
          <div v-for="expandedKey in expandedRows" :key="`expanded-${expandedKey}`" class="expanded-property">
            <div class="expanded-header">
              <h4>{{ expandedKey }}</h4>
              <ElButton 
                type="primary" 
                text 
                size="small" 
                @click="toggleRowExpansion(expandedKey)"
              >
                <ElIcon><ArrowUp /></ElIcon>
                Collapse
              </ElButton>
            </div>
            <div class="expanded-content">
              <FieldRenderer
                :schema="apResolvedSchema || {}"
                :path="[...path, expandedKey]"
                :model-value="(props.modelValue as any)?.[expandedKey]"
                @update:model-value="v => updateDynamicValue(expandedKey, v)"
              />
            </div>
          </div>
          </template>
        </div>
      </template>
    </ElCard>
  </div>

  <!-- array -->
  <div v-else-if="schResolved.type === 'array' || schResolved.items" class="array">
    <ElCard v-for="(item, i) in (Array.isArray(modelValue) ? modelValue : [])" :key="i" class="card-item" shadow="never">
      <template #default>
        <div class="prop-head">
          <ElText>Item {{ i + 1 }}</ElText>
          <ElButton link type="danger" @click="() => removeAt(i)">Remove</ElButton>
        </div>
        <FieldRenderer
          :schema="schResolved.items"
          :path="[...path, i]"
          :model-value="modelValue ? modelValue[i] : undefined"
          @update:model-value="v => { const arr = Array.isArray(modelValue) ? [...modelValue] : []; arr[i] = v; emit('update:modelValue', arr) }"
        />
      </template>
    </ElCard>

    <ElButton type="primary" @click="() => addItem(jsf.initBySchema(schResolved.items))">Add item</ElButton>
  </div>

  <!-- null / unknown -->
  <ElFormItem v-else>
    <template #label>
      <div class="lbl-row">
        <span class="lbl-text">{{ schResolved.title ?? (path[path.length-1] ?? 'value') }}</span>
      </div>
    </template>
    <template #default>
      <ElInput model-value="" disabled />
    </template>
  </ElFormItem>
</template>

<style scoped>
.lbl-row { display:inline-flex; align-items:center; gap:8px; }
.lbl-text { font-weight:600; }
.group { margin:12px 0; }
.ap-row { display:flex; gap:8px; margin-top:8px; }
.switch-row { display:inline-flex; gap:10px; align-items:center; }
.prop-head { display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; }
.card-item { margin-bottom:12px; }

/* Compact card body padding */
:deep(.el-card__body) { padding: 8px 12px; }
/* Header already tight; ensure no extra bottom margin */
:deep(.el-card__header) { padding: 8px 12px; }
/* Dynamic properties table tweaks */
.dyn-table :deep(.el-table__cell) { padding: 4px 8px; }
.inline-editor .w100 { width: 100%; }
.value-preview { font-size: 12px; color: #666; }
.value-preview .hint { color:#999; font-style: italic; }

/* New UX improvements */
.ap-section { margin: 16px 0; }
.section-title { font-weight: 600; color: #606266; }
.badge-count { margin-left: 8px; }
.ap-controls { 
  display: flex; 
  gap: 8px; 
  margin-bottom: 8px; 
  align-items: flex-start;
}
.key-input { flex: 1; }
.duplicate-key { border-color: #f56c6c !important; }
.duplicate-warning { 
  color: #f56c6c; 
  font-size: 12px; 
  margin-top: 4px;
  display: flex;
  align-items: center;
  gap: 4px;
}
.dynamic-collapse { margin-top: 12px; }
.dynamic-section { margin-top: 16px; }
.collapse-header { 
  display: flex; 
  align-items: center; 
  gap: 8px; 
  font-weight: 500;
}
.inline-badge :deep(.el-badge__content) { 
  background: #909399; 
}
.search-row { 
  margin-bottom: 12px;
  display: flex;
  gap: 8px;
  align-items: center;
}
.search-input { max-width: 300px; }
.expand-wrapper { 
  padding: 12px; 
  background: #fafafa; 
  border-radius: 4px;
}
.expand-wrapper.--empty { 
  color: #909399; 
  font-style: italic; 
  text-align: center;
}

/* Additional improvements */
.declared-props { 
  margin-bottom: 16px; 
}
.props-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px 24px;
}
.prop-item {
  min-width: 0; /* Prevent grid overflow */
}
.key-editor {
  width: 100%;
}
.key-display {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  transition: background-color 0.2s;
}
.key-display:hover {
  background-color: #f5f7fa;
}
.edit-hint {
  opacity: 0;
  transition: opacity 0.2s;
  font-size: 12px;
  color: #909399;
}
.key-display:hover .edit-hint {
  opacity: 1;
}
.expand-hint {
  margin-left: 4px;
  opacity: 0.7;
}
.dialog-content {
  min-height: 200px;
  padding: 16px 0;
}
.dialog-content--fullscreen {
  min-height: 60vh;
  max-height: 70vh;
  overflow-y: auto;
  padding: 24px 0;
}
.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}
.dialog-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.form-wrapper {
  max-width: 100%;
}
/* Inline expansion for complex properties */
.expanded-property {
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  margin-top: 12px;
  padding: 16px;
  background-color: var(--el-fill-color-lighter);
}

.expanded-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.expanded-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.expanded-content {
  padding-left: 12px;
  border-left: 3px solid var(--el-color-primary);
}

/* Dialog specific responsive grid */
.edit-dialog .props-grid {
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 20px 32px;
}
.edit-dialog.is-fullscreen .props-grid {
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px 40px;
}
</style>
