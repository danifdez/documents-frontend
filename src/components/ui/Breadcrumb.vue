<template>
    <nav aria-label="Breadcrumb" class="mb-4 px-4 py-2">
        <ol class="flex flex-wrap items-center text-sm text-gray-600">
            <li class="flex items-center">
                <Link :to="'/'" class="!p-0 !border-0 hover:text-gray-900">Dashboard</Link>
            </li>
            <li v-for="(item, index) in items" :key="index" class="flex items-center">
                <svg class="mx-2 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                </svg>
                <Link v-if="item.path && index < items.length - 1" :to="item.path"
                    class="!p-0 !border-0 hover:text-gray-900">
                {{ item.name }}
                </Link>
                <span v-else class="font-medium text-gray-800">{{ item.name }}</span>
            </li>
        </ol>
    </nav>
</template>

<script setup lang="ts">
import Link from './Link.vue';

interface BreadcrumbItem {
    name: string;
    path?: string;
}

defineProps<{
    items: BreadcrumbItem[];
}>();
</script>