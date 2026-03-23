import { ref } from 'vue';

/**
 * Composable for editing an ordered list of strings (key points, keywords, etc.)
 * Supports add, remove, reorder, and inline editing.
 */
export function useListEditor(initialItems: string[] = []) {
  const items = ref<string[]>([...initialItems]);

  function setItems(newItems: string[]) {
    items.value = [...newItems];
  }

  function addItem(value: string = '') {
    items.value.push(value);
  }

  function removeItem(index: number) {
    items.value.splice(index, 1);
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    const temp = items.value[index];
    items.value[index] = items.value[index - 1];
    items.value[index - 1] = temp;
  }

  function moveDown(index: number) {
    if (index >= items.value.length - 1) return;
    const temp = items.value[index];
    items.value[index] = items.value[index + 1];
    items.value[index + 1] = temp;
  }

  function handleBackspace(index: number, event: KeyboardEvent) {
    if (items.value[index] === '' && items.value.length > 0) {
      event.preventDefault();
      removeItem(index);
    }
  }

  return { items, setItems, addItem, removeItem, moveUp, moveDown, handleBackspace };
}
