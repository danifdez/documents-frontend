<template>
    <div v-if="show"
        class="chat-sidebar fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-50 flex flex-col">
        <div class="flex items-center justify-between p-4 border-b">
            <span class="font-semibold text-lg">Ask</span>
            <button @click="$emit('close')" class="text-gray-500 hover:text-gray-700">&times;</button>
        </div>
        <div class="flex-1 overflow-y-auto p-4 space-y-2">
            <div v-for="(msg, idx) in localMessages" :key="idx"
                :class="msg.role === 'user' ? 'text-right' : 'text-left'">
                <div :class="msg.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'"
                    class="inline-block px-3 py-2 rounded-lg max-w-xs">
                    {{ msg.text }}
                </div>
            </div>
        </div>
        <form @submit.prevent="sendMessage" class="p-4 border-t flex gap-2">
            <input v-model="input" type="text" placeholder="Type your question..."
                class="flex-1 border rounded px-3 py-2 focus:outline-none" :disabled="isLoading" />
            <button type="submit" class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                :disabled="isLoading">
                <span v-if="isLoading" class="loader mr-2"></span>
                <span v-else>Send</span>
            </button>
        </form>
    </div>
</template>

<script setup lang="ts">
import { useAsk } from '../../services/ask/useAsk';
import { ref, defineProps, defineEmits } from 'vue';

const { ask, isLoading } = useAsk();
const props = defineProps({
    show: Boolean,
    messages: {
        type: Array as () => { role: 'user' | 'assistant'; text: string }[],
        required: true
    }
});
const emit = defineEmits(['send', 'close']);
const input = ref('');
const localMessages = ref([...props.messages]);

async function sendMessage() {
    if (input.value.trim()) {
        const userMsg = { role: 'user', text: input.value };
        localMessages.value.push(userMsg);
        emit('send', input.value);
        const question = input.value;
        input.value = '';
        const response = await ask(question);
        localMessages.value.push({
            role: 'assistant',
            text: response || 'No response from assistant.'
        });
    }
}
</script>

<style scoped>
.chat-sidebar {
    min-width: 320px;
    max-width: 100vw;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.04);
}

.loader {
    border: 2px solid #f3f3f3;
    border-top: 2px solid #3498db;
    border-radius: 50%;
    width: 16px;
    height: 16px;
    animation: spin 1s linear infinite;
    display: inline-block;
    vertical-align: middle;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>
