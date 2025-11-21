<template>
    <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div class="bg-white bg-opacity-95 backdrop-blur-sm rounded-lg shadow-xl max-w-md w-full mx-4">
            <!-- Header -->
            <div class="px-6 py-4 border-b border-gray-200">
                <h3 class="text-lg font-semibold text-gray-900">{{ title }}</h3>
            </div>

            <!-- Body -->
            <div class="px-6 py-4">
                <p class="text-sm text-gray-700">{{ message }}</p>
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
                <Button @click="handleCancel" variant="secondary">
                    {{ cancelText }}
                </Button>
                <Button @click="handleConfirm" :variant="confirmVariant">
                    {{ confirmText }}
                </Button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import Button from './Button.vue';

interface Props {
    isOpen: boolean;
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    confirmVariant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'info';
}

interface Emits {
    (e: 'confirm'): void;
    (e: 'cancel'): void;
}

const props = withDefaults(defineProps<Props>(), {
    title: 'Confirm Action',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    confirmVariant: 'primary'
});

const emit = defineEmits<Emits>();

const handleConfirm = () => {
    emit('confirm');
};

const handleCancel = () => {
    emit('cancel');
};
</script>
