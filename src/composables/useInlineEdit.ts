import { ref } from 'vue';

export function useInlineEdit<T = string>(
  getValue: () => T,
  onSave: (value: T) => void | Promise<void>,
) {
  const isEditing = ref(false);
  const editValue = ref<T>(getValue()) as { value: T };

  function startEdit() {
    editValue.value = getValue();
    isEditing.value = true;
  }

  async function saveEdit() {
    if (!isEditing.value) return;
    isEditing.value = false;
    await onSave(editValue.value);
  }

  function cancelEdit() {
    isEditing.value = false;
    editValue.value = getValue();
  }

  return { isEditing, editValue, startEdit, saveEdit, cancelEdit };
}
