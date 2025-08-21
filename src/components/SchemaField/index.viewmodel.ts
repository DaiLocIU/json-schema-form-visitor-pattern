import { ref, watch } from 'vue';

import type { SchemaEntity,SchemaType } from '../JSONSchemaBuilder/index.viewmodel';

export interface TypeOption {
  label: string;
  value: SchemaType;
}

export const useSchemaField = () => {
  // State
  const showAdvanced = ref(false);

  // Type options for select dropdown
  const typeOptions: TypeOption[] = [
    { label: 'String', value: 'String' },
    { label: 'Integer', value: 'Integer' },
    { label: 'Number', value: 'Number' },
    { label: 'Boolean', value: 'Boolean' },
    { label: 'Null', value: 'Null' },
    { label: 'Object', value: 'Object' },
    { label: 'Array', value: 'Array' }
  ];

  // Helper function to create new entities
  function newEntity(type: SchemaType, key = '', parent = '', required = false): SchemaEntity {
    const base: SchemaEntity = {
      _key: key,
      _description: '',
      _type: [type],
      _required: required,
      _properties: [],
      _items: [],
      _parent: parent,
      _default: '',
      _enum: '',
      __ID__: Math.random().toString(36).slice(2)
    };
    
    switch (type) {
      case 'Object':
        return { ...base, _properties: [] };
      case 'Array':
        return { 
          ...base, 
          _items: [newEntity('String', '', parent + '[0]')], 
          _minItems: undefined, 
          _maxItems: undefined, 
          _uniqueItems: false 
        };
      case 'String':
        return { 
          ...base, 
          _minLength: 0, 
          _maxLength: undefined, 
          _pattern: '', 
          _format: '' 
        };
      case 'Integer':
      case 'Number':
        return { 
          ...base, 
          _minimum: undefined, 
          _maximum: undefined, 
          _multipleOf: undefined, 
          _format: '' 
        };
      default:
        return base;
    }
  }

  // Function to get type-specific colors
  function getTypeColor(type: SchemaType): string {
    const colors: Record<SchemaType, string> = {
      'String': '#409EFF', // Changed from light green to blue for better visibility
      'Integer': '#E6A23C',
      'Number': '#E6A23C',
      'Boolean': '#F56C6C',
      'Null': '#909399',
      'Object': '#67C23A', // Changed from blue to green
      'Array': '#9C27B0'
    };
    return colors[type] || '#909399';
  }

  // Setup type change watcher for a field
  function setupTypeWatcher(field: SchemaEntity) {
    return watch(() => field._type[0], (newType, oldType) => {
      if (newType !== oldType) {
        // Initialize _properties for Object type
        if (newType === 'Object' && (!field._properties || field._properties.length === 0)) {
          field._properties = [];
        }
        
        // Initialize _items for Array type
        if (newType === 'Array' && (!field._items || field._items.length === 0)) {
          field._items = [newEntity('String', '', field._key + '[0]')];
        }
      }
    });
  }

  // Toggle advanced configuration visibility
  function toggleAdvanced(): void {
    showAdvanced.value = !showAdvanced.value;
  }

  return {
    // State
    showAdvanced,
    typeOptions,
    
    // Methods
    newEntity,
    getTypeColor,
    setupTypeWatcher,
    toggleAdvanced
  } as const;
};
