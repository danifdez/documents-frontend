<template>
    <div v-if="isVisible" class="fixed inset-0 flex items-start justify-center z-50 pointer-events-none">
        <div class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border p-5 w-96 max-w-full mt-[15vh] pointer-events-auto">
            <h3 class="text-base font-semibold text-text-primary mb-3">Add Comment</h3>

            <div class="selected-text text-sm mb-3" v-if="selectedText">
                <div class="text-xs font-medium text-text-muted mb-1">Selected text:</div>
                <div class="italic bg-surface text-text-secondary p-2.5 rounded-lg text-sm leading-relaxed border border-border-light">"{{ selectedText }}"</div>
            </div>

            <textarea v-model="commentText"
                class="w-full bg-surface border border-border rounded-lg px-3.5 py-2.5 mb-4 h-28 resize-none text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                placeholder="Write your comment..." ref="commentTextarea"></textarea>

            <div class="flex justify-end gap-2">
                <Button @click="cancel" variant="secondary">
                    Cancel
                </Button>
                <Button @click="save" variant="info" :disabled="isLoading || !commentText.trim()">
                    {{ isLoading ? 'Saving...' : 'Save' }}
                </Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, defineProps, defineEmits, nextTick, watch } from 'vue';
import Button from '../ui/Button.vue';

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
