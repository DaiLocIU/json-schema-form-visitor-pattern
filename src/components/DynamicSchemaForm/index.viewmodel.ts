import { computed, nextTick, ref, watch } from 'vue';

import { InputValueType } from '@/typings/inputValueType';

export interface DynamicSchemaFormProps {
  modelValue: Record<string, any> | any[] | undefined;
  schema: Record<string, any>;
}

export const useDynamicSchemaForm = (
  props: DynamicSchemaFormProps,
  emit: (event: 'update:modelValue', value: Record<string, any> | any[]) => void
) => {
  // Form data state - can be array or object
  const formData = ref<Record<string, any> | any[]>([]);
  
  // Form refs for validation
  const mainFormRef = ref();
  const arrayFormRef = ref();
  
  // Flags to prevent recursive updates
  const isInitializing = ref(false);
  const isEmitting = ref(false);

  // Store selected types for anyOf fields
  const selectedAnyOfTypes = ref<Record<string, string>>({});

    // Tab functionality
  const activeTab = ref('form');
  
  // JSON synchronization flags
  const isSyncingFromForm = ref(false);
  const isSyncingFromJson = ref(false);

  // JSON data for JsonEditor (computed to convert from flattened to nested)
  const jsonData = computed(() => {
    if (isArraySchema()) {
      return formData.value;
    } else {
      return convertFlattenedToNested(formData.value as Record<string, any>);
    }
  });

  // Resolve $ref definitions from the schema
  const resolveRef = (ref: string, schema: Record<string, any>): any => {
    if (!ref.startsWith('#/')) return null;
    
    const path = ref.substring(2).split('/'); // Remove '#/' and split by '/'
    let result = schema;
    
    for (const segment of path) {
      if (result && typeof result === 'object' && segment in result) {
        result = result[segment];
      } else {
        return null;
      }
    }
    
    return result;
  };

  // Resolve schema references recursively
  const resolveSchema = (schemaNode: any, rootSchema: Record<string, any>, visited = new Set<string>(), depth = 0): any => {
    // Prevent infinite recursion with depth limit
    if (depth > 10) {
      return { type: 'object' };
    }

    if (!schemaNode || typeof schemaNode !== 'object') {
      return schemaNode;
    }

    // Handle $ref
    if (schemaNode.$ref) {
      // Check for circular references
      if (visited.has(schemaNode.$ref)) {
        // Return a simplified version to break the cycle
        const resolved = resolveRef(schemaNode.$ref, rootSchema);
        if (resolved && resolved.type) {
          return { type: resolved.type, title: resolved.title };
        }
        return { type: 'object' };
      }
      
      visited.add(schemaNode.$ref);
      const resolved = resolveRef(schemaNode.$ref, rootSchema);
      if (resolved) {
        const result = resolveSchema(resolved, rootSchema, new Set(visited), depth + 1);
        visited.delete(schemaNode.$ref);
        return result;
      }
    }

    // Handle arrays with items
    if (schemaNode.type === 'array' && schemaNode.items) {
      return {
        ...schemaNode,
        items: resolveSchema(schemaNode.items, rootSchema, new Set(visited), depth + 1)
      };
    }

    // Handle objects with properties
    if (schemaNode.type === 'object' && schemaNode.properties) {
      const resolvedProperties: Record<string, any> = {};
      Object.keys(schemaNode.properties).forEach(key => {
        // Skip resolving additionalProperties that reference the same schema to avoid infinite recursion
        const property = schemaNode.properties[key];
        if (property.additionalProperties && property.additionalProperties.$ref) {
          // For additionalProperties with $ref, just keep the basic structure
          resolvedProperties[key] = {
            ...property,
            additionalProperties: { type: 'object' }
          };
        } else {
          resolvedProperties[key] = resolveSchema(property, rootSchema, new Set(visited), depth + 1);
        }
      });
      return {
        ...schemaNode,
        properties: resolvedProperties
      };
    }

    // Handle anyOf/oneOf/allOf
    if (schemaNode.anyOf || schemaNode.oneOf || schemaNode.allOf) {
      const alternatives = schemaNode.anyOf || schemaNode.oneOf || schemaNode.allOf;
      
      // Find the first non-null alternative
      const nonNullAlternative = alternatives.find((alt: any) => alt.type !== 'null');
      if (nonNullAlternative) {
        // If it's a simple type, return it directly with the original schema metadata
        if (nonNullAlternative.type && !nonNullAlternative.$ref && !nonNullAlternative.additionalProperties) {
          return {
            ...schemaNode,
            type: nonNullAlternative.type,
            // Preserve enum and other important properties from the alternative
            enum: nonNullAlternative.enum || schemaNode.enum,
            pattern: nonNullAlternative.pattern || schemaNode.pattern,
            minLength: nonNullAlternative.minLength || schemaNode.minLength,
            maxLength: nonNullAlternative.maxLength || schemaNode.maxLength,
            minimum: nonNullAlternative.minimum || schemaNode.minimum,
            maximum: nonNullAlternative.maximum || schemaNode.maximum,
            // Remove anyOf since we've resolved it
            anyOf: undefined,
            oneOf: undefined,
            allOf: undefined
          };
        }
        // For complex structures (with $ref or additionalProperties), recurse
        const resolved = resolveSchema(nonNullAlternative, rootSchema, new Set(visited), depth + 1);
        return {
          ...schemaNode,
          ...resolved,
          // Keep original metadata like title, default, and enum
          title: schemaNode.title || resolved.title,
          default: schemaNode.default !== undefined ? schemaNode.default : resolved.default,
          enum: resolved.enum || schemaNode.enum,
          pattern: resolved.pattern || schemaNode.pattern,
          minLength: resolved.minLength || schemaNode.minLength,
          maxLength: resolved.maxLength || schemaNode.maxLength,
          minimum: resolved.minimum || schemaNode.minimum,
          maximum: resolved.maximum || schemaNode.maximum,
          // Remove anyOf since we've resolved it
          anyOf: undefined,
          oneOf: undefined,
          allOf: undefined
        };
      }
    }

    return schemaNode;
  };

  // Get available types for anyOf fields
  const getAnyOfOptions = (property: any): Array<{label: string, value: string, type: string}> => {
    if (!property.anyOf && !property.oneOf) return [];
    
    const alternatives = property.anyOf || property.oneOf || [];
    return alternatives
      .filter((alt: any) => alt.type && alt.type !== 'null')
      .map((alt: any) => ({
        label: alt.title || alt.type || 'Unknown',
        value: alt.type,
        type: alt.type
      }));
  };

  // Check if property has anyOf that needs selection
  const hasAnyOfSelection = (property: any): boolean => {
    if (!property.anyOf && !property.oneOf) return false;
    const alternatives = property.anyOf || property.oneOf || [];
    const nonNullAlternatives = alternatives.filter((alt: any) => alt.type && alt.type !== 'null');
    return nonNullAlternatives.length > 1;
  };

  // Get selected type for anyOf field
  const getSelectedAnyOfType = (fieldKey: string, property: any): string => {
    if (selectedAnyOfTypes.value[fieldKey]) {
      return selectedAnyOfTypes.value[fieldKey];
    }
    
    // Default to first non-null option
    const options = getAnyOfOptions(property);
    if (options.length > 0) {
      selectedAnyOfTypes.value[fieldKey] = options[0].value;
      return options[0].value;
    }
    
    return property.type || 'string';
  };

  // Set selected type for anyOf field
  const setSelectedAnyOfType = (fieldKey: string, type: string) => {
    selectedAnyOfTypes.value[fieldKey] = type;
    
    // Reset the field value when type changes
    if (isArraySchema()) {
      // Handle array case
      const arrayData = formData.value as any[];
      if (arrayData[0]) {
        arrayData[0][fieldKey] = getDefaultValueForType(type);
      }
    } else {
      // Handle object case
      const objectData = formData.value as Record<string, any>;
      objectData[fieldKey] = getDefaultValueForType(type);
    }
  };

  // Get default value based on type
  const getDefaultValueForType = (type: string): any => {
    switch (type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
      case 'float':
        return null;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  };

  // Array management functions
  const addArrayItem = () => {
    if (!isArraySchema()) return;
    
    const arrayData = formData.value as any[];
    const itemSchema = getArrayItemSchema();
    const newItem: Record<string, any> = {};
    
    if (itemSchema && itemSchema.properties) {
      Object.keys(itemSchema.properties).forEach(key => {
        const property = itemSchema.properties[key];
        newItem[key] = getDefaultValue(property);
      });
    }
    
    arrayData.push(newItem);
  };

  const removeArrayItem = (index: number) => {
    if (!isArraySchema()) return;
    
    const arrayData = formData.value as any[];
    arrayData.splice(index, 1);
  };

  const getArrayItems = () => {
    if (!isArraySchema()) return [];
    return formData.value as any[];
  };

  // Get the resolved schema
  const getResolvedSchema = () => {
    if (!props.schema) return null;
    return resolveSchema(props.schema, props.schema);
  };

  const getDefaultValue = (property: any): any => {
    if (property.default !== undefined) {
      return property.default;
    }
    
    // Handle special cases for complex anyOf structures
    if (property.title === 'Properties' && (property.type === 'object' || !property.type)) {
      return null; // Default value for properties field
    }
    
    if (property.title === 'Json Schema') {
      return null; // Default value for json_schema field
    }
    
    switch (property.type) {
      case 'string':
        return '';
      case 'number':
      case 'integer':
      case 'float':
        return null;
      case 'boolean':
        return false;
      case 'array':
        return [];
      case 'object':
        return {};
      default:
        return null;
    }
  };

  // Check if this is an array schema (root level array)
  const isArraySchema = () => {
    const resolved = getResolvedSchema();
    return resolved && resolved.type === 'array';
  };

  // Get array item schema for array-type root schemas
  const getArrayItemSchema = () => {
    const resolved = getResolvedSchema();
    if (resolved && resolved.type === 'array' && resolved.items) {
      return resolved.items;
    }
    return null;
  };

  // Flatten nested object properties into dot notation
  const flattenProperties = (properties: Record<string, any>, prefix = ''): Record<string, any> => {
    const result: Record<string, any> = {};
    
    Object.keys(properties).forEach(key => {
      const property = properties[key];
      const fieldKey = prefix ? `${prefix}.${key}` : key;
      
      if (property.type === 'object' && property.properties) {
        // Recursively flatten nested objects
        Object.assign(result, flattenProperties(property.properties, fieldKey));
      } else {
        result[fieldKey] = property;
      }
    });
    
    return result;
  };

  // Group properties by their nesting level and parent object
  const getGroupedProperties = () => {
    const resolved = getResolvedSchema();
    if (!resolved) return [];

    // Handle array schema
    if (resolved.type === 'array') {
      const itemSchema = resolved.items;
      if (itemSchema && itemSchema.properties) {
        return getGroupedPropertiesFromSchema(itemSchema);
      }
      return [];
    }

    // Handle object schema
    if (resolved.properties) {
      return getGroupedPropertiesFromSchema(resolved);
    }

    return [];
  };

  const getGroupedPropertiesFromSchema = (schema: any) => {
    const rootGroup = {
      title: 'Root',
      level: 0,
      path: '',
      properties: {} as Record<string, any>,
      children: [] as any[]
    };
    
    const processProperties = (properties: Record<string, any>, parentGroup: any, prefix = '', level = 0) => {
      Object.keys(properties).forEach(key => {
        const property = properties[key];
        const fieldKey = prefix ? `${prefix}.${key}` : key;
        
        if (property.type === 'object' && property.properties) {
          // Create a nested group for the object
          const objectGroup = {
            title: property.title || key,
            level: level + 1,
            path: fieldKey,
            properties: {} as Record<string, any>,
            children: [] as any[],
            description: property.description
          };
          
          // Process nested properties within this object group
          processProperties(property.properties, objectGroup, fieldKey, level + 1);
          
          // Add the object group to its parent's children
          parentGroup.children.push(objectGroup);
        } else {
          // Add regular property to current group
          parentGroup.properties[fieldKey] = property;
        }
      });
    };
    
    processProperties(schema.properties, rootGroup);
    
    // Flatten the nested structure for easier template iteration
    const flattenGroups = (group: any): any[] => {
      const result = [group];
      group.children.forEach((child: any) => {
        result.push(...flattenGroups(child));
      });
      return result;
    };
    
    return flattenGroups(rootGroup);
  };

  // Get root level properties (non-object properties)
  const getRootProperties = () => {
    const resolved = getResolvedSchema();
    if (!resolved) return {};

    // Handle array schema
    if (resolved.type === 'array') {
      const itemSchema = resolved.items;
      if (itemSchema && itemSchema.properties) {
        const rootProps: Record<string, any> = {};
        Object.keys(itemSchema.properties).forEach(key => {
          const property = itemSchema.properties[key];
          // Only include non-object properties or objects without nested properties
          // Object properties with their own properties are handled by getTopLevelGroups
          if (property.type !== 'object' || !property.properties) {
            rootProps[key] = property;
          }
        });
        return rootProps;
      }
      return {};
    }

    // Handle object schema
    if (resolved.properties) {
      const rootProps: Record<string, any> = {};
      Object.keys(resolved.properties).forEach(key => {
        const property = resolved.properties[key];
        // Only include non-object properties or objects without nested properties
        // Object properties with their own properties are handled by getTopLevelGroups
        if (property.type !== 'object' || !property.properties) {
          rootProps[key] = property;
        }
      });
      return rootProps;
    }

    return {};
  };

  // Get top-level object groups (level 1 groups only)
  const getTopLevelGroups = () => {
    const resolved = getResolvedSchema();
    if (!resolved) return [];

    let schemaToProcess = resolved;

    // Handle array schema
    if (resolved.type === 'array') {
      const itemSchema = resolved.items;
      if (itemSchema && itemSchema.properties) {
        schemaToProcess = itemSchema;
      } else {
        return [];
      }
    }

    if (!schemaToProcess.properties) return [];
    
    // Recursive function to process nested objects at any level
    const processObjectProperties = (properties: Record<string, any>, prefix = '', level = 1): any => {
      const group = {
        title: '',
        level,
        path: prefix,
        properties: {} as Record<string, any>,
        children: [] as any[],
        description: ''
      };
      
      Object.keys(properties).forEach(propKey => {
        const prop = properties[propKey];
        const fieldKey = prefix ? `${prefix}.${propKey}` : propKey;
        
        if (prop.type === 'object' && prop.properties) {
          // This is a nested object - create a child group
          const childGroup = processObjectProperties(prop.properties, fieldKey, level + 1);
          console.log('childGroup:', childGroup);
          childGroup.title = prop.title || propKey;
          childGroup.description = prop.description || '';
          
          group.children.push(childGroup);
        } else {
          group.properties[fieldKey] = prop;
        }
      });
      
      return group;
    };
    
    const groups: any[] = [];
    Object.keys(schemaToProcess.properties).forEach(key => {
      const property = schemaToProcess.properties[key];
      if (property.type === 'object' && property.properties) {
        const objectGroup = processObjectProperties(property.properties, key, 1);
        objectGroup.title = property.title || key;
        objectGroup.description = property.description || '';
        objectGroup.path = key;
        
        groups.push(objectGroup);
      }
    });
    
    return groups;
  };

  // Get nested value from object using dot notation
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  };

  // Set nested value in object using dot notation
  const setNestedValue = (obj: any, path: string, value: any): void => {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  };

  // Convert flattened form data to nested object structure
  const convertFlattenedToNested = (flatData: Record<string, any>): Record<string, any> => {
    const nested: Record<string, any> = {};
    
    Object.keys(flatData).forEach(key => {
      if (key.includes('.')) {
        // This is a nested key, use setNestedValue
        setNestedValue(nested, key, flatData[key]);
      } else {
        // This is a root-level key
        nested[key] = flatData[key];
      }
    });
    
    return nested;
  };

  // Convert nested object structure to flattened form data
  const convertNestedToFlattened = (nestedData: Record<string, any>): Record<string, any> => {
    const flattened: Record<string, any> = {};
    
    const flatten = (obj: any, prefix = '') => {
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        const newKey = prefix ? `${prefix}.${key}` : key;
        
        if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
          // Recursively flatten nested objects
          flatten(value, newKey);
        } else {
          // Add primitive values or arrays directly
          flattened[newKey] = value;
        }
      });
    };
    
    flatten(nestedData);
    return flattened;
  };

  // Initialize form data from schema and modelValue
  const initializeFormData = () => {
    if (isInitializing.value || isEmitting.value) return;
    
    isInitializing.value = true;
    
    if (isArraySchema()) {
      // Handle array schema
      let arrayData: any[] = [];
      
      if (Array.isArray(props.modelValue)) {
        arrayData = [...props.modelValue];
      } else if (props.modelValue && Object.keys(props.modelValue).length > 0) {
        // If modelValue is an object but we need array, create one item
        arrayData = [props.modelValue];
      } else {
        // Create one empty item
        const itemSchema = getArrayItemSchema();
        const newItem: Record<string, any> = {};
        
        if (itemSchema && itemSchema.properties) {
          Object.keys(itemSchema.properties).forEach(key => {
            const property = itemSchema.properties[key];
            newItem[key] = getDefaultValue(property);
          });
        }
        arrayData = [newItem];
      }
      
      formData.value = arrayData;
    } else {
      // Handle object schema
      const data: Record<string, any> = {};
      const groups = getGroupedProperties();
      
      // If modelValue is provided and has nested structure, flatten it first
      let flattenedModelValue: Record<string, any> = {};
      if (props.modelValue && typeof props.modelValue === 'object' && !Array.isArray(props.modelValue)) {
        flattenedModelValue = convertNestedToFlattened(props.modelValue as Record<string, any>);
      }
      
      groups.forEach(group => {
        Object.keys(group.properties).forEach(fieldKey => {
          const property = group.properties[fieldKey];
          
          // Skip object headers
          if (property.isObjectHeader) return;
          
          // Use existing value from flattened modelValue or default value from schema
          if (flattenedModelValue[fieldKey] !== undefined) {
            data[fieldKey] = flattenedModelValue[fieldKey];
          } else {
            data[fieldKey] = getDefaultValue(property);
          }
        });
      });
      
      formData.value = data;
    }
    
    nextTick(() => {
      isInitializing.value = false;
    });
  };

  // Watch for schema changes and reinitialize
  watch(() => props.schema, () => {
    if (!isInitializing.value && !isEmitting.value) {
      initializeFormData();
    }
  }, { immediate: true, deep: true });

  // Remove the problematic modelValue watcher to prevent recursion
  // Instead, handle updates only through initializeFormData when schema changes

  // Simplified form data watcher - only emit on real user changes
  watch(formData, (newValue) => {
    if (isInitializing.value || isEmitting.value) return;
    
    isEmitting.value = true;
    
    // Use setTimeout instead of nextTick to break the cycle more effectively
    setTimeout(() => {
      // Convert flattened structure to nested before emitting
      const nestedValue = isArraySchema() ? newValue : convertFlattenedToNested(newValue as Record<string, any>);
      emit('update:modelValue', nestedValue);
      setTimeout(() => {
        isEmitting.value = false;
      }, 0);
    }, 0);
  }, { deep: true });

  // Helper functions
  const getType = (property: any, fieldKey: string): InputValueType => {
    return mapSchemaTypeToDynamicInput(property) as InputValueType;
  };

  const getFieldLabel = (property: any, fieldKey: string): string => {
    // Use the last part of the dot notation as fallback
    const keyParts = fieldKey.split('.');
    const lastKey = keyParts[keyParts.length - 1];
    return property.title || lastKey;
  };

  const getFieldPlaceholder = (property: any, fieldKey: string): string => {
    return property.description || `Enter ${fieldKey}`;
  };

  const isRequired = (fieldKey: string): boolean => {
    const resolved = getResolvedSchema();
    if (!resolved) return false;

    // Check if the field or any parent field is required
    const keyParts = fieldKey.split('.');
    
    // For array schemas, check the item schema's required fields
    if (resolved.type === 'array' && resolved.items && resolved.items.required) {
      return resolved.items.required.includes(keyParts[0]);
    }
    
    // Check root level required
    if (resolved.required?.includes(keyParts[0])) {
      return true;
    }
    
    // For nested properties, traverse the schema to find the required array
    if (keyParts.length > 1 && resolved.properties) {
      let currentSchema = resolved;
      for (let i = 0; i < keyParts.length - 1; i++) {
        const currentKey = keyParts[i];
        if (currentSchema.properties && currentSchema.properties[currentKey]) {
          currentSchema = currentSchema.properties[currentKey];
        } else {
          return false;
        }
      }
      
      // Check if the final field is required in its immediate parent schema
      const finalKey = keyParts[keyParts.length - 1];
      if (currentSchema.required && currentSchema.required.includes(finalKey)) {
        return true;
      }
    }
    
    return false;
  };

  const mapSchemaTypeToDynamicInput = (property: any): string => {
    // Handle specific formats first
    if (property.format) {
      switch (property.format) {
        case 'base64':
          return InputValueType.BASE64_FILE;
        case 'uri':
          if (property.contentMediaType?.startsWith('image/')) {
            return InputValueType.IMAGE;
          }
          break;
      }
    }
    
    // Handle enum as string with select behavior
    if (property.enum) {
      return InputValueType.STRING;
    }

    // Handle special cases based on field name and structure
    if (property.title === 'Properties' && property.type === 'object') {
      return InputValueType.DICT;
    }
    
    if (property.title === 'Json Schema') {
      // Can be object or string, default to DICT for object-like input
      return InputValueType.DICT;
    }
    
    // Map JSON Schema types to InputValueType
    switch (property.type) {
      case 'string':
        return InputValueType.STRING;
      case 'integer':
        return InputValueType.INTEGER;
      case 'number':
      case 'float':
        return InputValueType.FLOAT;
      case 'boolean':
        return InputValueType.BOOLEAN;
      case 'array':
      case 'list':
        return InputValueType.LIST;
      case 'object':
      case 'dict':
        return InputValueType.DICT;
      // Handle ValueType enum values
      case 'json_schema':
        return InputValueType.JSON_SCHEMA;
      case 'struct':
        return InputValueType.STRUCT;
      case 'base64_file':
        return InputValueType.BASE64_FILE;
      case 'docling_document':
        return InputValueType.DOCLING_DOCUMENT;
      case 'knowledge_base':
        return InputValueType.KNOWLEDGE_BASE;
      case 'tools':
        return InputValueType.TOOLS;
      case 'tool':
        return InputValueType.TOOL;
      case 'workflow':
        return InputValueType.WORKFLOW;
      default:
        return InputValueType.STRING;
    }
  };

  // Handle field updates from nested ObjectGroup components
  const handleFieldUpdate = (fieldKey: string, value: any, itemIndex?: number) => {
    if (isInitializing.value || isEmitting.value) return;
    
    if (isArraySchema()) {
      const arrayData = formData.value as any[];
      const index = itemIndex ?? 0;
      if (arrayData[index]) {
        arrayData[index][fieldKey] = value;
      }
    } else {
      const objectData = formData.value as Record<string, any>;
      objectData[fieldKey] = value;
    }
  };

  // Create Element Plus validation rules based on schema
  const getValidationRules = computed(() => {
    const rules: Record<string, any[]> = {};
    const resolved = getResolvedSchema();
    
    if (!resolved) return rules;
    
    const processSchema = (schema: any, prefix = '') => {
      if (schema.properties) {
        Object.keys(schema.properties).forEach(key => {
          const property = schema.properties[key];
          const fieldKey = prefix ? `${prefix}.${key}` : key;
          const fieldRules: any[] = [];
          
          // Required validation - check the current schema's required array
          if (schema.required && schema.required.includes(key)) {
            fieldRules.push({
              required: true,
              message: `${property.title || key} is required`,
              trigger: ['blur', 'change']
            });
          }
          
          // Type validation
          if (property.type === 'string') {
            fieldRules.push({
              type: 'string',
              message: `${property.title || key} must be a string`,
              trigger: ['blur', 'change']
            });
          } else if (property.type === 'number' || property.type === 'integer') {
            fieldRules.push({
              type: 'number',
              message: `${property.title || key} must be a number`,
              trigger: ['blur', 'change']
            });
          } else if (property.type === 'boolean') {
            fieldRules.push({
              type: 'boolean',
              message: `${property.title || key} must be a boolean`,
              trigger: ['blur', 'change']
            });
          } else if (property.type === 'array') {
            fieldRules.push({
              type: 'array',
              message: `${property.title || key} must be an array`,
              trigger: ['blur', 'change']
            });
          }
          
          // String length validation
          if (property.type === 'string') {
            if (property.minLength !== undefined) {
              fieldRules.push({
                min: property.minLength,
                message: `${property.title || key} must be at least ${property.minLength} characters`,
                trigger: ['blur', 'change']
              });
            }
            if (property.maxLength !== undefined) {
              fieldRules.push({
                max: property.maxLength,
                message: `${property.title || key} must be at most ${property.maxLength} characters`,
                trigger: ['blur', 'change']
              });
            }
          }
          
          // Number range validation
          if (property.type === 'number' || property.type === 'integer') {
            if (property.minimum !== undefined) {
              fieldRules.push({
                type: 'number',
                min: property.minimum,
                message: `${property.title || key} must be at least ${property.minimum}`,
                trigger: ['blur', 'change']
              });
            }
            if (property.maximum !== undefined) {
              fieldRules.push({
                type: 'number',
                max: property.maximum,
                message: `${property.title || key} must be at most ${property.maximum}`,
                trigger: ['blur', 'change']
              });
            }
          }
          
          // Pattern validation
          if (property.pattern) {
            fieldRules.push({
              pattern: new RegExp(property.pattern),
              message: `${property.title || key} format is invalid`,
              trigger: ['blur', 'change']
            });
          }
          
          if (fieldRules.length > 0) {
            rules[fieldKey] = fieldRules;
          }
          
          // Recursively process nested objects
          if (property.type === 'object' && property.properties) {
            processSchema(property, fieldKey);
          }
        });
      }
    };
    
    // Process array items schema
    if (resolved.type === 'array' && resolved.items) {
      processSchema(resolved.items);
    } else {
      // Process object schema
      processSchema(resolved);
    }
    
    return rules;
  });

  // Element Plus form validation method
  const validateForm = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (isArraySchema()) {
        // arrayFormRef.value can be an array of refs (for each item)
        const forms = Array.isArray(arrayFormRef.value) ? arrayFormRef.value : [arrayFormRef.value];
        if (!forms || forms.length === 0) {
          resolve(true);
          return;
        }
        Promise.all(
          forms.map(form =>
            new Promise<boolean>(res => {
              if (!form) {
                res(true);
              } else {
                form.validate((valid: boolean) => res(valid));
              }
            })
          )
        ).then(results => {
          resolve(results.every(valid => valid));
        });
      } else {
        const form = mainFormRef.value;
        if (!form) {
          resolve(true);
          return;
        }
        form.validate((valid: boolean) => {
          resolve(valid);
        });
      }
    });
  };

    // JSON Tab functionality - removed since using direct formData with JsonEditor

  const handleJsonChange = (value: Record<string, any> | any[]) => {
    console.log('JSON Editor changed:', value);
    if (isSyncingFromForm.value) return;
    
    isSyncingFromJson.value = true;
    try {
      // Convert nested structure to flattened for internal form data (if not array)
      const flattenedValue = isArraySchema() ? value : convertNestedToFlattened(value as Record<string, any>);
      formData.value = flattenedValue;
      
      // Emit update to parent with original nested structure
      if (!isEmitting.value) {
        isEmitting.value = true;
        emit('update:modelValue', value);
        nextTick(() => {
          isEmitting.value = false;
        });
      }
    } catch (error) {
      console.error('Error updating form data:', error);
    } finally {
      isSyncingFromJson.value = false;
    }
  };

  // Parse JSON value for the JsonEditor component - not needed anymore
  // const parseJsonValue = (jsonString: string): Record<string, any> | any[] => {
  //   try {
  //     return JSON.parse(jsonString);
  //   } catch (error) {
  //     // Return current form data if JSON is invalid
  //     return formData.value;
  //   }
  // };

  // Removed old watchers since JsonEditor handles form data directly
  // Watch for form data changes to sync with JSON
  // watch(formData, () => {
  //   if (activeTab.value === 'json') {
  //     updateJsonFromForm();
  //   }
  // }, { deep: true });

  // Watch for active tab changes
  // watch(activeTab, (newTab) => {
  //   if (newTab === 'json') {
  //     updateJsonFromForm();
  //   }
  // });

  // Initialize JSON value
  // watch(() => props.modelValue, (newValue) => {
  //   if (!isSyncingFromJson.value) {
  //     updateJsonFromForm();
  //   }
  // }, { immediate: true });

  return {
    formData,
    jsonData,
    getType,
    initializeFormData,
    getFieldLabel,
    getFieldPlaceholder,
    isRequired,
    getDefaultValue,
    mapSchemaTypeToDynamicInput,
    getGroupedProperties,
    getRootProperties,
    getTopLevelGroups,
    handleFieldUpdate,
    isArraySchema,
    getArrayItemSchema,
    resolveSchema,
    getResolvedSchema,
    // Array management
    addArrayItem,
    removeArrayItem,
    getArrayItems,
    // anyOf type selection
    getAnyOfOptions,
    hasAnyOfSelection,
    getSelectedAnyOfType,
    setSelectedAnyOfType,
    selectedAnyOfTypes,
    // Form refs and validation
    mainFormRef,
    arrayFormRef,
    getValidationRules,
    validateForm,
    // Tab functionality
    activeTab,
    handleJsonChange,
  };
};
