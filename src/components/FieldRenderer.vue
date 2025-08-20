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
  ElCard,
  ElButton,
  ElText,
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

      <ElDatePicker
        v-else-if="['date','time','date-time'].includes(schResolved.format)"
        :type="schResolved.format === 'date' ? 'date' : (schResolved.format === 'time' ? 'time' : 'datetime')"
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
    <ElCard v-if="schResolved.title" shadow="never" class="card-prop">
      <template #header>
        <div class="group-title">{{ schResolved.title }}</div>
      </template>
      <template #default>
        <div v-for="(childSchema, key) in schResolved.properties || {}" :key="key">
          <FieldRenderer
            :schema="childSchema"
            :path="[...path, key]"
            :model-value="(modelValue ?? {})[key]"
            @update:model-value="v => setChild(key, v)"
          />
        </div>

        <div v-if="schResolved.additionalProperties" class="ap-row">
          <ElInput v-model="tmpKey" placeholder="key" class="inp" />
          <ElButton type="primary" @click="() => { if (!tmpKey) return; const ap = schResolved.additionalProperties; const initVal = ap?.type ? jsf.initBySchema(ap) : ''; setChild(tmpKey, initVal); tmpKey = ''; }">Add</ElButton>
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
</style>
