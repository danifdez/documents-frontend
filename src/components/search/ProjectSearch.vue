<template>
    <div class="relative w-64">
        <input type="text" v-model="searchValue" @keyup.enter="onSearch" placeholder="Search projects..."
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    }
});

const emit = defineEmits(['update:modelValue', 'search']);
const searchValue = ref(props.modelValue);

watch(() => props.modelValue, (newVal) => {
    searchValue.value = newVal;
});

watch(() => searchValue.value, (newVal) => {
    emit('update:modelValue', newVal);
});

const onSearch = () => {
    emit('search', searchValue.value);
};
</script>