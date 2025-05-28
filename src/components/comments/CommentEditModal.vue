<template>
    <div v-if="show" class="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
        <div class="bg-white rounded-lg shadow-xl p-5 w-96 max-w-full">
            <h3 class="text-lg font-medium mb-3">Edit Comment</h3>

            <textarea v-model="commentText"
                class="w-full border border-gray-300 rounded-md px-3 py-2 mb-4 h-32 resize-none focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your comment here..." ref="commentTextarea"></textarea>

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
    show: {
        type: Boolean,
        default: false
    },
    comment: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['update:show', 'save', 'cancel']);

const commentText = ref('');
const commentTextarea = ref(null);
const isLoading = ref(false);

const save = () => {
    if (commentText.value.trim()) {
        isLoading.value = true;
        emit('save', commentText.value);
        isLoading.value = false;
    }
};

const cancel = () => {
    emit('cancel');
    emit('update:show', false);
};

watch(() => props.show, (newValue) => {
    if (newValue && props.comment) {
        commentText.value = props.comment.content || '';
        nextTick(() => {
            if (commentTextarea.value) {
                commentTextarea.value.focus();
            }
        });
    }
});
</script>
