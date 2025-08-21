import { ElMessage } from "element-plus";
import { ref, reactive, watch } from "vue";

// Type definitions
export type SchemaType =
  | "Object"
  | "Array"
  | "String"
  | "Integer"
  | "Number"
  | "Boolean"
  | "Null";

export interface TypeOption {
  label: string;
  value: SchemaType;
}

export interface SchemaEntity {
  _key: string;
  _description: string;
  _type: [SchemaType];
  _required: boolean;
  _properties: SchemaEntity[];
  _items: SchemaEntity[];
  _parent: string;
  _default?: string;
  _enum?: string;
  __ID__: string;

  // String-specific properties
  _minLength?: number;
  _maxLength?: number;
  _pattern?: string;
  _format?: string;

  // Number-specific properties
  _minimum?: number;
  _maximum?: number;
  _multipleOf?: number;

  // Array-specific properties
  _minItems?: number;
  _maxItems?: number;
  _uniqueItems?: boolean;
}

export interface JSONSchema {
  type?: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  items?: JSONSchema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: string;
  minimum?: number;
  maximum?: number;
  multipleOf?: number;
  default?: any;
  enum?: any[];
  description?: string;
}

export const useJSONSchemaBuilder = (
  initialJson?: any,
  onUpdate?: (json: any) => void
) => {
  // UI State
  const activeTab = ref('designer');
  const jsonEditorValue = ref('');
  const jsonEditorObject = ref<Record<string, any> | unknown[]>({});
  const jsonError = ref('');
  const jsonWarning = ref('');

  // Convert object to formatted JSON string
  const formatJsonString = (obj: any): string => {
    try {
      return JSON.stringify(obj, null, 2);
    } catch (error) {
      console.error('Error formatting JSON:', error);
      return '';
    }
  };

  // Update JSON editor from designer
  const updateJsonEditorFromDesigner = (newJson: any) => {
    jsonEditorValue.value = formatJsonString(newJson);
    try {
      jsonEditorObject.value = newJson || {};
    } catch (e) {
      console.error('Error updating jsonEditorObject:', e);
      jsonEditorObject.value = {};
    }
    jsonError.value = '';
    jsonWarning.value = '';
  };

  // Validate JSON schema
  const validateJsonSchema = (jsonString: string): { isValid: boolean; error?: string; warning?: string; parsed?: any } => {
    if (!jsonString.trim()) {
      return { isValid: false, error: 'JSON schema cannot be empty' };
    }

    try {
      const parsed = JSON.parse(jsonString);
      
      // Basic JSON Schema validation
      if (typeof parsed !== 'object' || parsed === null) {
        return { isValid: false, error: 'JSON schema must be an object' };
      }

      // Check for common JSON Schema properties
      const hasSchemaProps = parsed.type || parsed.properties || parsed.items || parsed.$schema;
      if (!hasSchemaProps) {
        return { 
          isValid: true, 
          parsed, 
          warning: 'This doesn\'t appear to be a standard JSON Schema. Consider adding "type" or other schema properties.' 
        };
      }

      return { isValid: true, parsed };
    } catch (error) {
      return { 
        isValid: false, 
        error: `Invalid JSON: ${error instanceof Error ? error.message : 'Unknown parsing error'}` 
      };
    }
  };

  // Apply JSON from editor to designer
  const validateAndApplyJson = async (editorRef?: any) => {
    try {
      // First, validate using the JsonEditor's validation method
      if (editorRef && editorRef.validate) {
        const isValid = await editorRef.validate();
        if (!isValid) {
          // Validation failed - don't apply the JSON
          ElMessage.error('JSON validation failed. Please fix the errors shown above before applying.');
          return;
        }
      } else {
        console.warn('JsonEditor ref not available or validate method not found');
      }

      // Use jsonEditorObject directly since JsonEditor already provides parsed object
      const schemaObject = jsonEditorObject.value;
      
      if (!schemaObject || (typeof schemaObject === 'object' && Object.keys(schemaObject).length === 0)) {
        jsonError.value = 'JSON schema cannot be empty';
        jsonWarning.value = '';
        return;
      }

      if (typeof schemaObject !== 'object' || Array.isArray(schemaObject)) {
        jsonError.value = 'JSON schema must be an object';
        jsonWarning.value = '';
        return;
      }

      jsonError.value = '';
      jsonWarning.value = '';
      
      // Update the modelValue
      if (onUpdate) {
        onUpdate(schemaObject);
      }
      // Also reinitialize the designer with the new JSON
      reinitializeFromJson(schemaObject);
      
      // Show success message
      ElMessage.success('JSON schema applied successfully');
    } catch (error) {
      console.error('Error applying JSON:', error);
      jsonError.value = 'Error applying JSON schema';
      jsonWarning.value = '';
    }
  };

  // Handle tab change
  const handleTabChange = (tabName: string | number) => {
    const tabNameStr = String(tabName);
    if (tabNameStr === 'json' && activeTab.value === 'designer') {
      // Switching from designer to JSON - update JSON editor
      const currentSchema = getJsonSchema();
      updateJsonEditorFromDesigner(currentSchema);
    }
    activeTab.value = tabNameStr;
  };
  // Helper: convert JSON Schema to internal entity
  function schemaToEntity(
    schema: any,
    key = "Root",
    parent = ""
  ): SchemaEntity {
    const type = schema.type;
    let schemaType: SchemaType;

    switch (type) {
      case "object":
        schemaType = "Object";
        break;
      case "array":
        schemaType = "Array";
        break;
      case "string":
        schemaType = "String";
        break;
      case "integer":
        schemaType = "Integer";
        break;
      case "number":
        schemaType = "Number";
        break;
      case "boolean":
        schemaType = "Boolean";
        break;
      case "null":
        schemaType = "Null";
        break;
      default:
        schemaType = "String";
    }

    const entity = newEntity(schemaType, key, parent);

    // Set common properties
    if (schema.description) entity._description = schema.description;
    if (schema.default !== undefined) entity._default = String(schema.default);
    if (schema.enum) {
      entity._enum = schema.enum.join(", ");
    }

    // Type-specific properties
    if (schemaType === "Object" && schema.properties) {
      entity._properties = [];
      for (const [propKey, propSchema] of Object.entries(schema.properties)) {
        const propEntity = schemaToEntity(propSchema, propKey, key);
        propEntity._required = schema.required?.includes(propKey) || false;
        entity._properties.push(propEntity);
      }
    } else if (schemaType === "Array" && schema.items) {
      entity._items = [schemaToEntity(schema.items, "", `${parent}[0]`)];
      if (schema.minItems !== undefined) entity._minItems = schema.minItems;
      if (schema.maxItems !== undefined) entity._maxItems = schema.maxItems;
      if (schema.uniqueItems !== undefined)
        entity._uniqueItems = schema.uniqueItems;
    } else if (schemaType === "String") {
      if (schema.minLength !== undefined) entity._minLength = schema.minLength;
      if (schema.maxLength !== undefined) entity._maxLength = schema.maxLength;
      if (schema.pattern) entity._pattern = schema.pattern;
      if (schema.format) entity._format = schema.format;
      // enum is already set in common properties section above
    } else if (schemaType === "Integer" || schemaType === "Number") {
      if (schema.minimum !== undefined) entity._minimum = schema.minimum;
      if (schema.maximum !== undefined) entity._maximum = schema.maximum;
      if (schema.multipleOf !== undefined)
        entity._multipleOf = schema.multipleOf;
      if (schema.format) entity._format = schema.format;
    }

    return entity;
  }

  // Helper: create new schema entities by type
  function newEntity(
    type: SchemaType,
    key = "",
    parent = "",
    required = false
  ): SchemaEntity {
    const base: SchemaEntity = {
      _key: key,
      _description: "",
      _type: [type],
      _required: required,
      _properties: [],
      _items: [],
      _parent: parent,
      _default: "",
      _enum: "",
      __ID__: Math.random().toString(36).slice(2),
    };

    switch (type) {
      case "Object":
        return { ...base, _properties: [] };
      case "Array":
        return {
          ...base,
          _items: [newEntity("String", "", parent + "[0]")],
          _minItems: undefined,
          _maxItems: undefined,
          _uniqueItems: false,
        };
      case "String":
        return {
          ...base,
          _minLength: 0,
          _maxLength: undefined,
          _pattern: "",
          _format: "",
        };
      case "Integer":
      case "Number":
        return {
          ...base,
          _minimum: undefined,
          _maximum: undefined,
          _multipleOf: undefined,
          _format: "",
        };
      case "Boolean":
        return { ...base };
      case "Null":
        return { ...base };
      default:
        return base;
    }
  }

  // Root schema object - initialize from props or create new
  const rootEntity = reactive(
    initialJson && Object.keys(initialJson).length > 0
      ? schemaToEntity(initialJson, "Root")
      : newEntity("Object", "Root")
  );

  // Model for JSON text tab
  const schemaJson = ref("");

  // Recursively convert UI model to standard JSON Schema
  function entityToSchema(entity: SchemaEntity): JSONSchema {
    const schema: JSONSchema = {};
    const type = entity._type[0];

    if (type === "Object") {
      schema.type = "object";
      schema.properties = {};
      schema.required = [];
      for (const prop of entity._properties) {
        schema.properties[prop._key] = entityToSchema(prop);
        if (prop._required) schema.required.push(prop._key);
      }
      if (schema.required.length === 0) delete schema.required;
    } else if (type === "Array") {
      schema.type = "array";
      schema.items = entity._items[0] ? entityToSchema(entity._items[0]) : {};
      if (entity._minItems !== undefined) schema.minItems = entity._minItems;
      if (entity._maxItems !== undefined) schema.maxItems = entity._maxItems;
      if (entity._uniqueItems) schema.uniqueItems = entity._uniqueItems;
    } else if (type === "String") {
      schema.type = "string";
      if (entity._minLength) schema.minLength = entity._minLength;
      if (entity._maxLength) schema.maxLength = entity._maxLength;
      if (entity._pattern) schema.pattern = entity._pattern;
      if (entity._format) schema.format = entity._format;
      if (entity._default) schema.default = entity._default;
      if (entity._enum) {
        try {
          // Split the comma-separated values and properly quote them for JSON parsing
          const enumValues = entity._enum.split(',').map(val => val.trim());
          // Try to parse each value as JSON first (for numbers, booleans), otherwise treat as string
          const parsedValues = enumValues.map(val => {
            try {
              // Try parsing as JSON (handles numbers, booleans, null)
              return JSON.parse(val);
            } catch {
              // If it fails, treat as string and quote it properly
              return val;
            }
          });
          schema.enum = parsedValues;
        } catch (e) {
          console.error(`Failed to parse enum for ${entity._key}:`, entity._enum, e);
        }
      }
    } else if (type === "Integer" || type === "Number") {
      schema.type = type.toLowerCase();
      if (entity._minimum !== undefined) schema.minimum = entity._minimum;
      if (entity._maximum !== undefined) schema.maximum = entity._maximum;
      if (entity._multipleOf !== undefined)
        schema.multipleOf = entity._multipleOf;
      if (entity._format) schema.format = entity._format;
      if (entity._default) schema.default = entity._default;
      if (entity._enum) {
        try {
          // Split the comma-separated values and properly parse them
          const enumValues = entity._enum.split(',').map(val => val.trim());
          // For numbers, try to parse each value as a number
          const parsedValues = enumValues.map(val => {
            try {
              // Try parsing as JSON first (handles numbers, booleans, null)
              return JSON.parse(val);
            } catch {
              // If it fails, try parsing as number for Integer/Number types
              const numVal = Number(val);
              return isNaN(numVal) ? val : numVal;
            }
          });
          schema.enum = parsedValues;
        } catch (e) {
          console.error(`Failed to parse enum for ${entity._key}:`, entity._enum, e);
        }
      }
    } else if (type === "Boolean") {
      schema.type = "boolean";
      if (entity._default) schema.default = entity._default === "true";
    } else if (type === "Null") {
      schema.type = "null";
    }

    if (entity._description) schema.description = entity._description;
    return schema;
  }

  // Watcher to sync JSON output with entity and emit updates
  watch(
    () => rootEntity,
    () => {
      const newSchema = entityToSchema(rootEntity);
      
      // Check if schema is empty (no properties) - return null instead
      const isEmptySchema = newSchema.type === "object" && 
                           (!newSchema.properties || Object.keys(newSchema.properties).length === 0);
      
      const finalSchema = isEmptySchema ? null : newSchema;
      schemaJson.value = finalSchema ? JSON.stringify(finalSchema, null, 2) : 'null';

      // Emit update if callback provided
      if (onUpdate) {
        onUpdate(finalSchema);
      }

      // Update JSON editor when designer changes
      if (activeTab.value === 'designer') {
        updateJsonEditorFromDesigner(finalSchema);
      }
    },
    { deep: true, immediate: true }
  );

  // Initialize JSON editor value
  watch(() => initialJson, (newValue) => {
    if (activeTab.value === 'json') {
      updateJsonEditorFromDesigner(newValue);
    }
  }, { immediate: true, deep: true });

  // Clear errors when switching to designer tab
  watch(activeTab, (newTab) => {
    if (newTab === 'designer') {
      jsonError.value = '';
      jsonWarning.value = '';
    }
  });

  // Get current JSON schema
  function getJsonSchema(): JSONSchema | null {
    const schema = entityToSchema(rootEntity);
    
    // Check if schema is empty (no properties) - return null instead
    const isEmptySchema = schema.type === "object" && 
                         (!schema.properties || Object.keys(schema.properties).length === 0);
    
    return isEmptySchema ? null : schema;
  }

  // Add new property to an object entity
  function addProperty(entity: SchemaEntity): void {
    entity._properties.push(newEntity("String", "", entity._key));
  }

  // Remove property by index
  function removeProperty(entity: SchemaEntity, idx: number): void {
    entity._properties.splice(idx, 1);
  }

  // Reinitialize root entity from new JSON
  function reinitializeFromJson(newJson: any) {
    if (newJson && typeof newJson === 'object') {
      const newEntity = schemaToEntity(newJson);
      // Update all properties of rootEntity to trigger reactivity
      Object.assign(rootEntity, newEntity);
    } else {
      // Reset to empty schema
      Object.assign(rootEntity, newEntity("Object", "Root"));
    }
  }

  // JSON Editor validation state
  const hasValidJson = ref(true);

  // Handle JsonEditor error events
  const handleJsonError = (isError: boolean) => {
    hasValidJson.value = !isError;
    if (isError) {
      jsonError.value = 'Invalid JSON syntax';
    } else {
      jsonError.value = '';
    }
  };

  // Handle JsonEditor valid events
  const handleJsonValid = (isValid: boolean) => {
    hasValidJson.value = isValid;
    if (isValid) {
      jsonError.value = '';
    }
  };

  // Handle JsonEditor object changes
  const handleJsonObjectChange = (newObject: Record<string, any> | unknown[]) => {
    try {
      jsonEditorObject.value = newObject;
      jsonEditorValue.value = JSON.stringify(newObject, null, 2);
      hasValidJson.value = true;
      jsonError.value = '';
    } catch (e) {
      console.error('Error handling JSON object change:', e);
      hasValidJson.value = false;
      jsonError.value = 'Error processing JSON object';
    }
  };

  // Initialize component
  if (initialJson && Object.keys(initialJson).length > 0) {
    try {
      reinitializeFromJson(initialJson);
      const schema = getJsonSchema();
      updateJsonEditorFromDesigner(schema);
    } catch (error) {
      console.error('Error initializing from JSON:', error);
      Object.assign(rootEntity, newEntity("Object", "Root"));
      jsonEditorObject.value = {};
    }
  } else {
    Object.assign(rootEntity, newEntity("Object", "Root"));
    jsonEditorObject.value = {};
  }

  return {
    // Data
    rootEntity,
    schemaJson,

    // UI State
    activeTab,
    jsonEditorValue,
    jsonEditorObject,
    jsonError,
    jsonWarning,
    hasValidJson,

    // Methods
    newEntity,
    entityToSchema,
    schemaToEntity,
    getJsonSchema,
    addProperty,
    removeProperty,
    reinitializeFromJson,
    validateAndApplyJson,
    handleTabChange,
    handleJsonError,
    handleJsonValid,
  } as const;
};
