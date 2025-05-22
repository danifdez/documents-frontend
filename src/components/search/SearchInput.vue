<template>
    <div class="relative" :class="widthClass">
        <input type="text" v-model="searchValue" @keyup.enter="onSearch" :placeholder="placeholder"
            class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
    </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';

const props = defineProps({
    modelValue: {
        type: String,
        default: ''
    },
    placeholder: {
        type: String,
        default: 'Search...'
    },
    width: {
        type: String,
        default: 'md' // sm, md, lg, full
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

const widthClass = computed(() => {
    switch (props.width) {
        case 'sm':
            return 'w-32';
        case 'md':
            return 'w-64';
        case 'lg':
            return 'w-96';
        case 'full':
            return 'w-full';
        default:
            return 'w-64';
    }
});
</script>