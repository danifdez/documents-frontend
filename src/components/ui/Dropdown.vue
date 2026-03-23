<template>
    <div class="relative inline-block text-left" ref="dropdownRef">
        <div @click="toggleDropdown">
            <slot name="trigger">
                <Button v-if="!showDots">
                    {{ label }}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 ml-1.5" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor" stroke-width="1.75">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                </Button>
                <button v-else aria-label="More options"
                    class="p-2 rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-all duration-200 cursor-pointer">
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                            d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
                    </svg>
                </button>
            </slot>
        </div>

        <Transition name="dropdown">
            <div v-show="isOpen"
                class="origin-top-right absolute right-0 mt-2 w-48 rounded-xl shadow-lg shadow-black/8 bg-surface-elevated border border-border overflow-hidden z-10"
                :class="menuClassName" role="menu" aria-orientation="vertical" aria-labelledby="menu-button"
                tabindex="-1">
                <div class="py-1" role="none">
                    <slot></slot>
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import Button from './Button.vue';

const props = defineProps({
    label: {
        type: String,
        default: 'Options'
    },
    showDots: {
        type: Boolean,
        default: false
    },
    dotsClassName: {
        type: String,
        default: ''
    },
    menuClassName: {
        type: String,
        default: ''
    }
});

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const toggleDropdown = () => {
    isOpen.value = !isOpen.value;
};

const closeDropdown = (event: MouseEvent) => {
    if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
        isOpen.value = false;
    }
};

onMounted(() => {
    document.addEventListener('click', closeDropdown);
});

onUnmounted(() => {
    document.removeEventListener('click', closeDropdown);
});
</script>

<style scoped>
.dropdown-enter-active {
    transition: all 0.15s cubic-bezier(0.16, 1, 0.3, 1);
}

.dropdown-leave-active {
    transition: all 0.1s ease-in;
}

.dropdown-enter-from {
    opacity: 0;
    transform: scale(0.95) translateY(-4px);
}

.dropdown-leave-to {
    opacity: 0;
    transform: scale(0.97);
}
</style>
