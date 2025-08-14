# JsonSchemaFormEl Component

A Vue 3 component that automatically generates forms from JSON Schema with Element Plus UI components.

## Features

- ✨ **JSON Schema Support**: Full support for JSON Schema Draft 7/2019-09/2020-12
- 🎨 **Element Plus Integration**: Beautiful UI components from Element Plus
- 🔄 **Two-way Data Binding**: v-model support for seamless data binding
- 🏗️ **Schema Resolution**: Automatic `$ref`, `allOf`, `oneOf`, `anyOf` resolution
- 📝 **Form Validation**: Built-in validation based on schema constraints
- 🧩 **Extensible**: Easy to customize and extend with new field types

## Installation

```bash
npm install element-plus @element-plus/icons-vue
```

## Basic Usage

```vue
<template>
  <div>
    <JsonSchemaFormEl 
      v-model="formData" 
      :schema="schema"
      @change="handleChange"
    />
    
    <pre>{{ JSON.stringify(formData, null, 2) }}</pre>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import JsonSchemaFormEl from './JsonSchemaFormEl.vue'

const formData = ref({})

const schema = {
  type: 'object',
  title: 'User Profile',
  properties: {
    name: {
      type: 'string',
      title: 'Full Name',
      description: 'Enter your full name'
    },
    age: {
      type: 'integer',
      title: 'Age',
      minimum: 0,
      maximum: 120
    },
    email: {
      type: 'string',
      format: 'email',
      title: 'Email Address'
    },
    isActive: {
      type: 'boolean',
      title: 'Active User'
    }
  },
  required: ['name', 'email']
}

function handleChange(data) {
  console.log('Form data changed:', data)
}
</script>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `schema` | `JSONSchema` | **Required** | The JSON Schema object defining the form structure |
| `modelValue` | `any` | `undefined` | The form data (for v-model) |
| `rootSchema` | `JSONSchema` | `undefined` | Optional root schema for resolving `$ref` references |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `update:modelValue` | `any` | Emitted when form data changes (for v-model) |
| `change` | `any` | Emitted when form data changes |

## Supported JSON Schema Features

### Basic Types

- **string**: Text input, email, date, time, datetime-local
- **number/integer**: Number input with min/max validation
- **boolean**: Checkbox
- **object**: Nested form fields with fieldsets
- **array**: Dynamic list with add/remove functionality

### Advanced Features

- **enum**: Dropdown select for predefined values
- **oneOf**: Single selection from multiple schema options
- **anyOf**: Single selection from multiple schema options (same as oneOf)
- **allOf**: Schema composition and merging
- **$ref**: Schema references and definitions
- **additionalProperties**: Dynamic object properties

### Schema Constraints

- `required`: Required field validation
- `minimum/maximum`: Number range validation
- `minLength/maxLength`: String length validation
- `format`: Input type hints (date, time, email, etc.)
- `title`: Field labels
- `description`: Help text

## Schema Examples

### Simple Form

```javascript
const schema = {
  type: 'object',
  properties: {
    firstName: { type: 'string', title: 'First Name' },
    lastName: { type: 'string', title: 'Last Name' },
    age: { type: 'integer', minimum: 0 }
  },
  required: ['firstName', 'lastName']
}
```

### Enum Selection

```javascript
const schema = {
  type: 'object',
  properties: {
    country: {
      type: 'string',
      title: 'Country',
      enum: ['US', 'UK', 'CA', 'AU'],
    }
  }
}
```

### OneOf/AnyOf Selection

```javascript
const schema = {
  type: 'object',
  properties: {
    contact: {
      title: 'Contact Method',
      oneOf: [
        {
          title: 'Email',
          type: 'object',
          properties: {
            email: { type: 'string', format: 'email' }
          }
        },
        {
          title: 'Phone',
          type: 'object',
          properties: {
            phone: { type: 'string' }
          }
        }
      ]
    }
  }
}
```

### Arrays

```javascript
const schema = {
  type: 'object',
  properties: {
    tags: {
      type: 'array',
      title: 'Tags',
      items: {
        type: 'string'
      }
    },
    addresses: {
      type: 'array',
      title: 'Addresses',
      items: {
        type: 'object',
        properties: {
          street: { type: 'string', title: 'Street' },
          city: { type: 'string', title: 'City' },
          zipCode: { type: 'string', title: 'ZIP Code' }
        }
      }
    }
  }
}
```

### Additional Properties

```javascript
const schema = {
  type: 'object',
  properties: {
    name: { type: 'string', title: 'Name' }
  },
  additionalProperties: {
    type: 'string',
    title: 'Custom Field'
  }
}
```

### Schema References

```javascript
const schema = {
  type: 'object',
  properties: {
    user: { $ref: '#/$defs/User' },
    admin: { $ref: '#/$defs/User' }
  },
  $defs: {
    User: {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        role: { 
          type: 'string', 
          enum: ['user', 'admin'],
          title: 'Role'
        }
      }
    }
  }
}
```

## Styling

The component uses Element Plus components and CSS variables for theming. You can customize the appearance by overriding Element Plus theme variables or providing custom CSS:

```css
/* Custom styling */
.el-form {
  max-width: 600px;
}

.hint {
  color: #909399;
  font-size: 12px;
}

.oneof, .anyof {
  background-color: #f5f7fa;
  border: 1px dashed #dcdfe6;
}
```

## Advanced Usage

### Custom Root Schema

```vue
<template>
  <JsonSchemaFormEl 
    v-model="data"
    :schema="formSchema"
    :root-schema="rootSchema"
  />
</template>

<script setup>
const rootSchema = {
  $defs: {
    Address: {
      type: 'object',
      properties: {
        street: { type: 'string' },
        city: { type: 'string' }
      }
    }
  }
}

const formSchema = {
  type: 'object',
  properties: {
    homeAddress: { $ref: '#/$defs/Address' },
    workAddress: { $ref: '#/$defs/Address' }
  }
}
</script>
```

### Form Validation

The component automatically handles validation based on the JSON Schema constraints. Use Element Plus form validation for additional custom validation:

```vue
<template>
  <el-form ref="formRef" :model="formData">
    <JsonSchemaFormEl v-model="formData" :schema="schema" />
    <el-button @click="validateForm">Validate</el-button>
  </el-form>
</template>

<script setup>
import { ref } from 'vue'

const formRef = ref()

function validateForm() {
  formRef.value?.validate((valid) => {
    if (valid) {
      console.log('Form is valid!')
    } else {
      console.log('Form validation failed!')
    }
  })
}
</script>
```

## Browser Support

- Vue 3.x
- Element Plus 2.x
- Modern browsers (ES2020+)

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License
