<template>
    <div class="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900 cursor-pointer"
        :class="className" role="menuitem" tabindex="-1" @click="$emit('click', $event)">
        <slot></slot>
    </div>
</template>

<script setup lang="ts">
defineProps({
    className: {
        type: String,
        default: ''
    }
});

defineEmits(['click']);
</script>