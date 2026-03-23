<template>
    <div class="space-y-4">
        <div v-if="summary">
            <details open class="card shadow">
                <summary class="cursor-pointer font-semibold text-text-primary">Summary</summary>
                <div class="mt-2 prose max-w-none" v-html="summary"></div>
            </details>
        </div>

        <div v-if="keyPoints && keyPoints.length">
            <details open class="card shadow">
                <summary class="cursor-pointer font-semibold text-text-primary">Key Points</summary>
                <div class="mt-2">
                    <ul class="list-disc list-inside space-y-2">
                        <li v-for="(kp, idx) in keyPoints" :key="idx"
                            class="text-sm text-text-secondary">{{ kp }}</li>
                    </ul>
                </div>
            </details>
        </div>

        <div v-if="keywords && keywords.length">
            <details open class="card shadow">
                <summary class="cursor-pointer font-semibold text-text-primary">Keywords</summary>
                <div class="mt-2">
                    <ul class="flex flex-wrap gap-2">
                        <li v-for="(kw, idx) in keywords" :key="idx">
                            <Badge variant="muted">{{ kw }}</Badge>
                        </li>
                    </ul>
                </div>
            </details>
        </div>

        <EmptyState v-if="!summary && (!keyPoints || !keyPoints.length) && (!keywords || !keywords.length)"
            icon="document" title="No overview data yet"
            description="Use the toolbar to generate a summary, key points, or keywords" />
    </div>
</template>

<script setup lang="ts">
import Badge from '../ui/Badge.vue';
import EmptyState from '../ui/EmptyState.vue';

defineProps<{
    summary?: string | null;
    keyPoints?: string[] | null;
    keywords?: string[] | null;
}>();
</script>
