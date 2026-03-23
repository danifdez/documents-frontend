<template>
    <Teleport to="body">
        <Transition name="confirm">
            <div v-if="isOpen"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                <div
                    class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-md w-full mx-4 overflow-hidden">
                    <!-- Header -->
                    <div class="px-6 py-4 border-b border-border-light">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">{{ title }}</h3>
                    </div>

                    <!-- Body -->
                    <div class="px-6 py-5">
                        <p class="text-sm text-text-secondary leading-relaxed">{{ message }}</p>
                    </div>

                    <!-- Footer -->
                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                        <Button @click="handleCancel" variant="secondary">
                            {{ cancelText }}
                        </Button>
                        <Button @click="handleConfirm" :variant="confirmVariant">
                            {{ confirmText }}
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
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

<style scoped>
.confirm-enter-active {
    transition: opacity 0.2s ease;
}

.confirm-leave-active {
    transition: opacity 0.15s ease;
}

.confirm-enter-from,
.confirm-leave-to {
    opacity: 0;
}
</style>
