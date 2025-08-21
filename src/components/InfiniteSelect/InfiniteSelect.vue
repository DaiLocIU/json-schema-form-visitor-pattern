<template>
  <el-select
    ref="selectRef"
    v-model="selectedValue"
    :placeholder="props.placeholder"
    :filterable="props.filterable"
    :clearable="props.clearable"
    :multiple="props.multiple"
    :collapse-tags="props.collapseTags"
    :collapse-tags-tooltip="props.collapseTagsTooltip"
    :max-collapse-tags="props.maxCollapseTags"
    :class="props.selectClass"
    :value-key="props.valueKey"
    reserve-keyword
    :remote-method="handleSearch"
    @visible-change="handleVisibleChange"
    @clear="handleClear"
    @change="handleChange"
    
  >
    <template v-for="option in allOptions" :key="props.getOptionKey(option)">
      <el-option
        :label="props.getOptionLabel(option)"
        :value="props.getOptionValue(option)"
      />
    </template>
    
    <!-- Load more trigger element (invisible) -->
    <div ref="loadMoreTrigger" class="h-1"></div>
    
    <!-- Loading indicator -->
    <div
      v-if="isFetchingNextPage"
      class="flex items-center justify-center p-2 text-gray-500"
    >
      <el-icon class="animate-spin mr-2">
        <Loading />
      </el-icon>
      Loading more...
    </div>

  </el-select>
</template>

<script setup lang="ts" generic="T" name="InfiniteSelect">
import { Loading } from '@element-plus/icons-vue'
import { useInfiniteQuery } from '@tanstack/vue-query'
import { useInfiniteScroll } from '@vueuse/core'
import { ElIcon, ElOption, ElSelect } from 'element-plus'
import { computed, onMounted, ref, watch } from 'vue'

export interface InfiniteSelectProps<T> {
  modelValue?: any
  placeholder?: string
  filterable?: boolean
  clearable?: boolean
  multiple?: boolean
  collapseTags?: boolean
  collapseTagsTooltip?: boolean
  maxCollapseTags?: number
  selectClass?: string
  valueKey?: string
  // Query function that returns paginated data
  queryFn: (params: { pageParam: number; search?: string }) => Promise<{
    data: T[]
    nextCursor?: number | null
    hasMore?: boolean
  }>
  queryKey: (string | number | boolean)[]
  // Option rendering functions
  getOptionKey: (option: T) => string | number
  getOptionLabel: (option: T) => string
  getOptionValue: (option: T) => any
  // Optional search functionality
  searchable?: boolean
  searchDebounceMs?: number
}

// Type-safe props based on multiple selection
export interface SingleSelectProps<T> extends Omit<InfiniteSelectProps<T>, 'modelValue' | 'multiple'> {
  modelValue?: any
  multiple?: false
}

export interface MultipleSelectProps<T> extends Omit<InfiniteSelectProps<T>, 'modelValue' | 'multiple'> {
  modelValue?: any[]
  multiple: true
}

const props = withDefaults(defineProps<InfiniteSelectProps<T>>(), {
  placeholder: 'Select an option',
  filterable: false,
  clearable: false,
  multiple: false,
  collapseTags: false,
  collapseTagsTooltip: false,
  maxCollapseTags: 1,
  selectClass: 'w-full',
  searchable: false,
  searchDebounceMs: 300,
})

const emit = defineEmits<{
  'update:modelValue': [value: any]
  'change': [value: any]
  'clear': []
}>()

// Search state
const searchTerm = ref('')
const isSelectOpen = ref(false)
const loadMoreTrigger = ref<HTMLElement>()
const isInitialized = ref(false)

const selectRef = ref<InstanceType<typeof ElSelect>>()

// Infinite query
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: computed(() => [...props.queryKey, searchTerm.value]),
  queryFn: ({ pageParam = 1 }) => props.queryFn({
    pageParam: pageParam as number,
    search: searchTerm.value || undefined,
  }),
  getNextPageParam: (lastPage: { data: T[]; nextCursor?: number | null; hasMore?: boolean }) => {
    return lastPage.hasMore ? (lastPage.nextCursor || 1) + 1 : undefined
  },
  initialPageParam: 1,
  enabled: computed(() => isSelectOpen.value || isInitialized.value),
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
})


const handleChange = () => {
  if (!props.multiple) {
    selectRef.value?.blur()
  }
}

// Flatten all pages into a single array
const allOptions = computed(() => {
  if (!data.value) return []
  return data.value.pages.flatMap((page: { data: T[] }) => page.data)
})

// Two-way binding for v-model
const selectedValue = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value)
    emit('change', value)
  },
})

// Search handling with debounce
let searchTimeout: number
const handleSearch = (query: string) => {
  if (!props.searchable) return
  
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }
  
  searchTimeout = window.setTimeout(() => {
    searchTerm.value = query
  }, props.searchDebounceMs)
}

// Infinite scroll setup
useInfiniteScroll(
  loadMoreTrigger,
  () => {
    if (hasNextPage.value && !isFetchingNextPage.value && isSelectOpen.value) {
      fetchNextPage()
    }
  },
  { distance: 10 }
)

// Handle select visibility
const handleVisibleChange = (visible: boolean) => {
  if (!props.multiple && !visible) {
    selectRef.value?.blur()
  }
  isSelectOpen.value = visible
  if (!visible) {
    // Reset search when closing
    searchTerm.value = ''
  }
}

const handleClear = () => {
  emit('clear')
  searchTerm.value = ''
}

// Watch for filterable prop changes
watch(() => props.filterable, (filterable) => {
  if (!filterable) {
    searchTerm.value = ''
  }
})

// Initialize data fetching on mount
onMounted(() => {
  isInitialized.value = true
})
</script>
