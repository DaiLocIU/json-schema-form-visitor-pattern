<template>
  <!-- Bọc trong ElForm để có layout/labelling đẹp -->
  <el-form label-position="top" class="jsf-form">
    <component :is="Root" />
  </el-form>
</template>

<script setup lang="ts">
import { computed, h, reactive, watch, onMounted, type VNode } from "vue";
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
type Ctx = {
  schema: JSONSchema;
  path: (string | number)[];
  value: any;
  setValue: (v: any) => void;
};
type Handler = (sch: JSONSchema, ctx: Ctx) => VNode;

// chọn nhánh cho oneOf/anyOf theo path (UI state thuần)
const branchState = reactive<Record<string, number | undefined>>({});

function keyOf(path: (string | number)[]) {
  return path.map(String).join("/");
}

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

const RENDER: Record<string, Handler> = {
  string: (sch, ctx) => {
    const label = labelWithType(
      sch.title ?? (ctx.path.at(-1) as any) ?? "string",
      sch
    );

    if (Array.isArray(sch.enum)) {
      return h(
        ElFormItem,
        {},
        {
          label: () => label,
          default: () => [
            h(
              ElSelect,
              {
                modelValue: ctx.value ?? "",
                "onUpdate:modelValue": (v: any) => ctx.setValue(v),
                placeholder: "Select or enter value",
                filterable: true,
                clearable: true,
                class: "inp",
              },
              () =>
                sch.enum.map((opt: any) =>
                  h(ElOption, { label: String(opt), value: String(opt) })
                )
            ),
            helperText(sch),
          ],
        }
      );
    }

    // formats: date / time / date-time
    if (
      sch.format === "date" ||
      sch.format === "time" ||
      sch.format === "date-time"
    ) {
      const type =
        sch.format === "date"
          ? "date"
          : sch.format === "time"
          ? "time"
          : "datetime";
      return h(
        ElFormItem,
        {},
        {
          label: () => label,
          default: () => [
            h(ElDatePicker, {
              type,
              modelValue: ctx.value ?? null,
              "onUpdate:modelValue": (v: any) => ctx.setValue(v),
              placeholder: "Pick...",
              class: "inp",
            }),
            helperText(sch),
          ],
        }
      );
    }

    return h(
      ElFormItem,
      {},
      {
        label: () => label,
        default: () => [
          h(ElInput, {
            modelValue: ctx.value ?? "",
            "onUpdate:modelValue": (v: string) => ctx.setValue(v),
            placeholder: "Enter string value",
            clearable: true,
            class: "inp",
          }),
          helperText(sch),
        ],
      }
    );
  },

  number: (sch, ctx) =>
    h(
      ElFormItem,
      {},
      {
        label: () =>
          labelWithType(sch.title ?? (ctx.path.at(-1) as any) ?? "number", sch),
        default: () => [
          h(ElInputNumber, {
            modelValue: ctx.value ?? null,
            "onUpdate:modelValue": (v: number | null) => ctx.setValue(v),
            step: sch.multipleOf ?? 1,
            min: sch.minimum,
            max: sch.maximum,
            controlsPosition: "right",
            class: "inp",
          }),
        ],
      }
    ),

  integer: (sch, ctx) =>
    h(
      ElFormItem,
      {},
      {
        label: () =>
          labelWithType(
            sch.title ?? (ctx.path.at(-1) as any) ?? "integer",
            sch
          ),
        default: () =>
          h(ElInputNumber, {
            modelValue: ctx.value ?? null,
            "onUpdate:modelValue": (v: number | null) => ctx.setValue(v),
            step: 1,
            min: sch.minimum,
            max: sch.maximum,
            controlsPosition: "right",
            class: "inp",
          }),
      }
    ),

  boolean: (sch, ctx) =>
    h(
      ElFormItem,
      {},
      {
        label: () =>
          labelWithType(
            sch.title ?? (ctx.path.at(-1) as any) ?? "boolean",
            sch
          ),
        default: () =>
          h("div", { class: "switch-row" }, [
            h(ElSwitch, {
              modelValue: !!ctx.value,
              "onUpdate:modelValue": (v: boolean) => ctx.setValue(v),
            }),
            h("span", { class: "switch-text" }, "True"),
          ]),
      }
    ),

  object: (sch, ctx) => {
    const props = sch.properties ?? {};
    const blocks: VNode[] = [];

    // properties cố định
    for (const [k, child] of Object.entries<any>(props)) {
      const childSchema = resolveSchema(child);
      const childPath = [...ctx.path, k];
      const childVal = getAt(state.value, childPath);
      // ĐÃ SỬA: không bọc h(...), renderNode đã trả về VNode
      blocks.push(
        renderNode(childSchema, {
          schema: childSchema,
          path: childPath,
          value: childVal,
          setValue: (v) => setAt(state.value, childPath, v),
        })
      );
    }

    // additionalProperties (đơn giản)
    if (sch.additionalProperties) {
      const apSchema =
        typeof sch.additionalProperties === "object"
          ? resolveSchema(sch.additionalProperties)
          : undefined;
      let newKey = "";
      blocks.push(
        h("div", { class: "ap-row" }, [
          h(
            ElFormItem,
            { label: "Add property key", class: "ap-formitem" },
            () =>
              h(ElInput, {
                modelValue: newKey,
                "onUpdate:modelValue": (v: string) => (newKey = v),
                placeholder: "key",
                clearable: true,
                class: "inp",
              })
          ),
          h(
            ElButton,
            {
              type: "primary",
              onClick: () => {
                if (!newKey) return;
                const childPath = [...ctx.path, newKey];
                let init: any = "";
                if (apSchema?.type === "object") init = {};
                else if (apSchema?.type === "array") init = [];
                else if (apSchema?.type === "boolean") init = false;
                else if (
                  apSchema?.type === "number" ||
                  apSchema?.type === "integer"
                )
                  init = 0;
                setAt(state.value, childPath, init);
                newKey = "";
              },
            },
            () => "Add"
          ),
        ])
      );

      const currentObj = getAt(state.value, ctx.path) ?? {};
      for (const k of Object.keys(currentObj)) {
        if (k in props) continue;
        const childPath = [...ctx.path, k];
        const childVal = currentObj[k];
        blocks.push(
          h(ElCard, { class: "card-prop", shadow: "never" }, () => [
            h("div", { class: "prop-head" }, [
              h(ElText, { type: "primary" }, () => k),
              h(
                ElButton,
                {
                  link: true,
                  type: "danger",
                  onClick: () => {
                    const parent = getAt(state.value, ctx.path) ?? {};
                    delete parent[k];
                  },
                },
                () => "Remove"
              ),
            ]),
            renderNode(apSchema ?? {}, {
              schema: apSchema ?? {},
              path: childPath,
              value: childVal,
              setValue: (v) => setAt(state.value, childPath, v),
            }),
          ])
        );
      }
    }

    return h("div", { class: "group" }, [
      sch.title
        ? h(ElDivider, { contentPosition: "left" }, () =>
            h("span", { class: "group-title" }, sch.title)
          )
        : null,
      ...blocks,
    ]);
  },

  array: (sch, ctx) => {
    const itemsSchema = sch.items ? resolveSchema(sch.items) : {};
    const arr = Array.isArray(ctx.value) ? ctx.value : [];
    const nodes = arr.map((_, i) =>
      h(
        ElCard,
        { class: "card-item", shadow: "never", style: "padding: 0" },
        () => [
          h("div", { class: "prop-head" }, [
            h(ElText, () => `Item ${i + 1}`),
            h(
              ElButton,
              {
                link: true,
                type: "danger",
                onClick: () => {
                  const cloned = [...arr];
                  cloned.splice(i, 1);
                  ctx.setValue(cloned);
                },
              },
              () => "Remove"
            ),
          ]),
          renderNode(itemsSchema, {
            schema: itemsSchema,
            path: [...ctx.path, i],
            value: arr[i],
            setValue: (v) => {
              const cloned = [...arr];
              cloned[i] = v;
              ctx.setValue(cloned);
            },
          }),
        ]
      )
    );

    nodes.push(
      h(
        ElButton,
        {
          type: "primary",
          onClick: () =>
            ctx.setValue([...(arr ?? []), initBySchema(itemsSchema)]),
        },
        () => "Add item"
      )
    );

    return h("div", { class: "array" }, nodes);
  },

null: (sch, _ctx) =>
    h(
        ElFormItem,
        {},
        {
            label: () => labelWithType(" ", sch),
            default: () =>
                h(ElInput, { modelValue: "null", disabled: true, class: "inp" }),
        }
    ),

  unknown: () => h(ElText, { type: "warning" }, () => "No renderer for type"),
};

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
function renderComposite(s: any, ctx: Ctx): VNode | null {
  // oneOf
  if (Array.isArray(s.oneOf) && s.oneOf.length > 0) {
    const selKey = `oneOf:${keyOf(ctx.path)}`;
    const idx = branchState[selKey]; // không default 0
    const hasSel = typeof idx === "number";
    const titles = s.oneOf.map((o: any, i: number) => getOptionLabel(o, i));

    return h(ElCard, { class: "card-composite", shadow: "never" }, () => [
      h(
        ElFormItem,
        {},
        {
          label: () =>
            labelWithType(s.title ?? String(ctx.path.at(-1) ?? "oneOf"), {
              type: "oneOf",
            }),
          default: () =>
            h(
              ElSelect,
              {
                modelValue: hasSel ? String(idx) : "",
                "onUpdate:modelValue": (v: string) => {
                  branchState[selKey] = v === "" ? undefined : Number(v);
                },
                placeholder: "Select option",
                filterable: true,
                clearable: true,
                class: "inp",
              },
              () => [
                h(ElOption, { label: "— select —", value: "" }),
                ...titles.map((t: string, i: number) =>
                  h(ElOption, { label: t, value: String(i) })
                ),
              ]
            ),
        }
      ),
      hasSel ? renderNode(s.oneOf[idx as number], ctx) : null,
    ]);
  }

  // anyOf
if (Array.isArray(s.anyOf) && s.anyOf.length > 0) {
    const selKey = `anyOf:${keyOf(ctx.path)}`;
    const idx = branchState[selKey];
    const hasSel = typeof idx === "number";
    const titles = s.anyOf.map((o: any, i: number) => getOptionLabel(o, i));

    return h(ElCard, { class: "card-composite", shadow: "never" }, () => [
        h(
            ElFormItem,
            {},
            {
                label: () =>
                    labelWithType(s.title ?? String(ctx.path.at(-1) ?? "anyOf"), {
                        type: "anyOf",
                    }),
                default: () =>
                    h(
                        ElSelect,
                        {
                            modelValue: hasSel ? String(idx) : "",
                            "onUpdate:modelValue": (v: string) => {
                                branchState[selKey] = v === "" ? undefined : Number(v);
                            },
                            placeholder: "Select option",
                            filterable: true,
                            clearable: true,
                            class: "inp",
                        },
                        () => [
                            h(ElOption, { label: "— select —", value: "" }),
                            ...titles.map((t: string, i: number) =>
                                h(ElOption, { label: t, value: String(i) })
                            ),
                        ]
                    ),
            }
        ),
        hasSel ? renderNode(s.anyOf[idx as number], ctx) : null,
    ]);
}

  // allOf: đã merge ở resolveSchema
  return null;
}

