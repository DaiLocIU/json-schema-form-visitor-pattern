<script setup lang="ts">
import { ref, reactive } from 'vue'
import DynamicValueInput from '../components/DynamicValueInput/index.vue'
import { InputValueType } from '../typings/inputValueType'

// Test data for different input types
const testData = reactive({
  string: '',
  integer: null,
  float: null,
  boolean: false,
  list: [],
  array: [],
  jsonSchema: {},
  struct: {},
  image: null,
  base64File: null,
  tools: null,
  tool: null,
  knowledgeBase: null,
  workflow: null,
})

// Available input types for testing
const inputTypes = [
  { value: InputValueType.STRING, label: 'String' },
  { value: InputValueType.INTEGER, label: 'Integer' },
  { value: InputValueType.FLOAT, label: 'Float' },
  { value: InputValueType.BOOLEAN, label: 'Boolean' },
  { value: InputValueType.LIST, label: 'List' },
  { value: InputValueType.ARRAY, label: 'Array' },
  { value: InputValueType.JSON_SCHEMA, label: 'JSON Schema' },
  { value: InputValueType.STRUCT, label: 'Struct' },
  { value: InputValueType.IMAGE, label: 'Image' },
  { value: InputValueType.BASE64_FILE, label: 'Base64 File' },
  { value: InputValueType.TOOLS, label: 'Tools' },
  { value: InputValueType.TOOL, label: 'Tool' },
  { value: InputValueType.KNOWLEDGE_BASE, label: 'Knowledge Base' },
  { value: InputValueType.WORKFLOW, label: 'Workflow' },
]

// Current selected type
const currentType = ref(InputValueType.STRING)

// Sample enum values for string type
const sampleEnumValues = ['option1', 'option2', 'option3']

// Sample workflow options
const sampleWorkflows = [
  { id: 'wf1', name: 'Workflow 1' },
  { id: 'wf2', name: 'Workflow 2' },
  { id: 'wf3', name: 'Workflow 3' },
]

// Sample JSON schema for struct type
const sampleJsonSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      title: 'Name'
    },
    age: {
      type: 'integer',
      title: 'Age',
      minimum: 0
    },
    active: {
      type: 'boolean',
      title: 'Active'
    }
  },
  required: ['name']
}

// Sample options value with enum
const sampleOptionsValue = {
  status: {
    enum: ['active', 'inactive', 'pending']
  },
  priority: {
    enum: ['low', 'medium', 'high']
  }
}

// Current test values
const currentValue = ref('')
const useEnumValues = ref(false)
const useOptionsValue = ref(false)
const optionsKeyName = ref('status')
const disabled = ref(false)

// Get current model value based on selected type
const getCurrentValue = () => {
  const key = currentType.value.toLowerCase()
  return testData[key]
}

// Update current model value
const updateCurrentValue = (value) => {
  const key = currentType.value.toLowerCase()
  testData[key] = value
}

// Reset current value when type changes
const onTypeChange = () => {
  const key = currentType.value.toLowerCase()
  switch (currentType.value) {
    case InputValueType.BOOLEAN:
      testData[key] = false
      break
    case InputValueType.LIST:
    case InputValueType.ARRAY:
      testData[key] = []
      break
    case InputValueType.JSON_SCHEMA:
    case InputValueType.STRUCT:
      testData[key] = {}
      break
    default:
      testData[key] = null
  }
}
</script>

