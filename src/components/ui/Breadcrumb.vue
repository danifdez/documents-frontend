<template>
    <nav v-if="items.length > 0" aria-label="Breadcrumb" class="mb-4">
        <ol class="flex flex-wrap items-center text-sm text-text-muted">
            <li class="flex items-center">
                <Link :to="'/'" class="!p-0 !border-0 hover:text-text-primary transition-colors">Dashboard</Link>
            </li>
            <li v-for="(item, index) in items" :key="index" class="flex items-center">
                <svg class="mx-2 h-3.5 w-3.5 text-text-muted/50" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd"
                        d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                        clip-rule="evenodd" />
                </svg>
                <Link v-if="item.path && index < items.length - 1" :to="item.path"
                    class="!p-0 !border-0 hover:text-text-primary transition-colors inline-flex items-center gap-1.5">
                    <BreadcrumbIcon v-if="item.icon" :type="item.icon" />
                    {{ item.name }}
                </Link>
                <span v-else class="font-medium text-text-primary inline-flex items-center gap-1.5">
                    <BreadcrumbIcon v-if="item.icon" :type="item.icon" />
                    {{ item.name }}
                </span>
            </li>
        </ol>
    </nav>
</template>

<script setup lang="ts">
import Link from './Link.vue';
import BreadcrumbIcon from './BreadcrumbIcon.vue';

interface BreadcrumbItem {
    name: string;
    path?: string;
    icon?: string;
}

defineProps<{
    items: BreadcrumbItem[];
}>();
</script>
