<template>
    <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" :class="statusClass">
            <span class="w-1.5 h-1.5 rounded-full" :class="dotClass"></span>
            {{ statusLabel }}
        </span>
        <span v-if="dataSource.lastSyncAt" class="text-[10px] text-text-muted">
            {{ formatDate(dataSource.lastSyncAt) }}
        </span>
        <span v-if="dataSource.lastSyncRecordCount != null" class="text-[10px] text-text-muted">
            ({{ dataSource.lastSyncRecordCount }} records)
        </span>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { DataSource } from '../../services/data-sources/useDataSources';

const props = defineProps<{
    dataSource: DataSource;
}>();

const statusClass = computed(() => {
    switch (props.dataSource.lastSyncStatus) {
        case 'success': return 'bg-green-50 text-green-700';
        case 'failed': return 'bg-red-50 text-red-700';
        case 'running': return 'bg-blue-50 text-blue-700';
        default: return 'bg-gray-50 text-gray-500';
    }
});

const dotClass = computed(() => {
    switch (props.dataSource.lastSyncStatus) {
        case 'success': return 'bg-green-500';
        case 'failed': return 'bg-red-500';
        case 'running': return 'bg-blue-500 animate-pulse';
        default: return 'bg-gray-400';
    }
});

const statusLabel = computed(() => {
    switch (props.dataSource.lastSyncStatus) {
        case 'success': return 'Synced';
        case 'failed': return 'Failed';
        case 'running': return 'Syncing...';
        default: return 'Not synced';
    }
});

const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
};
</script>
