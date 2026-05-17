import { computed } from 'vue';

export function useFolderPicker() {
  const isAvailable = computed(
    () => typeof window !== 'undefined' && typeof window.folderScope?.pick === 'function',
  );

  async function pick(opts?: { title?: string }): Promise<string | null> {
    if (!isAvailable.value) return null;
    return await window.folderScope!.pick(opts);
  }

  return { isAvailable, pick };
}
