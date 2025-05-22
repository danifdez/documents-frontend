<template>
    <router-link :to="to"
        class="bg-white rounded-lg shadow hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200 cursor-pointer">
        <div class="p-4">
            <h4 v-if="title" class="font-semibold text-lg mb-2 truncate">{{ title }}</h4>

            <p v-if="description" class="text-gray-600 text-sm mb-3 line-clamp-2">
                {{ description }}
            </p>
            <p v-else class="text-gray-400 text-sm mb-3 italic">
                No description
            </p>

            <slot></slot>
        </div>
    </router-link>
</template>

<script setup>
defineProps({
    title: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    to: {
        type: String,
        default: ''
    },
});
</script>