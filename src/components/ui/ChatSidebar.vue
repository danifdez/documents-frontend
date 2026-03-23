<template>
    <Teleport to="body">
        <Transition name="chat-overlay">
            <div v-if="show" class="fixed inset-0 z-50 flex justify-end" @click.self="$emit('close')">
                <Transition name="chat-panel" appear>
                    <div v-if="show"
                        class="h-full w-[420px] max-w-full bg-surface-elevated border-l border-border flex flex-col shadow-2xl shadow-black/10">

                        <!-- Header -->
                        <div class="flex items-center justify-between px-5 py-4 border-b border-border-light">
                            <div class="flex items-center gap-3">
                                <div
                                    class="w-8 h-8 rounded-lg bg-accent-subtle flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-accent" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 class="text-sm font-semibold text-text-primary">Ask AI</h2>
                                    <p class="text-[11px] text-text-muted">Ask questions about this resource</p>
                                </div>
                            </div>
                            <button @click="$emit('close')"
                                class="p-1.5 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                                    stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <!-- Messages -->
                        <div ref="messagesContainer" class="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                            <!-- Empty state -->
                            <div v-if="localMessages.length === 0"
                                class="flex flex-col items-center justify-center h-full text-center py-12">
                                <div class="w-12 h-12 rounded-2xl bg-accent-subtle flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-accent" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                    </svg>
                                </div>
                                <p class="text-sm font-medium text-text-primary mb-1">Ask anything</p>
                                <p class="text-xs text-text-muted max-w-[240px] leading-relaxed">
                                    Ask questions about the content of this resource and get AI-powered answers
                                </p>
                            </div>

                            <!-- Message bubbles -->
                            <div v-for="(msg, idx) in localMessages" :key="idx"
                                :class="msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'">
                                <div :class="[
                                    'max-w-[85%] px-4 py-2.5 text-sm leading-relaxed',
                                    msg.role === 'user'
                                        ? 'bg-accent text-white rounded-2xl rounded-br-md'
                                        : 'bg-surface border border-border text-text-primary rounded-2xl rounded-bl-md'
                                ]">
                                    {{ msg.text }}
                                </div>
                            </div>

                            <!-- Loading indicator -->
                            <div v-if="isLoading" class="flex justify-start">
                                <div
                                    class="bg-surface border border-border rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-2">
                                    <div class="flex gap-1">
                                        <span class="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
                                            style="animation-delay: 0ms"></span>
                                        <span class="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
                                            style="animation-delay: 150ms"></span>
                                        <span class="w-1.5 h-1.5 bg-text-muted rounded-full animate-bounce"
                                            style="animation-delay: 300ms"></span>
                                    </div>
                                    <span class="text-xs text-text-muted ml-1">Thinking...</span>
                                </div>
                            </div>
                        </div>

                        <!-- Input -->
                        <div class="border-t border-border-light px-4 py-3">
                            <form @submit.prevent="sendMessage" class="flex items-end gap-2">
                                <div class="flex-1 relative">
                                    <input v-model="input" type="text" placeholder="Ask a question..."
                                        class="w-full px-4 py-2.5 bg-surface border border-border rounded-xl text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all pr-10"
                                        :disabled="isLoading" @keydown.escape="$emit('close')" ref="chatInput" />
                                </div>
                                <button type="submit" :disabled="isLoading || !input.trim()"
                                    class="p-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0">
                                    <svg v-if="!isLoading" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none"
                                        viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round"
                                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    <div v-else
                                        class="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin">
                                    </div>
                                </button>
                            </form>
                            <div class="flex items-center justify-center mt-2">
                                <span class="text-[10px] text-text-muted">
                                    <kbd
                                        class="px-1 py-0.5 bg-surface rounded text-[10px] font-medium border border-border">Enter</kbd>
                                    to send &middot;
                                    <kbd
                                        class="px-1 py-0.5 bg-surface rounded text-[10px] font-medium border border-border">Esc</kbd>
                                    to close
                                </span>
                            </div>
                        </div>
                    </div>
                </Transition>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { useAsk } from '../../services/ask/useAsk';
import { getSocket } from '../../services/notifications/notification';
import { ref, defineProps, defineEmits, onMounted, onUnmounted, watch, nextTick } from 'vue';

const { ask, isLoading } = useAsk();
const props = defineProps({
    show: Boolean,
    messages: {
        type: Array as () => { role: 'user' | 'assistant'; text: string }[],
        required: true
    },
    projectId: {
        type: Number,
        default: undefined
    }
});
const emit = defineEmits(['send', 'close']);
const input = ref('');
const localMessages = ref([...props.messages]);
const messagesContainer = ref<HTMLElement | null>(null);
const chatInput = ref<HTMLInputElement | null>(null);

const scrollToBottom = () => {
    nextTick(() => {
        if (messagesContainer.value) {
            messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
    });
};

async function sendMessage() {
    if (input.value.trim()) {
        const userMsg = { role: 'user' as const, text: input.value };
        localMessages.value.push(userMsg);
        emit('send', input.value);
        const question = input.value;
        input.value = '';
        scrollToBottom();
        await ask(question, props.projectId);
    }
}

watch(() => props.show, (val) => {
    if (val) {
        nextTick(() => {
            chatInput.value?.focus();
        });
    }
});

watch(() => localMessages.value.length, () => {
    scrollToBottom();
});

const onAskResponse = (data: any) => {
    localMessages.value.push({
        role: 'assistant',
        text: data.response || 'No response from assistant.'
    });
    scrollToBottom();
};

onMounted(() => {
    getSocket().on('askResponse', onAskResponse);
});

onUnmounted(() => {
    getSocket().off('askResponse', onAskResponse);
});
</script>

<style scoped>
.chat-overlay-enter-active,
.chat-overlay-leave-active {
    transition: opacity 0.2s ease;
}

.chat-overlay-enter-from,
.chat-overlay-leave-to {
    opacity: 0;
}

.chat-panel-enter-active {
    transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.chat-panel-leave-active {
    transition: transform 0.2s ease-in;
}

.chat-panel-enter-from {
    transform: translateX(100%);
}

.chat-panel-leave-to {
    transform: translateX(100%);
}
</style>
