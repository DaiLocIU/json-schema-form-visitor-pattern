<template>
  <el-form ref="formRef" :model="state.value" :rules="formRules" label-position="top" class="jsf-form">
    <FieldRenderer :schema="props.schema" :model-value="state.value" @update:model-value="v => state.value = v" />
  </el-form>
</template>

<script setup lang="ts">
import { computed, reactive, watch, onMounted, provide, h, ref } from 'vue'
import FieldRenderer from './components/FieldRenderer.vue'
import CompositeRenderer from './components/CompositeRenderer.vue'
import {
  ElForm,
  ElFormItem,
  ElInput,
  ElInputNumber,
  ElSelect,
  ElOption,
  ElSwitch,
  ElButton,
  ElCard,
  ElDivider,
  ElText,
  ElDatePicker,
  ElTag,
} from "element-plus";

type JSONSchema = Record<string, any>;

/* =========================
 *  Props / Emits
 * ========================= */
const props = withDefaults(
  defineProps<{
    schema: JSONSchema;
    modelValue?: any;
    rootSchema?: JSONSchema;
  }>(),
  {
    modelValue: undefined,
    rootSchema: undefined,
  }
);

const emit = defineEmits<{
  (e: "update:modelValue", v: any): void;
  (e: "change", v: any): void;
}>();

/* =========================
 *  State
 * ========================= */
const state = reactive<{ value: any }>({ value: props.modelValue });
const formRef = ref()

