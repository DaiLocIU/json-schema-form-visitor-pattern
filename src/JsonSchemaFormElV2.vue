<template>
  <el-form label-position="top" class="jsf-form">
    <FieldRenderer :schema="props.schema" :model-value="state.value" @update:model-value="v => state.value = v" />
  </el-form>
</template>

<script setup lang="ts">
import { computed, reactive, watch, onMounted, provide, h } from 'vue'
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

/* Nếu muốn có default cho root, làm sau mount (không làm trong render) */
onMounted(() => {
  if (state.value === undefined) {
    state.value = initBySchema(resolveSchema(props.schema));
  }
});

/* =========================
 *  $ref / allOf resolver
 * ========================= */
const rootForRef = computed<JSONSchema>(() => props.rootSchema ?? props.schema);

function getByPointer(root: any, pointer: string) {
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
    const { $ref, ...overrides } = def;
    return deepMerge(resolved, resolveSchema(overrides, seen));
  }

  // allOf
  if (Array.isArray(def.allOf)) {
    const merged = def.allOf
      .map((d) => resolveSchema(d, seen))
      .reduce((acc, cur) => deepMerge(acc, cur), {});
    const rest = { ...def };
    delete (rest as any).allOf;
    return resolveSchema(deepMerge(merged, rest), seen);
  }

  // anyOf/oneOf: chỉ resolve bên trong
  const out: any = { ...def };
  if (Array.isArray(def.anyOf))
    out.anyOf = def.anyOf.map((d) => resolveSchema(d, seen));
  if (Array.isArray(def.oneOf))
    out.oneOf = def.oneOf.map((d) => resolveSchema(d, seen));

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
    if (cur[k] == null) cur[k] = typeof path[i + 1] === "number" ? [] : {};
    cur = cur[k];
  }
  return { parent: cur, key: path[path.length - 1] };
}
function getAt(obj: any, path: (string | number)[]) {
  return path.reduce((acc, k) => (acc == null ? acc : acc[k]), obj);
}
function setAt(obj: any, path: (string | number)[], value: any) {
  const { parent, key } = ensureObjectPath(obj, path);
  parent[key as any] = value;
}

/* =========================
 *  UI helpers (badge & hint)
 * ========================= */
function typeBadgeOf(sch: any) {
  const t =
    sch?.type ??
    (Array.isArray(sch?.enum)
      ? "string"
      : sch?.oneOf
      ? "oneOf"
      : sch?.anyOf
      ? "anyOf"
      : "");
  return t
    ? h(
        ElTag,
        {
          size: "small",
          type: "success",
          effect: "light",
          round: true,
          class: "lbl-tag",
        },
        () => t
      )
    : null;
}
function labelWithType(text: string, sch: any) {
  return h("div", { class: "lbl-row" }, [
    h("span", { class: "lbl-text" }, text),
    typeBadgeOf(sch),
  ]);
}
function helperText(sch: any) {
  const help = sch?.description;
  return help ? h("div", { class: "hint" }, help) : null;
}

/* =========================
 *  Visitor render (Element Plus)
 * ========================= */
// branch selection state for composite schemas
const branchState = reactive<Record<string, number | undefined>>({})
function keyOf(path: (string | number)[]) { return path.map(String).join('/') }

function getOptionLabel(schema: any, index: number): string {
  if (schema.title) return schema.title;
  if (schema.type) return schema.type;
  if (Array.isArray(schema.enum)) return `enum: ${schema.enum.join(", ")}`;
  if (schema.$ref)
    return String(schema.$ref)
      .replace("#/$defs/", "")
      .replace("#/definitions/", "");
  return `Option ${index + 1}`;
}

// (Template-driven rendering moved into FieldRenderer / CompositeRenderer)

function initBySchema(s: any) {
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
    case "null":
      return null;
    default:
      return null;
  }
}

/* =========================
 *  oneOf / anyOf (dropdown lazy, NO model write)
 * ========================= */
// Composite rendering handled in template components

/* =========================
 *  Render node đệ quy
 * ========================= */
// Node rendering moved to FieldRenderer (template-based)

/* =========================
 *  Root vnode + wrapper
 * ========================= */
// Provide helpers for injected child components
provide('jsf', {
  resolveSchema,
  initBySchema,
  branchState,
  state,
  getAt,
  setAt,
  keyOf
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
  font-size: 12px;
  padding: 0 6px;
  text-transform: lowercase;
}

.inp :deep(.el-input__wrapper),
.inp :deep(.el-select__wrapper),
.inp :deep(.el-input-number),
.inp :deep(.el-date-editor) {
  border-radius: 10px;
}

.hint {
  color: #7a7a7a;
  font-size: 12px;
  margin-top: 6px;
}

.switch-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
}
.switch-text {
  color: #333;
}

.ap-row {
  display: flex;
  align-items: flex-end;
  gap: 10px;
}
.ap-formitem {
  flex: 1;
}

.card-item :deep(.el-card__body),
.card-composite :deep(.el-card__body) {
  padding: 12px;
}
.el-form-item:last-child {
  margin-bottom: 0;
}
</style>
