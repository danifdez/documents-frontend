<template>
    <div class="h-full flex flex-col overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 border-b border-border shrink-0">
            <Breadcrumb :items="breadcrumbItems" />
            <div class="flex items-center justify-between mt-2">
                <div>
                    <h1 class="text-2xl font-semibold text-text-primary tracking-tight">Bibliography</h1>
                    <p class="mt-0.5 text-sm text-text-muted">
                        {{ projectId ? 'Project bibliography and references' : 'Global bibliography — shared across all projects' }}
                    </p>
                </div>
            </div>
        </div>

        <!-- Full-screen manager -->
        <div class="flex-1 min-h-0">
            <BibliographyManager :project-id="projectId" full-screen />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import BibliographyManager from '../components/bibliography/BibliographyManager.vue';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import apiClient from '../services/api';

const route = useRoute();
const projectId = computed(() => {
    const id = route.params.id;
    return id ? Number(id) : null;
});

const projectName = ref('');

onMounted(async () => {
    if (projectId.value) {
        try {
            const res = await apiClient.get(`/projects/${projectId.value}`);
            projectName.value = res.data.name;
        } catch { }
    }
});

const breadcrumbItems = computed(() => {
    if (projectId.value) {
        return [
            { name: projectName.value || 'Project', path: `/project/${projectId.value}` },
            { name: 'Bibliography' },
        ];
    }
    return [{ name: 'Bibliography' }];
});
</script>
