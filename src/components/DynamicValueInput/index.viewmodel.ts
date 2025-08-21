import { ElMessage } from 'element-plus'

import { ref, watch } from 'vue'
import { InputValueType } from '@/typings/inputValueType'

export interface DynamicValueInputProps {
  modelValue: any
  type: string
  placeholder?: string
  itemsSchema?: {
    type: string
    description?: string
    [key: string]: any
  }
}

export const useDynamicValueInput = (
  props: DynamicValueInputProps,
  emit: (event: 'update:modelValue', value: any) => void
) => {

  // Reactive state
  const newListItem = ref('')
  const listItems = ref<any[]>([]) // Changed from string[] to any[] to support different types
  const imageError = ref(false)
  const imagePreview = ref('')
  const uploadError = ref('')
  const jsonSchemaValue = ref({})
  
  // Separate display values for numeric inputs
  const integerDisplayValue = ref('')
  const floatDisplayValue = ref('')

  // Text modal state
  const showTextModal = ref(false)
  const textModalValue = ref('')

  // --- Base64 File Upload State ---
  const base64FileName = ref('')
  const base64FilePreview = ref('')
  const base64FileError = ref('')

  // Initialize values from modelValue
  watch(() => props.modelValue, (newVal) => {
    if (props.type === InputValueType.LIST && Array.isArray(newVal)) {
      // Only update if the arrays are different to prevent recursion
      if (JSON.stringify(listItems.value) !== JSON.stringify(newVal)) {
        listItems.value = [...newVal]
      }
    } else if (props.type === InputValueType.JSON_SCHEMA && typeof newVal === 'object') {
      if (JSON.stringify(jsonSchemaValue.value) !== JSON.stringify(newVal || {})) {
        jsonSchemaValue.value = newVal || {}
      }
    } else if (props.type === InputValueType.IMAGE && typeof newVal === 'string') {
      imagePreview.value = newVal
    } else if (props.type === InputValueType.INTEGER) {
      integerDisplayValue.value = newVal?.toString() || ''
    } else if (props.type === InputValueType.FLOAT) {
      floatDisplayValue.value = newVal?.toString() || ''
    }
    imageError.value = false
    uploadError.value = ''
  }, { immediate: true })

  // Watch JSON Schema changes
  watch(jsonSchemaValue, (newVal) => {
    if (props.type === InputValueType.JSON_SCHEMA) {
      // Only emit if different from current modelValue
      if (JSON.stringify(newVal) !== JSON.stringify(props.modelValue)) {
        updateValue(newVal)
      }
    }
  }, { deep: true })

  // Watch list items changes
  watch(listItems, (newVal) => {
    if (props.type === InputValueType.LIST || props.type === InputValueType.ARRAY) {
      // Only emit if different from current modelValue
      if (JSON.stringify(newVal) !== JSON.stringify(props.modelValue)) {
        console.log('List/Array items updated:', newVal)
        updateValue(newVal)
      }
    }
  }, { deep: true })

  // Helper functions
  const isValidImageUrl = (url: string): boolean => {
    try {
      new URL(url)
      return true
    } catch {
      // Check if it's base64
      return url.startsWith('data:image/') || /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(url)
    }
  }

  const updateValue = (value: any) => {
    emit('update:modelValue', value)
  }

  // List management
  const addListItem = () => {
    console.log('Adding list item with schema:', props.itemsSchema)
    
    // If we have itemsSchema, create appropriate default value
    if (props.itemsSchema?.type) {
      const defaultValue = getDefaultValueForSchemaType(props.itemsSchema.type)
      listItems.value.push(defaultValue)
      console.log('List item added with type:', props.itemsSchema.type, 'value:', defaultValue)
    } else {
      // Fallback to string input
      if (newListItem.value.trim()) {
        listItems.value.push(newListItem.value.trim())
        console.log('List item added:', listItems.value)
        newListItem.value = ''
      }
    }
  }

  const removeListItem = (index: number) => {
    listItems.value.splice(index, 1)
  }

  // Helper function to get default value based on schema type
  const getDefaultValueForSchemaType = (schemaType: string) => {
    switch (schemaType.toLowerCase()) {
      case 'string':
        return ''
      case 'integer':
        return 0
      case 'number':
      case 'float':
        return 0.0
      case 'boolean':
        return false
      case 'array':
      case 'list':
        return []
      case 'object':
      case 'struct':
        return {}
      default:
        return null
    }
  }

  // Number input validation
  const handleIntegerInput = (value: string) => {
    // Update display value immediately for responsive input
    integerDisplayValue.value = value
    
    // Remove all non-numeric characters except minus sign at the beginning
    const cleanValue = value.replace(/[^-0-9]/g, '').replace(/(?!^)-/g, '')
    
    // Convert to integer if it's a valid number, otherwise emit null for empty string
    if (cleanValue === '' || cleanValue === '-') {
      updateValue(null)
    } else {
      const intValue = parseInt(cleanValue, 10)
      updateValue(isNaN(intValue) ? null : intValue)
    }
  }

  const handleFloatInput = (value: string) => {
    // Update display value immediately for responsive input
    floatDisplayValue.value = value
    
    // Remove all non-numeric characters except minus sign at the beginning and one decimal point
    let cleanValue = value.replace(/[^-0-9.]/g, '')
    
    // Handle minus sign - only allow at the beginning
    cleanValue = cleanValue.replace(/(?!^)-/g, '')
    
    // Handle decimal point - only allow one
    const parts = cleanValue.split('.')
    if (parts.length > 2) {
      cleanValue = parts[0] + '.' + parts.slice(1).join('')
    }
    
    // Convert to float if it's a valid number, otherwise emit null for empty string
    if (cleanValue === '' || cleanValue === '-' || cleanValue === '.') {
      updateValue(null)
    } else {
      const floatValue = parseFloat(cleanValue)
      if (isNaN(floatValue)) {
        updateValue(null)
      } else {
        // For float type, ensure we always have decimal representation
        // If user enters "1", we want to emit 1.0, not 1
        if (Number.isInteger(floatValue) && !cleanValue.includes('.')) {
          updateValue(parseFloat((floatValue + 0.0).toFixed(1)))
        } else {
          updateValue(floatValue)
        }
      }
    }
  }

  // Image upload methods
  const beforeImageUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    const isLt10M = file.size / 1024 / 1024 < 10

    if (!isImage) {
      ElMessage.error('Upload file must be an image!')
      return false
    }
    if (!isLt10M) {
      ElMessage.error('Image size must be less than 10MB!')
      return false
    }
    
    uploadError.value = ''
    return true
  }

  const handleImageUpload = (options: any) => {
    return new Promise((resolve, reject) => {
      const file = options.file
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const base64 = e.target?.result as string
        imagePreview.value = base64
        updateValue(base64)
        resolve(base64)
      }
      
      reader.onerror = () => {
        uploadError.value = 'Failed to read file'
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsDataURL(file)
    })
  }

  const removeImage = () => {
    imagePreview.value = ''
    uploadError.value = ''
    updateValue('')
  }

  // --- Base64 File Upload Handlers ---
  const beforeBase64Upload = (file: File) => {
    const isLt10M = file.size / 1024 / 1024 < 10
    if (!isLt10M) {
      ElMessage.error('File size must be less than 10MB!')
      base64FileError.value = 'File size must be less than 10MB!'
      return false
    }
    base64FileError.value = ''
    return true
  }

  const handleBase64Upload = (options: any) => {
    return new Promise((resolve, reject) => {
      const file = options.file
      const reader = new FileReader()
      reader.onload = (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1] || ''
        base64FilePreview.value = file.name
        base64FileName.value = file.name
        base64FileError.value = ''
        // Emit the required format
        updateValue({
          filename: file.name,
          content: base64
        })
        resolve(base64)
      }
      reader.onerror = () => {
        base64FileError.value = 'Failed to read file'
        reject(new Error('Failed to read file'))
      }
      reader.readAsDataURL(file)
    })
  }

  const removeBase64File = () => {
    base64FilePreview.value = ''
    base64FileName.value = ''
    base64FileError.value = ''
    updateValue('')
  }

  // Knowledge Base API integration
  // Text modal methods
  const openTextModal = () => {
    textModalValue.value = props.modelValue || ''
    showTextModal.value = true
  }

  const cancelTextModal = () => {
    showTextModal.value = false
    textModalValue.value = ''
  }

  const saveTextModal = () => {
    emit('update:modelValue', textModalValue.value)
    showTextModal.value = false
  }

  return {
    // State
    newListItem,
    listItems,
    imageError,
    imagePreview,
    uploadError,
    jsonSchemaValue,
    integerDisplayValue,
    floatDisplayValue,
    base64FileName,
    base64FilePreview,
    base64FileError,
    showTextModal,
    textModalValue,
    // Methods
    isValidImageUrl,
    updateValue,
    addListItem,
    removeListItem,
    getDefaultValueForSchemaType,
    handleIntegerInput,
    handleFloatInput,
    beforeImageUpload,
    handleImageUpload,
    removeImage,
    beforeBase64Upload,
    handleBase64Upload,
    removeBase64File,
    openTextModal,
    cancelTextModal,
    saveTextModal,
  } as const
}