// Dynamic validation rules that update based on current form data
const formRules = computed(() => {
  const rules: Record<string, any[]> = {}
  
  function generateRulesForPath(schema: any, data: any, currentPath: string = '') {
    if (!schema || typeof schema !== 'object') return
    
    const resolvedSchema = resolveSchema(schema)
    
    // Handle composite schemas (anyOf, oneOf)
    if (resolvedSchema.anyOf || resolvedSchema.oneOf) {
      const branches = resolvedSchema.anyOf || resolvedSchema.oneOf
      
      // Find the active branch based on current data
      let activeBranch = null
      for (const branch of branches) {
        const resolvedBranch = resolveSchema(branch)
        if (matchesSchema(data, resolvedBranch)) {
          activeBranch = resolvedBranch
          break
        }
      }
      
      // If we found an active branch, use it for validation
      if (activeBranch) {
        generateRulesForPath(activeBranch, data, currentPath)
        return
      }
    }
    
    // Handle arrays
    if (resolvedSchema.type === 'array' && Array.isArray(data) && resolvedSchema.items) {
      data.forEach((item: any, index: number) => {
        const itemPath = currentPath ? `${currentPath}.${index}` : String(index)
        generateRulesForPath(resolvedSchema.items, item, itemPath)
      })
    }
    
    // Handle objects
    if (resolvedSchema.type === 'object') {
      // Handle defined properties
      if (resolvedSchema.properties) {
        Object.entries(resolvedSchema.properties).forEach(([key, propSchema]: [string, any]) => {
          const fieldPath = currentPath ? `${currentPath}.${key}` : key
          const resolvedPropSchema = resolveSchema(propSchema)
          
          // Handle composite schemas for properties
          let actualPropSchema = resolvedPropSchema
          if (resolvedPropSchema.anyOf || resolvedPropSchema.oneOf) {
            const branches = resolvedPropSchema.anyOf || resolvedPropSchema.oneOf
            const propertyData = data && typeof data === 'object' ? data[key] : undefined
            
            // Find the active branch for this property
            for (const branch of branches) {
              const resolvedBranch = resolveSchema(branch)
              if (matchesSchema(propertyData, resolvedBranch)) {
                actualPropSchema = resolvedBranch
                break
              }
            }
          }
          
          const fieldRules: any[] = []
          
          // Required validation
          if (Array.isArray(resolvedSchema.required) && resolvedSchema.required.includes(key)) {
            fieldRules.push({
              required: true,
              message: `${actualPropSchema.title || key} is required`,
              trigger: ['blur', 'change']
            })
          }
          
          // Type validation
          if (actualPropSchema.type) {
            fieldRules.push({
              validator: (rule: any, value: any, callback: Function) => {
                // Skip validation for empty non-required fields
                if ((value === undefined || value === null || value === '') && 
                    !fieldRules.some(r => r.required)) {
                  callback()
                  return
                }
                
                const actualType = Array.isArray(value) ? 'array' : typeof value
                
                // String validation
                if (actualPropSchema.type === 'string' && actualType !== 'string') {
                  callback(new Error(`Expected string, got ${actualType}`))
                  return
                }
                
                // Number validation
                if (actualPropSchema.type === 'number' && actualType !== 'number') {
                  callback(new Error(`Expected number, got ${actualType}`))
                  return
                }
                
                // Integer validation
                if (actualPropSchema.type === 'integer') {
                  if (actualType !== 'number' || !Number.isInteger(value)) {
                    callback(new Error(`Expected integer, got ${actualType}`))
                    return
                  }
                }
                
                // Boolean validation
                if (actualPropSchema.type === 'boolean' && actualType !== 'boolean') {
                  callback(new Error(`Expected boolean, got ${actualType}`))
                  return
                }
                
                // Enum validation
                if (Array.isArray(actualPropSchema.enum) && !actualPropSchema.enum.includes(value)) {
                  callback(new Error(`Value must be one of: ${actualPropSchema.enum.join(', ')}`))
                  return
                }
                
                callback()
              },
              trigger: ['blur', 'change']
            })
          }
          
          if (fieldRules.length > 0) {
            rules[fieldPath] = fieldRules
          }
          
          // Recursively handle nested data using the resolved property schema
          if (data && typeof data === 'object' && data[key] !== undefined) {
            generateRulesForPath(actualPropSchema, data[key], fieldPath)
          }
        })
      }
      
      // Handle additionalProperties - for dynamic keys like "123456" in your case
      if (resolvedSchema.additionalProperties && data && typeof data === 'object') {
        Object.entries(data).forEach(([key, value]: [string, any]) => {
          // Skip properties that are already handled by defined properties
          if (resolvedSchema.properties && key in resolvedSchema.properties) {
            return
          }
          
          const fieldPath = currentPath ? `${currentPath}.${key}` : key
          const additionalPropSchema = resolveSchema(resolvedSchema.additionalProperties)
          
          // Generate rules for the additional property value
          generateRulesForPath(additionalPropSchema, value, fieldPath)
        })
      }
    }
  }
  
  // Helper function to check if data matches a schema
  function matchesSchema(data: any, schema: any): boolean {
    if (!schema || typeof schema !== 'object') return false
    
    // Null type check
    if (schema.type === 'null') {
      return data === null || data === undefined
    }
    
    // Type checks
    if (schema.type) {
      const actualType = data === null ? 'null' : Array.isArray(data) ? 'array' : typeof data
      
      if (Array.isArray(schema.type)) {
        if (!schema.type.includes(actualType)) return false
      } else {
        if (schema.type !== actualType) return false
      }
    }
    
    // Object with additionalProperties check
    if (schema.type === 'object' && schema.additionalProperties && typeof data === 'object' && data !== null) {
      return true
    }
    
    return true
  }
  
  generateRulesForPath(props.schema, state.value)
  
  // Debug: log the generated rules to understand what's happening
  console.log('Generated validation rules:', rules)
  console.log('Current form data:', state.value)
  
  return rules
})

watch(
  () => props.modelValue,
  (v) => {
    state.value = v;
  },
  { immediate: true }
);
watch(
  () => state.value,
  (v) => {
    emit("update:modelValue", v);
    emit("change", v);
  }
);

/* If we want to have default for root, do after mount (not during render) */
onMounted(() => {
  if (state.value === undefined) {
    const init = initBySchema(resolveSchema(props.schema));
    if (init !== null) state.value = init;
  }
});

/* =========================
 *  Schema utilities
 * ========================= */
const rootForRef = computed(() => props.rootSchema ?? props.schema);

function getByPointer(root: any, pointer: string): any {
  if (!pointer?.startsWith("#/")) return undefined;
  return pointer
    .slice(2)
    .split("/")
    .reduce((acc: any, seg: string) => acc?.[seg], root);
}

function deepMerge<A, B>(a: A, b: B): any {
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b];
  if (a && typeof a === "object" && b && typeof b === "object") {
    const out: any = { ...(a as any) };
    for (const k of Object.keys(b as any)) {
      out[k] =
        k in out ? deepMerge((out as any)[k], (b as any)[k]) : (b as any)[k];
    }
    return out;
  }
  return (b as any) ?? (a as any);
}

