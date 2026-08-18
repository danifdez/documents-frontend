export function useAutoSave(saveFn: () => void | Promise<void>, debounceMs: number = 800) {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  function trigger() {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      saveFn();
    }, debounceMs);
  }

  function flush() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      saveFn();
    }
  }

  function cancel() {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
  }

  // Pending saves intentionally survive unmount: callers rely on the last
  // debounced save still firing after navigation.
  return { trigger, flush, cancel };
}
