import { ref, reactive } from "vue";

// Reactive store for individual object states
const objectStates = reactive<Record<string, boolean>>({});

export const useSchemaObject = (entityId?: string) => {
  // Use entity ID or generate a default key
  const objectKey = entityId || "root";

  // Initialize state if not exists
  if (!(objectKey in objectStates)) {
    objectStates[objectKey] = true; // Default to expanded
  }

  // Create a ref that syncs with the store
  const isExpanded = ref<boolean>(objectStates[objectKey]);

  // Methods
  function toggleExpand() {
    objectStates[objectKey] = !objectStates[objectKey];
    isExpanded.value = objectStates[objectKey];
  }

  return {
    // State
    isExpanded,

    // Methods
    toggleExpand,
  } as const;
};
