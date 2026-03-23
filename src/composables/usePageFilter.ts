import { ref, computed, type Ref } from 'vue';

export function usePageFilter<T extends Record<string, any>>(
  items: Ref<T[]>,
  fields: (keyof T)[],
) {
  const searchQuery = ref('');

  const filteredItems = computed(() => {
    const query = searchQuery.value.toLowerCase().trim();
    if (!query) return items.value;

    return items.value.filter((item) =>
      fields.some((field) => {
        const val = item[field];
        if (val == null) return false;
        return String(val).toLowerCase().includes(query);
      }),
    );
  });

  const filterActive = computed(() => searchQuery.value.trim().length > 0);

  function clearFilter() {
    searchQuery.value = '';
  }

  return { searchQuery, filteredItems, filterActive, clearFilter };
}
