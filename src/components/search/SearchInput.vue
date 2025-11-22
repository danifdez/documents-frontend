<template>
    <div v-if="show" class="fixed inset-0 z-50 flex items-start justify-center bg-black/60" @mousedown.self="close">
        <input ref="inputRef" type="text" v-model="searchValue" :placeholder="placeholder"
            class="mt-4 px-6 py-4 text-2xl border border-gray-300 rounded-md shadow-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white z-50 w-[40rem]" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
    show: {
        type: Boolean,
        default: false
    },
    placeholder: {
        type: String,
        default: 'Search...'
    },
});
const emit = defineEmits(['search', 'close']);

const searchValue = ref('');
const inputRef = ref<HTMLInputElement | null>(null);


let debounceTimeout: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_DELAY = 300; // ms

function close() {
    emit('close');
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
            setTimeout(() => {
                inputRef.value?.focus();
            }, 0);
        }
    }
);
</script>