<template>
  <!-- Render root theo schema -->
  <component :is="rootVNode" />
</template>

<script setup lang="ts">
import { computed, h, reactive, toRefs, watch, type VNode } from "vue";

/** =========================
 *  Props / Emits
 *  ========================= */
type JSONSchema = Record<string, any>;

const props = withDefaults(
  defineProps<{
    schema: JSONSchema; // JSON Schema (có thể chứa $defs/definitions)
    modelValue?: any; // dữ liệu bind từ ngoài vào
    // optional: nơi chứa definitions nếu bạn muốn tách riêng
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

/** =========================
 *  State bên trong
 *  ========================= */
const state = reactive<{ value: any }>({
  value: props.modelValue,
});

// đồng bộ hai chiều v-model
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
    console.debug("JsonSchemaForm: update modelValue", v);
    emit("update:modelValue", v);
    emit("change", v);
  }
);

/** =========================
 *  Resolver cho $ref / definitions / $defs
 *  ========================= */
const rootForRef = computed<JSONSchema>(() => props.rootSchema ?? props.schema);

function getByPointer(root: any, pointer: string) {
  if (pointer?.startsWith("#/")) {
    return pointer
      .slice(2)
      .split("/")
      .reduce((acc: any, seg: string) => acc?.[seg], root);
  }
  return undefined;
}