function resolveSchema(def: any, seen = new Set<any>()): any {
  if (!def || typeof def !== "object") return def;
  if (seen.has(def)) return def;
  seen.add(def);

  // $ref
  if ("$ref" in def) {
    const tgt = getByPointer(rootForRef.value, def.$ref);
    const resolved = resolveSchema(tgt, seen);
    // merge local overrides (Draft 2020-12 semantics)
    const { $ref, ...overrides } = def;
    return Object.keys(overrides).length > 0
      ? deepMerge(resolved, overrides)
      : resolved;
  }

  const out: any = { ...def };

  // allOf
  if (Array.isArray(def.allOf)) {
    const resolved = def.allOf.map((d: any) => resolveSchema(d, seen));
    const merged = resolved.reduce((acc: any, curr: any) => deepMerge(acc, curr), {});
    return deepMerge(merged, out);
  }

  // oneOf/anyOf (keep as-is, resolved individually)
  if (def.oneOf)
    out.oneOf = def.oneOf.map((d: any) => resolveSchema(d, seen));
  if (def.anyOf)
    out.anyOf = def.anyOf.map((d: any) => resolveSchema(d, seen));

  // children
  if (def.items) out.items = resolveSchema(def.items, seen);
  if (def.prefixItems)
    out.prefixItems = def.prefixItems.map((d: any) => resolveSchema(d, seen));
  if (def.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(def.properties)) {
      (out.properties as any)[k] = resolveSchema(v, seen);
    }
  }
  if (
    def.additionalProperties &&
    typeof def.additionalProperties === "object"
  ) {
    out.additionalProperties = resolveSchema(def.additionalProperties, seen);
  }
  return out;
}

/* =========================
 *  path utils
 * ========================= */
function ensureObjectPath(obj: any, path: (string | number)[]) {
  let cur = obj;
  for (let i = 0; i < path.length - 1; i++) {
    const k = path[i];
    if (!(k in cur)) {
      const next = path[i + 1];
      cur[k] = typeof next === "number" ? [] : {};
    }
    cur = cur[k];
  }
  return cur;
}

function getAt(obj: any, path: (string | number)[]) {
  let cur = obj;
  for (const k of path) {
    if (!cur || !(k in cur)) return undefined;
    cur = cur[k];
  }
  return cur;
}

function setAt(obj: any, path: (string | number)[], val: any) {
  if (path.length === 0) return;
  const parent = ensureObjectPath(obj, path);
  const lastKey = path[path.length - 1];
  if (val === undefined) {
    delete parent[lastKey];
  } else {
    parent[lastKey] = val;
  }
}

function initBySchema(s: any): any {
  if (!s || typeof s !== "object") return null;
  if (s.default !== undefined) return s.default;
  switch (s.type) {
    case "object":
      return {};
    case "array":
      return [];
    case "boolean":
      return false;
    case "number":
    case "integer":
      return 0;
    case "string":
      return "";
    default:
      return null;
  }
}

/* =========================
 *  Branch selection state for composite schemas
 * ========================= */
const branchState = reactive<Record<string, number | undefined>>({});
function keyOf(path: (string | number)[]) {
  return path.map(String).join("/");
}

// Provide helpers for injected child components
provide('jsf', {
  resolveSchema,
  initBySchema,
  branchState,
  state,
  getAt,
  setAt,
  keyOf,
  formRef,
  validateForm: () => formRef.value?.validate()
})
</script>

<style scoped>
.jsf-form {
  --pad: 12px;
}
.group {
  display: grid;
  gap: 16px;
}
.group-title {
  font-weight: 700;
  color: #1f5fbf;
}

.card-prop,
.card-ap,
.card-item,
.card-composite {
  margin-bottom: 10px;
}
.prop-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.array {
  display: grid;
  gap: 12px;
}

.lbl-row {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.lbl-text {
  font-weight: 700;
}
.lbl-tag {
  border-radius: 6px;
  font-size: 10px;
  padding: 2px 4px;
}

.hint {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}
.inp {
  width: 100%;
}

.oneof, .anyof {
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
  padding: 12px;
  margin: 8px 0;
}

.branch-selector {
  margin-bottom: 12px;
}
</style>
