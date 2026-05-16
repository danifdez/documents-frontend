<template>
    <div class="composer-bar px-4 pt-4 pb-3">
        <div class="flex items-end gap-2">
            <textarea
                ref="textareaRef"
                v-model="text"
                :placeholder="placeholder || 'Message the assistant…'"
                rows="3"
                :disabled="disabled"
                class="flex-1 resize-none rounded-xl border-2 border-slate-300 dark:border-slate-700 bg-surface-elevated px-4 py-3 text-sm leading-relaxed text-text-primary shadow-md placeholder:text-text-muted focus:outline-none focus:ring-4 focus:ring-accent/25 focus:border-accent transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                @keydown="handleKeydown" />
            <VoiceCaptureButton
                mode="standalone"
                :disabled="disabled"
                @transcribed="onDictation"
                @state-change="onDictationState"
            />
            <button
                @click="send"
                :disabled="!canSend"
                class="btn-primary !px-5 !py-3.5 shrink-0">
                Send
            </button>
        </div>
        <p class="mt-2 text-[11px] text-text-muted select-none">
            Enter to send · Shift+Enter for a new line
        </p>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import VoiceCaptureButton from '../voice/VoiceCaptureButton.vue';
import { useDictationInsert } from '../../composables/useDictationInsert';

const props = defineProps<{
    disabled?: boolean;
    placeholder?: string;
}>();

const emit = defineEmits<{
    (e: 'send', text: string): void;
}>();

const text = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);

const canSend = computed(() => !props.disabled && text.value.trim().length > 0);

// Dictation: when VoiceCaptureButton emits 'transcribed', we replace the
// dictated zone in the textarea (it is never auto-sent — premise of the
// change: Whisper can mishear words and auto-send would be fragile).
const dictation = useDictationInsert(textareaRef, text);

function onDictationState(state: string) {
    console.log('[composer/dictation] state →', state, 'anchorBefore=', (textareaRef.value as any)?.selectionStart);
    if (state === 'recording') dictation.beginDictation();
    else if (state === 'idle' || state === 'error') dictation.endDictation();
}

function onDictation(partial: string, isFinal: boolean) {
    console.log('[composer/dictation] partial received', { partial, isFinal, currentText: text.value, aborted: dictation.aborted.value });
    dictation.applyPartial(partial);
    console.log('[composer/dictation] after applyPartial, text=', text.value);
}

function send() {
    if (!canSend.value) return;
    const value = text.value.trim();
    text.value = '';
    emit('send', value);
}

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
    }
}

defineExpose({
    focus() {
        textareaRef.value?.focus();
    },
});
</script>

<style scoped>
.composer-bar {
    background-color: var(--color-surface-hover);
    border-top: 1px solid var(--color-border);
    box-shadow: 0 -8px 20px -12px rgba(15, 23, 42, 0.08);
}
:global(html.dark) .composer-bar {
    box-shadow: 0 -8px 20px -12px rgba(0, 0, 0, 0.5);
}
</style>
