<template>
    <ConfirmModal :is-open="isOpen" title="Unfavorite this agent?"
        message="This agent will be deleted in 1 day if you don't favorite it again or send it a message."
        confirm-text="OK, unfavorite" cancel-text="Cancel" confirm-variant="warning"
        @confirm="handleConfirm" @cancel="handleCancel" />
</template>

<script setup lang="ts">
import ConfirmModal from '../ui/ConfirmModal.vue';

defineProps<{
    isOpen: boolean;
}>();

const emit = defineEmits<{
    (e: 'confirm'): void;
    (e: 'cancel'): void;
}>();

function handleConfirm() {
    emit('confirm');
}
function handleCancel() {
    emit('cancel');
}
</script>
