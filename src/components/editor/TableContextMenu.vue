<template>
    <div v-show="show" class="absolute bg-white shadow-md rounded border border-gray-200 py-2 z-10 w-48"
        :style="{ top: position.y + 'px', left: position.x + 'px' }">
        <Button @click="addColumn('before')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"></path>
                <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"></path>
                <path d="M12 8v8"></path>
                <path d="M8 12h8"></path>
            </svg>
            Insert Column Before
        </Button>
        <Button @click="addColumn('after')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M8 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h3"></path>
                <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3"></path>
                <path d="M12 8v8"></path>
                <path d="M8 12h8"></path>
            </svg>
            Insert Column After
        </Button>
        <div class="border-t border-gray-200 my-1"></div>
        <Button @click="addRow('before')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 8h18"></path>
                <path d="M3 16h18"></path>
                <path d="M8 3v18"></path>
                <path d="M12 12h-4v-4h4"></path>
            </svg>
            Insert Row Before
        </Button>
        <Button @click="addRow('after')">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 8h18"></path>
                <path d="M3 16h18"></path>
                <path d="M8 3v18"></path>
                <path d="M12 12h-4v4h4"></path>
            </svg>
            Insert Row After
        </Button>
    </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits } from 'vue';
import Button from '../ui/Button.vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    position: {
        type: Object,
        default: () => ({ x: 0, y: 0 })
    },
    currentTableCell: {
        type: Object,
        default: null
    }
});

const emit = defineEmits(['add-column', 'add-row', 'close']);

const addColumn = (position: 'before' | 'after'): void => {
    emit('add-column', position);
};

const addRow = (position: 'before' | 'after'): void => {
    emit('add-row', position);
};
</script>
