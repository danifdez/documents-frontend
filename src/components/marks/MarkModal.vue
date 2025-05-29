<template>
    <Modal v-model="showModal" title="Add Text Mark">
        <div class="p-4">
            <div class="mb-4">
                <p class="font-medium mb-2">Selected Text:</p>
                <div class="bg-gray-100 p-2 rounded border border-gray-300">
                    {{ selectedText }}
                </div>
            </div>
            <div class="flex justify-end pt-2">
                <Button type="button" variant="secondary" @click="handleCancel" class="mr-2">
                    Cancel
                </Button>
                <Button type="button" @click="handleSave" :disabled="isLoading">
                    {{ isLoading ? 'Adding...' : 'Add Mark' }}
                </Button>
            </div>
        </div>
    </Modal>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue';
import Modal from '../ui/Modal/Modal.vue';
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

const showModal = computed({
    get: () => props.isVisible,
    set: () => emit('cancel')
});

const handleCancel = () => {
    emit('cancel');
};

const handleSave = () => {
    emit('save');
};
</script>
