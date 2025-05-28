<template>
    <div v-if="isVisible" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-5 w-96 max-w-full">
            <h3 class="text-lg font-medium mb-3">Add Comment</h3>

            <textarea v-model="commentText"
                class="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 h-32 resize-none focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your comment here..." ref="commentTextarea"></textarea>

            <div class="selected-text text-sm text-gray-500 mb-4" v-if="selectedText">
                <div class="font-medium mb-1">Selected text:</div>
                <div class="italic bg-gray-100 p-2 rounded">"{{ selectedText }}"</div>
            </div>

            <div class="flex justify-end gap-2">
                <button @click="cancel"
                    class="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50">
                    Cancel
                </button>
                <button @click="save" class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    :disabled="isLoading || !commentText.trim()">
                    {{ isLoading ? 'Saving...' : 'Save' }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, nextTick, watch } from 'vue';

const props = defineProps({
    isVisible: {
        type: Boolean,
        default: false
    },
    selectedText: {
        type: String,
        default: ''
    },
    isLoading: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['save', 'cancel']);

const commentText = ref('');
const commentTextarea = ref(null);

const save = () => {
    if (commentText.value.trim()) {
        emit('save', commentText.value);
        commentText.value = '';
    }
};

const cancel = () => {
    commentText.value = '';
    emit('cancel');
};

watch(() => props.isVisible, (newValue) => {
    if (newValue) {
        nextTick(() => {
            if (commentTextarea.value) {
                commentTextarea.value.focus();
            }
        });
    } else {
        commentText.value = '';
    }
});
</script>
