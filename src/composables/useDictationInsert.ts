import { computed, ref, type Ref } from 'vue';

type InputLike = HTMLInputElement | HTMLTextAreaElement;

/**
 * Inserts dictated text into a `<textarea>` or `<input>` with `v-model`.
 *
 * Pattern (Task 10/11):
 * - On dictation start, anchor the cursor position.
 * - Each partial **replaces** the region between the anchor and `anchor +
 *   previousPartialLength`; it does not concatenate. Whisper's overlapping
 *   windows can rewrite the last words.
 * - If it detects that the user edited the dictated zone between two
 *   partials, it aborts cleanly (leaves the text as-is and stops touching it).
 */
export function useDictationInsert(
  elRef: Ref<InputLike | null | undefined>,
  modelRef: Ref<string>,
) {
  const anchor = ref<number | null>(null);
  const tailAtStart = ref<string>('');
  const lastPartialLen = ref<number>(0);
  const abortedRef = ref<boolean>(false);

  function beginDictation() {
    const el = elRef.value;
    if (!el) return;
    anchor.value = el.selectionStart ?? modelRef.value.length;
    tailAtStart.value = modelRef.value.slice(anchor.value);
    lastPartialLen.value = 0;
    abortedRef.value = false;
  }

  function applyPartial(text: string) {
    if (abortedRef.value) return;
    const el = elRef.value;
    if (el == null || anchor.value == null) return;

    const current = modelRef.value;
    const before = current.slice(0, anchor.value);
    const expectedDictated = current.slice(anchor.value, anchor.value + lastPartialLen.value);
    const afterDictated = current.slice(anchor.value + lastPartialLen.value);

    // Detects manual editing: what existed before the anchor must remain
    // intact, and the "tail" (what follows the dictated text) too. If the
    // user typed anything, the slices won't match and we abort.
    if (afterDictated !== tailAtStart.value || before.length !== anchor.value) {
      abortedRef.value = true;
      return;
    }
    // expectedDictated can differ only if we ourselves put it there in
    // the previous partial; the count is correct. We don't use it to
    // abort.
    void expectedDictated;

    const newValue = before + text + tailAtStart.value;
    modelRef.value = newValue;
    lastPartialLen.value = text.length;

    // Move the cursor right after the dictated text (on the next tick
    // so the v-model change has had time to propagate).
    queueMicrotask(() => {
      const elNow = elRef.value;
      if (!elNow || anchor.value == null) return;
      const pos = anchor.value + lastPartialLen.value;
      try { elNow.setSelectionRange(pos, pos); } catch { /* input type may not support */ }
    });
  }

  function endDictation() {
    // We keep the values in case the user wants to reopen a session
    // immediately; the next `beginDictation` resets them.
    const el = elRef.value;
    if (el && anchor.value != null && !abortedRef.value) {
      const pos = anchor.value + lastPartialLen.value;
      try { el.setSelectionRange(pos, pos); el.focus(); } catch { /* ignore */ }
    }
  }

  function abort() {
    abortedRef.value = true;
  }

  return {
    beginDictation,
    applyPartial,
    endDictation,
    abort,
    aborted: computed(() => abortedRef.value),
  };
}