<template>
  <div class="dynamic-input-test" style="padding: 20px; max-width: 1200px; margin: 0 auto;">
    <h1>Dynamic Value Input Component Test</h1>
    
    <!-- Controls -->
    <div class="controls-section" style="margin-bottom: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
      <h3>Test Controls</h3>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px; margin-bottom: 20px;">
        <!-- Input Type Selection -->
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Input Type:</label>
          <select 
            v-model="currentType" 
            @change="onTypeChange"
            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"
          >
            <option v-for="type in inputTypes" :key="type.value" :value="type.value">
              {{ type.label }}
            </option>
          </select>
        </div>

        <!-- Disabled Toggle -->
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <input type="checkbox" v-model="disabled" style="margin-right: 5px;">
            Disabled
          </label>
        </div>

        <!-- Use Enum Values (for STRING type) -->
        <div v-if="currentType === InputValueType.STRING">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <input type="checkbox" v-model="useEnumValues" style="margin-right: 5px;">
            Use Enum Values
          </label>
        </div>

        <!-- Use Options Value -->
        <div>
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">
            <input type="checkbox" v-model="useOptionsValue" style="margin-right: 5px;">
            Use Options Value
          </label>
          <select 
            v-if="useOptionsValue"
            v-model="optionsKeyName"
            style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 4px; margin-top: 5px;"
          >
            <option value="status">Status</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Test Component -->
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <h3>Component Test</h3>
        <div style="border: 1px solid #eee; border-radius: 8px; padding: 20px; background: white;">
          <DynamicValueInput
            :model-value="getCurrentValue()"
            @update:model-value="updateCurrentValue"
            :type="currentType"
            :disabled="disabled"
            :enum-values="useEnumValues && currentType === InputValueType.STRING ? sampleEnumValues : undefined"
            :options-value="useOptionsValue ? sampleOptionsValue : undefined"
            :key-name="useOptionsValue ? optionsKeyName : undefined"
            :options-work-flow="currentType === InputValueType.WORKFLOW ? sampleWorkflows : undefined"
            :json-schema="currentType === InputValueType.STRUCT ? sampleJsonSchema : undefined"
            placeholder="Test placeholder"
          />
        </div>

        <!-- Current Type Info -->
        <div style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 4px;">
          <strong>Current Type:</strong> {{ currentType }}
          <br>
          <strong>Props Applied:</strong>
          <ul style="margin: 5px 0; padding-left: 20px;">
            <li v-if="disabled">disabled: true</li>
            <li v-if="useEnumValues && currentType === InputValueType.STRING">enumValues: {{ sampleEnumValues }}</li>
            <li v-if="useOptionsValue">optionsValue: {{ sampleOptionsValue }}, keyName: {{ optionsKeyName }}</li>
            <li v-if="currentType === InputValueType.WORKFLOW">optionsWorkFlow: {{ sampleWorkflows.length }} workflows</li>
            <li v-if="currentType === InputValueType.STRUCT">jsonSchema: provided</li>
          </ul>
        </div>
      </div>
      
      <div>
        <h3>Output Value</h3>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow: auto; max-height: 400px; min-height: 200px;">{{ JSON.stringify(getCurrentValue(), null, 2) }}</pre>
        
        <h3 style="margin-top: 20px;">All Test Data</h3>
        <pre style="background: #f1f5f9; padding: 15px; border-radius: 4px; overflow: auto; max-height: 300px; font-size: 12px;">{{ JSON.stringify(testData, null, 2) }}</pre>

        <!-- Reset Button -->
        <div style="margin-top: 15px;">
          <button 
            @click="onTypeChange"
            style="padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;"
          >
            Reset Current Value
          </button>
        </div>
      </div>
    </div>

    <!-- Type-specific Documentation -->
    <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px;">
      <h3>Type-specific Features</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px;">
        <div>
          <h4>STRING</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
            <li>Text input with optional text editor modal</li>
            <li>Support for enum values (dropdown)</li>
            <li>Support for options value with enum</li>
          </ul>
        </div>
        <div>
          <h4>INTEGER / FLOAT</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
            <li>Number validation</li>
            <li>Display formatting</li>
          </ul>
        </div>
        <div>
          <h4>BOOLEAN</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
            <li>Switch component</li>
            <li>True/False values</li>
          </ul>
        </div>
        <div>
          <h4>LIST / ARRAY</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
            <li>Add/remove items</li>
            <li>Dynamic list management</li>
          </ul>
        </div>
        <div>
          <h4>JSON_SCHEMA</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
            <li>JSON Schema builder component</li>
            <li>Visual schema creation</li>
          </ul>
        </div>
        <div>
          <h4>STRUCT</h4>
          <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
            <li>Dynamic form based on JSON schema</li>
            <li>Nested validation</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dynamic-input-test h1 {
  color: #2c3e50;
  margin-bottom: 20px;
}

.dynamic-input-test h3 {
  color: #34495e;
  margin-bottom: 15px;
}

.dynamic-input-test h4 {
  color: #007bff;
  margin-bottom: 8px;
}

.controls-section {
  border-left: 4px solid #007bff;
}

button:hover {
  background: #0056b3 !important;
}

select:focus,
input:focus {
  outline: 2px solid #007bff;
  outline-offset: 2px;
}
</style>
