<template>
    <Teleport to="body">
        <Transition name="modal" appear>
            <div v-if="modelValue" class="modal-overlay" v-on="$attrs"
                @click="closeOnBackdrop ? $emit('update:modelValue', false) : null">
                <div class="modal-container" :class="{ 'modal-wide': wide }" @click.stop>
                    <div class="modal-header">
                        <h3 class="modal-title">{{ title }}</h3>
                        <button class="modal-close" @click="$emit('update:modelValue', false)">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24"
                                stroke="currentColor" stroke-width="1.75">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    <div class="modal-body">
                        <slot></slot>
                    </div>
                    <div class="modal-footer" v-if="$slots.footer">
                        <slot name="footer"></slot>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
defineProps({
    modelValue: {
        type: Boolean,
        required: true
    },
    title: {
        type: String,
        default: ''
    },
    closeOnBackdrop: {
        type: Boolean,
        default: true
    },
    wide: {
        type: Boolean,
        default: false
    }
});

defineEmits(['update:modelValue']);
</script>

<style scoped>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
}

.modal-container {
    background-color: var(--color-surface-elevated);
    border-radius: 1rem;
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.03),
        0 24px 48px -12px rgba(0, 0, 0, 0.15);
    width: 90%;
    max-width: 480px;
    max-height: 85vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.modal-container.modal-wide {
    max-width: 1280px;
    max-height: 90vh;
}

.modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-border-light);
}

.modal-title {
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-text-primary);
    letter-spacing: -0.01em;
}

.modal-close {
    background: transparent;
    border: none;
    cursor: pointer;
    color: var(--color-text-muted);
    padding: 0.375rem;
    border-radius: 0.5rem;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal-close:hover {
    background-color: var(--color-surface-hover);
    color: var(--color-text-secondary);
}

.modal-body {
    padding: 1.5rem;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
}

.modal-body > * {
    min-height: 0;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--color-border-light);
}

/* Transitions */
.modal-enter-active {
    transition: opacity 0.25s ease;
}
.modal-leave-active {
    transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}

.modal-enter-active .modal-container {
    animation: modal-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-leave-active .modal-container {
    animation: modal-out 0.15s ease-in forwards;
}

@keyframes modal-in {
    from {
        opacity: 0;
        transform: scale(0.96) translateY(8px);
    }
    to {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
}

@keyframes modal-out {
    from {
        opacity: 1;
        transform: scale(1) translateY(0);
    }
    to {
        opacity: 0;
        transform: scale(0.97) translateY(4px);
    }
}
</style>
