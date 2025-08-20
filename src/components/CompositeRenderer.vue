<script setup lang="ts">
import { computed, inject, defineOptions } from 'vue'
import FieldRenderer from './FieldRenderer.vue'
import { ElFormItem, ElSelect, ElOption, ElCard } from 'element-plus'

defineOptions({ name: 'CompositeRenderer' })

const props = withDefaults(defineProps<{
  schema: Record<string, any>,
  path?: (string|number)[],
  modelValue?: any
}>(), { path: () => [] })

const emit = defineEmits<{ (e: 'update:modelValue', v: any): void }>()

const jsf = inject('jsf') as any
if (!jsf) throw new Error('CompositeRenderer requires jsf injection')

const sch = computed(() => jsf.resolveSchema(props.schema))
const key = computed(() => `comp:${(props.path || []).map(String).join('/')}`)
const idx = computed<number | undefined>({
  get: () => jsf.branchState[key.value] as number | undefined,
  set: (v) => { jsf.branchState[key.value] = v }
})

function getOptionLabel(o: any, i: number) {
  if (o.title) return o.title
  if (o.type) return o.type
  if (Array.isArray(o.enum)) return `enum: ${o.enum.join(', ')}`
  if (o.$ref) return String(o.$ref).replace('#/$defs/','').replace('#/definitions/','')
  return `Option ${i+1}`
}
</script>

<template>
  <ElCard shadow="never" class="card-composite">
    <template #default>
      <ElFormItem>
        <template #label>
          <div class="lbl-row">
            <span class="lbl-text">{{ sch.title ?? 'Choice' }}</span>
          </div>
        </template>
        <template #default>
          <ElSelect
            :model-value="idx"
            clearable
            placeholder="Select option"
            class="inp"
            @change="(v:any)=>{ idx = v; if (v !== undefined) emit('update:modelValue', jsf.initBySchema((sch.oneOf || sch.anyOf)[v])) }"
          >

            <ElOption
              v-for="(o,i) in (sch.oneOf || sch.anyOf || [])"
              :key="i"
              :label="getOptionLabel(o,i)"
              :value="i"
            />
          </ElSelect>
        </template>
      </ElFormItem>

      <div v-if="idx !== undefined">
        <FieldRenderer
          :schema="(sch.oneOf || sch.anyOf)[idx]"
          :path="path"
          :model-value="modelValue"
          @update:model-value="$emit('update:modelValue', $event)"
        />
      </div>
    </template>
  </ElCard>
</template>

<style scoped>
.card-composite { margin-bottom: 12px; }
</style>