/* =========================
 *  Render node đệ quy
 * ========================= */
function renderNode(
  schRaw: any,
  ctxBase: Ctx,
  label?: string,
  required = false
): VNode {
  const sch = resolveSchema(schRaw);

  const composite = renderComposite(sch, ctxBase);
  if (composite) return composite;

  const type = sch.type ?? (Array.isArray(sch.enum) ? "string" : "unknown");
  const handler = RENDER[type] ?? RENDER.unknown;
  const node = handler(sch, ctxBase);

  if (
    ["string", "number", "integer", "boolean", "null", "unknown"].includes(
      type
    ) &&
    label
  ) {
    return h(
      ElFormItem,
      { label: `${label}${required ? " *" : ""}` },
      () => node
    );
  }
  return node;
}

/* =========================
 *  Root vnode + wrapper
 * ========================= */
const rootVNode = computed(() => {
  const sch = resolveSchema(props.schema);
  const ctx: Ctx = {
    schema: sch,
    path: [],
    value: state.value,
    setValue: (v) => (state.value = v),
  };

  if (sch.type === "object" || sch.properties || sch.additionalProperties)
    return RENDER.object(sch, ctx);
  if (sch.type === "array" || sch.items) return RENDER.array(sch, ctx);

  if (sch.oneOf || sch.anyOf) {
    const composite = renderComposite(sch, ctx);
    if (composite) return composite;
  }
  const handler = RENDER[sch.type ?? "unknown"] ?? RENDER.unknown;
  return handler(sch, ctx);
});

const Root = { render: () => rootVNode.value };
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
