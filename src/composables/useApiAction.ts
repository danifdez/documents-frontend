import { ref } from 'vue';

export function useApiAction<T = any>() {
  const data = ref<T | null>(null) as { value: T | null };
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  async function execute(fn: () => Promise<T>): Promise<T | null> {
    isLoading.value = true;
    error.value = null;
    try {
      const result = await fn();
      data.value = result;
      return result;
    } catch (err: unknown) {
      const e = err as any;
      error.value = e?.response?.data?.message || e?.message || 'Unknown error';
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  function reset() {
    data.value = null;
    isLoading.value = false;
    error.value = null;
  }

  return { data, isLoading, error, execute, reset };
}
