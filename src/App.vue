<!-- App.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import JsonSchemaFormEl from './JsonSchemaFormElV2.vue'

const schemaType = ref('allOf')

const schemas = {
  allOf: {
    title: "AllOf Example",
    type: "object",
    allOf: [
      {
        properties: {
          lorem: {
            type: ["string", "boolean"],
            default: true
          }
        }
      },
      {
        properties: {
          lorem: {
            type: "boolean"
          },
          ipsum: {
            type: "string",
            title: "Ipsum Text"
          }
        }
      }
    ]
  },
  
  user: {
    title: 'User Profile',
    type: 'object',
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
      },
      role: {
        type: 'string',
        title: 'Role',
        enum: ['admin', 'user', 'guest']
      }
    },
    required: ['name', 'email']
  },
  
  contact: {
    title: 'Contact Form',
    type: 'object',
    properties: {
      contactMethod: {
        title: 'Preferred Contact Method',
        oneOf: [
          {
            title: 'Email',
            type: 'object',
            properties: {
              email: { 
                type: 'string', 
                format: 'email',
                title: 'Email Address'
              },
              newsletter: {
                type: 'boolean',
                title: 'Subscribe to newsletter'
              }
            }
          },
          {
            title: 'Phone',
            type: 'object',
            properties: {
              phone: { 
                type: 'string',
                title: 'Phone Number'
              },
              timeToCall: {
                type: 'string',
                title: 'Best time to call',
                enum: ['morning', 'afternoon', 'evening']
              }
            }
          }
        ]
      }
    }
  },
  
  array: {
    title: 'Array Example',
    type: 'object',
    properties: {
      tags: {
        type: 'array',
        title: 'Tags',
        items: {
          type: 'string',
          title: 'Tag'
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
  },
  
  anyOf: {
    title: 'AnyOf Example',
    type: 'object',
    properties: {
      paymentMethod: {
        title: 'Payment Method',
        anyOf: [
          {
            title: 'Credit Card',
            type: 'object',
            properties: {
              cardNumber: { type: 'string', title: 'Card Number' },
              expiryDate: { type: 'string', format: 'date', title: 'Expiry Date' }
            }
          },
          {
            title: 'PayPal',
            type: 'object',
            properties: {
              email: { type: 'string', format: 'email', title: 'PayPal Email' }
            }
          },
          {
            title: 'Bank Transfer',
            type: 'object',
            properties: {
              bankAccount: { type: 'string', title: 'Bank Account' },
              routingNumber: { type: 'string', title: 'Routing Number' }
            }
          }
        ]
      }
    }
  },
  complex: {
    "title": "Complex Data Structure",
    "type": "array",
    "items": {
        "$ref": "#/$defs/DataStructure"
    },
    "$defs": {
        "DataStructure": {
            "properties": {
                "name": {
                    "title": "Name",
                    "type": "string"
                },
                "description": {
                    "title": "Description",
                    "type": "string"
                },
                "type": {
                    "$ref": "#/$defs/ValueType"
                },
                "required": {
                    "anyOf": [
                        {
                            "type": "boolean"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "default": false,
                    "title": "Required"
                },
                "properties": {
                    "anyOf": [
                        {
                            "additionalProperties": {
                                "$ref": "#/$defs/DataStructure"
                            },
                            "type": "object"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "default": null,
                    "title": "Properties"
                },
                "items": {
                    "anyOf": [
                        {
                            "$ref": "#/$defs/DataStructure"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "default": null
                },
                "json_schema": {
                    "anyOf": [
                        {
                            "additionalProperties": true,
                            "type": "object"
                        },
                        {
                            "type": "string"
                        },
                        {
                            "type": "null"
                        }
                    ],
                    "default": null,
                    "title": "Json Schema"
                }
            },
            "required": [
                "name",
                "description",
                "type"
            ],
            "title": "DataStructure",
            "type": "object"
        },
        "ValueType": {
            "description": "Basic supported data types for workflow (used for input, output and config)",
            "enum": [
                "dummy",
                "float",
                "integer",
                "list",
                "dict",
                "string",
                "boolean",
                "json_schema",
                "struct",
                "any",
                "unknown",
                "base64_file",
                "docling_document",
                "knowledge_base",
                "tools",
                "tool",
                "mcp_server",
                "workflow"
            ],
            "title": "ValueType",
            "type": "string"
        }
    }
}
}

const selectedSchema = computed(() => schemas[schemaType.value])
const data = ref()

function changeSchema() {
  data.value = undefined
}
</script>

<template>
  <div style="padding: 20px; max-width: 1200px; margin: 0 auto;">
    <h1>JSON Schema Form Demo</h1>
    
    <div style="margin-bottom: 20px;">
      <label style="margin-right: 10px;">Select Schema Example:</label>
      <select v-model="schemaType" @change="changeSchema" style="padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px;">
        <option v-for="(schema, key) in schemas" :key="key" :value="key">
          {{ schema.title }}
        </option>
      </select>
    </div>
    
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
      <div>
        <h3>Form</h3>
        <div style="border: 1px solid #eee; border-radius: 8px; padding: 16px; background: white;">
          <json-schema-form-el v-model="data" :schema="selectedSchema" />
        </div>
      </div>
      
      <div>
        <h3>Output Data</h3>
        <pre style="background: #f8f9fa; padding: 12px; border-radius: 4px; overflow: auto; max-height: 500px;">{{ JSON.stringify(data, null, 2) }}</pre>
        
        <h3 style="margin-top: 20px;">Schema</h3>
        <pre style="background: #f8f9fa; padding: 12px; border-radius: 4px; overflow: auto; max-height: 300px; font-size: 12px;">{{ JSON.stringify(selectedSchema, null, 2) }}</pre>
      </div>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  background-color: #f5f7fa;
}
</style>
