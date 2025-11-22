<template>
    <div v-if="show" class="fixed inset-0 z-50 flex items-start justify-center bg-black/60" @mousedown.self="close">
        <input ref="inputRef" type="text" v-model="searchValue" :placeholder="placeholder"
            class="mt-4 px-6 py-4 text-2xl border border-gray-300 rounded-md shadow-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white z-50 w-[40rem]"
            @keyup.enter.prevent="onEnter" @keyup.esc.prevent="onEscape" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, onBeforeUnmount } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        default: 'Search...'
    },
    value: {
        type: String,
        default: ''
    }
});
const emit = defineEmits(['search', 'close']);

const searchValue = ref('');
let openValue: string | null = null;
const inputRef = ref<HTMLInputElement | null>(null);


let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 300; // ms

function close() {
    emit('close');
}

function onEnter() {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
        debounceTimeout = null;
    }

    emit('search', searchValue.value);
    close();
}

function onEscape() {
    close();
}

watch(searchValue, () => {
    if (debounceTimeout) clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
        emit('search', searchValue.value);
    }, DEBOUNCE_DELAY);
});

watch(
    () => props.show,
    (val) => {
        if (val) {
            // set initial value to the provided value and focus
            searchValue.value = props.value ?? '';
            openValue = props.value ?? '';
            setTimeout(() => {
                inputRef.value?.focus();
            }, 0);
        } else {
            openValue = null;
        }
    }
);

// reflect external changes to the value prop (e.g. parent clearing filter)
watch(
    () => props.value,
    (val) => {
        searchValue.value = val ?? '';
    }
);

function globalKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape' || e.key === 'Esc') {
        onEscape();
    }
}

watch(
    () => props.show,
    (val) => {
        if (val) {
            window.addEventListener('keydown', globalKeyDown);
        } else {
            window.removeEventListener('keydown', globalKeyDown);
        }
    }
);

onBeforeUnmount(() => {
    window.removeEventListener('keydown', globalKeyDown);
});
</script>