// Deep merge nhẹ (đủ cho allOf phổ biến object/props); không xử lý tất cả edge-cases draft
function deepMerge<A extends any, B extends any>(a: A, b: B): A & B {
  if (Array.isArray(a) && Array.isArray(b)) return [...a, ...b] as any;
  if (a && typeof a === "object" && b && typeof b === "object") {
    const out: any = { ...a };
    for (const k of Object.keys(b)) {
      out[k] = k in out ? deepMerge(out[k], (b as any)[k]) : (b as any)[k];
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
    return deepMerge(resolved, resolveSchema(overrides, seen));
  }

  // allOf
  if (Array.isArray(def.allOf)) {
    const merged = def.allOf
      .map((d: any) => resolveSchema(d, seen))
      .reduce((acc, cur) => deepMerge(acc, cur), {});
    const rest = { ...def };
    delete rest.allOf;
    return resolveSchema(deepMerge(merged, rest), seen);
  }

  // anyOf / oneOf: chỉ resolve bên trong; lựa chọn do renderer quyết định
  if (Array.isArray(def.anyOf)) {
    return { ...def, anyOf: def.anyOf.map((d: any) => resolveSchema(d, seen)) };
  }
  if (Array.isArray(def.oneOf)) {
    return { ...def, oneOf: def.oneOf.map((d: any) => resolveSchema(d, seen)) };
  }

  // resolve con: items/properties/additionalProperties
  const out: any = Array.isArray(def) ? [] : { ...def };
  if (def.items) out.items = resolveSchema(def.items, seen);
  if (def.prefixItems)
    out.prefixItems = def.prefixItems.map((d: any) => resolveSchema(d, seen));
  if (def.properties) {
    out.properties = {};
    for (const [k, v] of Object.entries(def.properties)) {
      out.properties[k] = resolveSchema(v, seen);
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

/** =========================
 *  Helpers cập nhật model theo “path”
 *  ========================= */
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

/** =========================
 *  Visitor render (bảng dispatch)
 *  ========================= */
type Ctx = {
  schema: JSONSchema;
  path: (string | number)[];
  value: any;
  setValue: (v: any) => void;
};

type Handler = (sch: JSONSchema, ctx: Ctx) => VNode;

// Bộ chọn option cho oneOf/anyOf (trạng thái dựa trên đường dẫn)
const branchState = reactive<Record<string, any>>({}); // key: path.join('/')

function keyOf(path: (string | number)[]) {
  return path.map(String).join("/");
}

const RENDER: Record<string, Handler> = {
  string: (sch, ctx) => {
    // enum -> select
    if (Array.isArray(sch.enum)) {
      return h("div", { class: "field" }, [
        h("label", sch.title ?? ctx.path.at(-1) ?? "string"),
        h(
          "select",
          {
            value: ctx.value ?? "",
            onChange: (e: Event) =>
              ctx.setValue((e.target as HTMLSelectElement).value),
          },
          [
            h("option", { value: "" }, "— select —"),
            ...sch.enum.map((opt: any) =>
              h("option", { value: String(opt) }, String(opt))
            ),
          ]
        ),
        sch.description ? h("small", { class: "hint" }, sch.description) : null,
      ]);
    }
    // format date/time (tối giản)
    const inputType =
      sch.format === "date"
        ? "date"
        : sch.format === "time"
        ? "time"
        : sch.format === "date-time"
        ? "datetime-local"
        : "text";
    return h("div", { class: "field" }, [
      h("label", sch.title ?? ctx.path.at(-1) ?? "string"),
      h("input", {
        type: inputType,
        value: ctx.value ?? "",
        minlength: sch.minLength,
        maxlength: sch.maxLength,
        onInput: (e: Event) =>
          ctx.setValue((e.target as HTMLInputElement).value),
        placeholder: sch.title ?? String(ctx.path.at(-1) ?? ""),
      }),
      sch.description ? h("small", { class: "hint" }, sch.description) : null,
    ]);
  },

  number: (sch, ctx) =>
    h("div", { class: "field" }, [
      h("label", sch.title ?? ctx.path.at(-1) ?? "number"),
      h("input", {
        type: "number",
        step: sch.multipleOf ?? "any",
        min: sch.minimum,
        max: sch.maximum,
        value: ctx.value ?? "",
        onInput: (e: Event) => {
          const raw = (e.target as HTMLInputElement).value;
          ctx.setValue(raw === "" ? "" : Number(raw));
        },
      }),
      sch.description ? h("small", { class: "hint" }, sch.description) : null,
    ]),

  integer: (sch, ctx) =>
    h("div", { class: "field" }, [
      h("label", sch.title ?? ctx.path.at(-1) ?? "integer"),
      h("input", {
        type: "number",
        step: 1,
        min: sch.minimum,
        max: sch.maximum,
        value: ctx.value ?? "",
        onInput: (e: Event) => {
          const raw = (e.target as HTMLInputElement).value;
          ctx.setValue(raw === "" ? "" : Number(raw));
        },
      }),
      sch.description ? h("small", { class: "hint" }, sch.description) : null,
    ]),

  boolean: (sch, ctx) =>
    h("div", { class: "field" }, [
      h("label", [
        h("input", {
          type: "checkbox",
          checked: !!ctx.value,
          onInput: (e: Event) =>
            ctx.setValue((e.target as HTMLInputElement).checked),
        }),
        ` ${sch.title ?? ctx.path.at(-1) ?? "boolean"}`,
      ]),
    ]),

  object: (sch, ctx) => {
    const props = sch.properties ?? {};
    const req: string[] = sch.required ?? [];
    const children: VNode[] = [];

    // additionalProperties (object map)
    const hasAP = sch.additionalProperties;
    const apSchema = typeof hasAP === "object" ? hasAP : undefined;

    // properties cố định
    for (const [k, child] of Object.entries<any>(props)) {
      const childSchema = resolveSchema(child);
      const childPath = [...ctx.path, k];
      const childVal = getAt(state.value, childPath);
      children.push(
        renderNode(
          childSchema,
          {
            schema: childSchema,
            path: childPath,
            value: childVal,
            setValue: (v) => setAt(state.value, childPath, v),
          },
          k,
          req.includes(k)
        )
      );
    }

    // UI thêm key động nếu additionalProperties = true / object
    if (hasAP) {
      let newKey = "";
      children.push(
        h("div", { class: "row" }, [
          h("input", {
            class: "inp",
            placeholder: "Add property key",
            onInput: (e: Event) =>
              (newKey = (e.target as HTMLInputElement).value),
          }),
          h(
            "button",
            {
              class: "btn",
              onClick: () => {
                if (!newKey) return;
                const childPath = [...ctx.path, newKey];
                const template = apSchema ? resolveSchema(apSchema) : {};
                // init rỗng theo type
                let init: any = "";
                if (template.type === "object") init = {};
                else if (template.type === "array") init = [];
                else if (template.type === "boolean") init = false;
                else if (
                  template.type === "number" ||
                  template.type === "integer"
                )
                  init = 0;
                setAt(state.value, childPath, init);
              },
            },
            "Add"
          ),
        ])
      );

      // Render các key động (không nằm trong properties)
      const currentObj = getAt(state.value, ctx.path) ?? {};
      for (const k of Object.keys(currentObj)) {
        if (k in props) continue;
        const childPath = [...ctx.path, k];
        const childVal = currentObj[k];
        const childSchema = apSchema ? resolveSchema(apSchema) : {};
        children.push(
          h("div", { class: "prop-card" }, [
            h("div", { class: "prop-head" }, [
              h("strong", k),
              h(
                "button",
                {
                  class: "link danger",
                  onClick: () => {
                    const parent = getAt(state.value, ctx.path) ?? {};
                    delete parent[k];
                  },
                },
                "Remove"
              ),
            ]),
            renderNode(childSchema, {
              schema: childSchema,
              path: childPath,
              value: childVal,
              setValue: (v) => setAt(state.value, childPath, v),
            }),
          ])
        );
      }
    }

    return h("fieldset", { class: "group" }, [
      sch.title ?? String(ctx.path.at(-1) ?? "")
        ? h("legend", sch.title ?? String(ctx.path.at(-1)))
        : null,
      ...children,
    ]);
  },

  array: (sch, ctx) => {
    const itemsSchema = sch.items ? resolveSchema(sch.items) : {};
    const arr = Array.isArray(ctx.value) ? ctx.value : [];
    const nodes = arr.map((_, i) =>
      h("div", { class: "prop-card" }, [
        h("div", { class: "prop-head" }, [
          h("strong", `Item ${i + 1}`),
          h(
            "button",
            {
              class: "link danger",
              onClick: () => {
                const cloned = [...arr];
                cloned.splice(i, 1);
                ctx.setValue(cloned);
              },
            },
            "Remove"
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
      ])
    );

    // add item
    nodes.push(
      h(
        "button",
        {
          class: "btn",
          onClick: () => {
            const init = initBySchema(itemsSchema);
            console.log("ctx", ctx);
            //   ctx.setValue([...(arr ?? []), init])
          },
        },
        "Add item"
      )
    );

    return h("div", { class: "array" }, nodes);
  },

  // fallbacks
  null: (_sch, ctx) => h("div", { class: "field dim" }, "null"),
  unknown: (_sch, ctx) =>
    h("div", { class: "field dim" }, `No renderer for type`),
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
    default:
      return null;
  }
}

/** =========================
 *  oneOf / anyOf renderer
 *  ========================= */
function getOptionLabel(schema, index) {
  if (schema.title) return schema.title;
  if (schema.type) return schema.type;
  if (schema.enum) return `enum: ${schema.enum.join(", ")}`;
  if (schema.$ref) return schema.$ref.replace("#/$defs/", "");
  return `Option ${index + 1}`;
}

function renderComposite(s: any, ctx: Ctx): VNode | null {
  // oneOf: chọn 1 option
  if (Array.isArray(s.oneOf)) {
    const selKey = `oneOf:${keyOf(ctx.path)}`;
    const idx =
      typeof branchState[selKey] === "number" ? branchState[selKey] : 0;
    const titles = s.oneOf.map(
      (o: any, i: number) => o.title ?? `Option ${i + 1}`
    );
    const option = s.oneOf[idx];

    // init model theo selection nếu chưa có
    if (ctx.value == null) ctx.setValue(initBySchema(option));

    return h("div", { class: "oneof" }, [
      h("label", s.title ?? String(ctx.path.at(-1) ?? "oneOf")),
      h(
        "select",
        {
          value: String(idx),
          onChange: (e: Event) => {
            const ni = Number((e.target as HTMLSelectElement).value);
            branchState[selKey] = ni;
            ctx.setValue(initBySchema(s.oneOf[ni]));
          },
        },
        titles.map((t: string, i: number) =>
          h("option", { value: String(i) }, t)
        )
      ),
      renderNode(option, ctx),
    ]);
  }

  // anyOf: có thể chọn nhiều option (merge kết quả đơn giản theo thứ tự)
  if (Array.isArray(s.anyOf)) {
    const selKey = `anyOf:${keyOf(ctx.path)}`;
    const selected: Set<number> = new Set(branchState[selKey] ?? []);
    const titles = s.anyOf.map(
      (o: any, i: number) => o.title ?? `Option ${i + 1}`
    );

    function toggle(i: number, on: boolean) {
      if (on) selected.add(i);
      else selected.delete(i);
      branchState[selKey] = Array.from(selected);
      // merge init
      let merged: any = {};
      for (const idx of selected)
        merged = deepMerge(merged, initBySchema(s.anyOf[idx]));
      ctx.setValue(merged);
    }

    const boxes = titles.map((t: string, i: number) =>
      h("label", { class: "checkbox" }, [
        h("input", {
          type: "checkbox",
          checked: selected.has(i),
          onInput: (e: Event) =>
            toggle(i, (e.target as HTMLInputElement).checked),
        }),
        ` ${t}`,
      ])
    );

    // render các option đã chọn
    const rendered = Array.from(selected).map((i) =>
      h("div", { class: "prop-card" }, [
        h("div", { class: "prop-head" }, [h("strong", titles[i])]),
        renderNode(s.anyOf[i], ctx),
      ])
    );

    return h("div", { class: "anyof" }, [
      h("div", { class: "row wrap" }, boxes),
      ...rendered,
    ]);
  }

  return null;
}

/** =========================
 *  Render node đệ quy
 *  ========================= */
function renderNode(
  schRaw: any,
  ctxBase: Ctx,
  label?: string,
  required = false
): VNode {
  const sch = resolveSchema(schRaw);

  // composite first
  const composite = renderComposite(sch, ctxBase);
  if (composite) return composite;

  const type = sch.type ?? (Array.isArray(sch.enum) ? "string" : "unknown");

  const handler = RENDER[type] ?? RENDER.unknown;
  const node = handler(sch, ctxBase);

  // bọc label + required nếu cần (cho primitive)
  if (
    ["string", "number", "integer", "boolean", "null", "unknown"].includes(
      type
    ) &&
    label
  ) {
    return h("div", { class: "field" }, [
      h("label", [
        h("span", { class: "lbl-inline" }, label),
        required ? h("sup", { class: "req" }, "*") : null,
      ]),
      node,
    ]);
  }
  return node;
}

/** =========================
 *  Root vnode
 *  ========================= */
const rootVNode = computed(() => {
  const sch = resolveSchema(props.schema);
  const ctx: Ctx = {
    schema: sch,
    path: [],
    value: state.value,
    setValue: (v) => (state.value = v),
  };

  // nếu chưa có giá trị, khởi tạo theo schema
  if (state.value === undefined) state.value = initBySchema(sch);

  // render theo root type
  if (sch.type === "object" || sch.properties || sch.additionalProperties) {
    return RENDER.object(sch, ctx);
  }
  if (sch.type === "array" || sch.items) {
    return RENDER.array(sch, ctx);
  }
  if (sch.oneOf || sch.anyOf || sch.allOf) {
    // composite root
    const composite = renderComposite(sch, ctx);
    if (composite) return composite;
  }
  // primitive root
  const handler = RENDER[sch.type ?? "unknown"] ?? RENDER.unknown;
  return handler(sch, ctx);
});
</script>

<style scoped>
/* Minimal styles; thay bằng UI lib nếu muốn */
.field {
  margin: 10px 0;
  display: grid;
  gap: 6px;
}
.field > label {
  font-weight: 600;
}
.field input[type="text"],
.field input[type="number"],
.field input[type="date"],
.field input[type="time"],
.field input[type="datetime-local"],
.field select {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  width: 100%;
}
.group {
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 12px;
  margin: 12px 0;
}
.group > legend {
  font-weight: 700;
  padding: 0 6px;
}
.array .prop-card,
.prop-card {
  border: 1px solid #eee;
  border-radius: 10px;
  margin: 8px 0;
  padding: 10px;
}
.prop-head {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.hint {
  color: #666;
  font-size: 12px;
}
.req {
  color: #b3261e;
  margin-left: 4px;
}
.btn {
  padding: 6px 10px;
  border: 1px solid #111;
  border-radius: 8px;
  background: #111;
  color: #fff;
  cursor: pointer;
}
.link {
  border: 0;
  background: transparent;
  cursor: pointer;
  color: #1867c0;
}
.link.danger {
  color: #b00020;
}
.row {
  display: flex;
  gap: 8px;
  align-items: center;
}
.row.wrap {
  flex-wrap: wrap;
}
.checkbox {
  margin-right: 12px;
}
.oneof,
.anyof {
  border: 1px dashed #ddd;
  border-radius: 10px;
  padding: 10px;
  margin: 8px 0;
}
.lbl-inline {
  margin-right: 6px;
}
</style>
