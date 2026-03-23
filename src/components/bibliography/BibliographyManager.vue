<template>
    <div :class="fullScreen ? 'h-full flex overflow-hidden' : 'bibliography-manager p-4 h-full flex flex-col gap-3'">

        <!-- ── FULL-SCREEN: two-column layout ── -->
        <template v-if="fullScreen">
            <!-- Left column: list -->
            <div class="w-[44rem] shrink-0 flex flex-col border-r border-border overflow-hidden">
                <!-- Toolbar -->
                <div class="px-4 py-3 border-b border-border flex items-center gap-2 shrink-0">
                    <input v-model="searchQuery" type="text" placeholder="Buscar..."
                        class="flex-1 px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                    <button @click="openCreateForm"
                        class="px-3 py-1.5 text-sm bg-accent text-white rounded hover:opacity-90 shrink-0">
                        + Añadir
                    </button>
                </div>

                <!-- Scope toggle -->
                <div v-if="projectId" class="px-4 py-2 border-b border-border flex gap-1 shrink-0">
                    <button @click="scope = 'all'"
                        :class="scope === 'all' ? 'bg-accent text-white' : 'border border-border hover:bg-surface-hover'"
                        class="px-2 py-1 text-xs rounded">Todas</button>
                    <button @click="scope = 'project'"
                        :class="scope === 'project' ? 'bg-accent text-white' : 'border border-border hover:bg-surface-hover'"
                        class="px-2 py-1 text-xs rounded">Proyecto</button>
                    <button @click="scope = 'global'"
                        :class="scope === 'global' ? 'bg-accent text-white' : 'border border-border hover:bg-surface-hover'"
                        class="px-2 py-1 text-xs rounded">Globales</button>
                </div>

                <!-- Entry list -->
                <div class="flex-1 overflow-y-auto">
                    <div v-if="isLoading" class="flex justify-center py-12">
                        <div class="animate-spin rounded-full h-6 w-6 border-2 border-accent border-t-transparent"></div>
                    </div>
                    <div v-else-if="filteredEntries.length === 0"
                        class="flex flex-col items-center justify-center h-full text-text-muted py-12 px-4 text-center">
                        <svg class="h-10 w-10 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                        <p class="text-sm">No hay entradas bibliográficas.</p>
                        <p class="text-xs mt-1">Usa el botón Añadir o importa un archivo .bib</p>
                    </div>
                    <div v-else>
                        <div v-for="entry in filteredEntries" :key="entry.id"
                            @click="selectEntry(entry)"
                            :class="selectedEntry?.id === entry.id ? 'bg-accent/10 border-l-2 border-accent' : 'hover:bg-surface-hover border-l-2 border-transparent'"
                            class="flex items-start gap-2 px-4 py-3 cursor-pointer transition-colors border-b border-border/50">
                            <div class="flex-1 min-w-0">
                                <div class="text-sm font-medium truncate">{{ entry.title || entry.citeKey || 'Sin título' }}</div>
                                <div class="text-xs text-text-muted mt-0.5 truncate">
                                    {{ formatCreators(entry.creators) }}
                                    <span v-if="entry.year"> · {{ entry.year }}</span>
                                </div>
                                <div class="flex items-center gap-1 mt-1">
                                    <span class="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-muted">{{ entry.entryType }}</span>
                                    <span v-if="!entry.project" class="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">global</span>
                                    <span v-if="entry.project && !projectId" class="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 truncate max-w-[12rem]">{{ entry.project.name }}</span>
                                    <span v-if="entry.sourceResource" class="text-[10px] px-1.5 py-0.5 rounded bg-surface-hover text-text-muted flex items-center gap-0.5">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                            <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                                        </svg>
                                        recurso
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom actions -->
                <div class="px-4 py-3 border-t border-border flex flex-col gap-1.5 shrink-0">
                    <button v-if="importableResources.length > 0"
                        @click="toggleResourceImport"
                        :class="showResourceImport ? 'bg-accent text-white' : 'border border-border hover:bg-surface-hover'"
                        class="w-full px-2 py-1.5 text-xs rounded flex items-center justify-between">
                        <span>Añadir desde recursos</span>
                        <span class="font-medium">{{ importableResources.length }}</span>
                    </button>
                    <div class="flex gap-1.5">
                        <button @click="showImportBibTeX = true"
                            class="flex-1 px-2 py-1.5 text-xs border border-border rounded hover:bg-surface-hover">
                            Importar .bib
                        </button>
                        <button @click="handleExportBibTeX"
                            class="flex-1 px-2 py-1.5 text-xs border border-border rounded hover:bg-surface-hover">
                            Exportar .bib
                        </button>
                    </div>
                </div>
            </div>

            <!-- Right column: detail / form / resources -->
            <div class="flex-1 flex flex-col overflow-hidden">
                <!-- No selection state -->
                <div v-if="!showForm && !selectedEntry && !showResourceImport"
                    class="flex-1 flex flex-col items-center justify-center text-text-muted gap-3">
                    <svg class="h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <p class="text-sm">Selecciona una entrada o crea una nueva</p>
                </div>

                <!-- Entry detail view -->
                <div v-else-if="selectedEntry && !showForm" class="flex-1 overflow-y-auto px-8 py-6">
                    <div>
                        <div class="flex items-start justify-between mb-6">
                            <div>
                                <h2 class="text-xl font-semibold">{{ selectedEntry.title || selectedEntry.citeKey || 'Sin título' }}</h2>
                                <p class="text-sm text-text-muted mt-1">{{ formatCreators(selectedEntry.creators) }}{{ selectedEntry.year ? ` · ${selectedEntry.year}` : '' }}</p>
                            </div>
                            <div class="flex gap-1.5 shrink-0 ml-4 items-center">
                                <!-- Assign to project (shown when entry is global) -->
                                <div v-if="!selectedEntry.project" class="flex items-center gap-1">
                                    <select v-if="showAssignProject"
                                        v-model="assignProjectId"
                                        @change="handleAssignToProject(selectedEntry.id)"
                                        class="px-2 py-1 text-xs border border-border rounded bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-accent">
                                        <option value="" disabled>Seleccionar proyecto...</option>
                                        <option v-for="p in availableProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
                                    </select>
                                    <button @click="showAssignProject = !showAssignProject"
                                        class="px-2 py-1 text-xs border border-border rounded hover:bg-surface-hover text-text-muted">
                                        {{ showAssignProject ? 'Cancelar' : 'Asignar a proyecto' }}
                                    </button>
                                </div>
                                <!-- Make global (shown when entry has a project) -->
                                <button v-if="selectedEntry.project"
                                    @click="handleMakeGlobal(selectedEntry.id)"
                                    class="px-2 py-1 text-xs border border-border rounded hover:bg-surface-hover text-text-muted">
                                    Hacer global
                                </button>
                                <button @click="openEditForm(selectedEntry)"
                                    class="px-2 py-1 text-xs border border-border rounded hover:bg-surface-hover">
                                    Editar
                                </button>
                                <button @click="handleDelete(selectedEntry.id)"
                                    class="px-2 py-1 text-xs border border-red-200 text-red-600 rounded hover:bg-red-50">
                                    Eliminar
                                </button>
                            </div>
                        </div>

                        <dl class="grid grid-cols-3 gap-x-6 gap-y-3 text-sm">
                            <template v-for="[label, value, wide] in entryDetailFields(selectedEntry)" :key="label">
                                <div v-if="value" :class="wide ? 'col-span-3' : ''">
                                    <dt class="text-xs text-text-muted uppercase tracking-wide">{{ label }}</dt>
                                    <dd :class="wide ? 'mt-0.5 truncate' : 'mt-0.5 break-words'" :title="wide ? value : undefined">{{ value }}</dd>
                                </div>
                            </template>
                        </dl>

                        <!-- Source resource link -->
                        <div v-if="selectedEntry.sourceResource" class="mt-4">
                            <router-link
                                :to="`/resource/${selectedEntry.sourceResource.id}`"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded hover:bg-surface-hover text-text-muted hover:text-text-primary transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clip-rule="evenodd" />
                                </svg>
                                Ver recurso: {{ selectedEntry.sourceResource.name }}
                            </router-link>
                        </div>

                        <div v-if="selectedEntry.citeKey" class="mt-4 p-3 bg-surface-hover rounded font-mono text-xs text-text-muted">
                            @{{ selectedEntry.entryType }}{{'{'}}{{ selectedEntry.citeKey }}{{'}'}}
                        </div>
                    </div>
                </div>

                <!-- Entry form -->
                <div v-else-if="showForm" class="flex-1 overflow-y-auto px-8 py-6">
                    <div>
                        <div class="flex items-center justify-between mb-6">
                            <h2 class="text-lg font-semibold">{{ editingEntry ? 'Editar entrada' : 'Nueva entrada' }}</h2>
                            <button @click="closeForm" class="text-text-muted hover:text-text-primary">✕</button>
                        </div>
                        <BibliographyEntryForm
                            :entry="editingEntry"
                            :project-id="scope === 'global' ? null : projectId"
                            @save="handleSave"
                            @cancel="closeForm"
                        />
                    </div>
                </div>

                <!-- Resource import panel -->
                <div v-else-if="showResourceImport" class="flex-1 overflow-hidden flex flex-col">
                    <div class="px-8 py-4 border-b border-border shrink-0">
                        <div class="flex items-center justify-between mb-3">
                            <h2 class="text-lg font-semibold">Añadir desde recursos</h2>
                            <button @click="showResourceImport = false" class="text-text-muted hover:text-text-primary">✕</button>
                        </div>
                        <div class="flex gap-2">
                            <input v-model="resourceSearchQuery" type="text" placeholder="Buscar por título..."
                                class="flex-1 px-3 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent" />
                            <select v-if="!projectId" v-model="resourceProjectFilter"
                                class="px-2 py-1.5 text-sm border border-border rounded bg-surface-elevated focus:outline-none focus:ring-1 focus:ring-accent">
                                <option value="">Todos los proyectos</option>
                                <option v-for="p in resourceProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
                            </select>
                        </div>
                    </div>
                    <div class="flex-1 overflow-y-auto px-8 py-4">
                        <div class="space-y-2">
                            <div v-for="resource in filteredImportableResources" :key="resource.id"
                                class="flex items-center justify-between px-4 py-3 border border-border rounded hover:bg-surface-hover">
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm font-medium truncate">{{ resource.title || resource.name }}</p>
                                    <p class="text-xs text-text-muted mt-0.5">
                                        <span v-if="resource.project && !projectId" class="text-violet-600">{{ resource.project.name }} · </span>
                                        <span v-if="resource.publicationDate">{{ resource.publicationDate.slice(0, 4) }}</span>
                                    </p>
                                </div>
                                <button @click="handleImportResource(resource.id)"
                                    :disabled="importingResourceId === resource.id"
                                    class="ml-4 px-3 py-1.5 text-sm border border-border rounded hover:bg-surface-hover shrink-0 disabled:opacity-50">
                                    {{ importingResourceId === resource.id ? '...' : 'Añadir' }}
                                </button>
                            </div>
                            <div v-if="filteredImportableResources.length === 0" class="text-sm text-text-muted text-center py-8">
                                {{ importableResources.length === 0 ? 'Todos los recursos ya están en la bibliografía.' : 'No hay resultados para los filtros aplicados.' }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </template>

        <!-- ── PANEL MODE: compact vertical layout (for sidebars) ── -->
        <template v-else>
            <div class="flex items-center justify-between">
                <h2 class="font-semibold text-base">Bibliografía</h2>
                <div class="flex gap-1">
                    <button @click="showImportBibTeX = true"
                        class="px-2 py-1 text-xs border border-border rounded hover:bg-surface-hover">
                        Importar .bib
                    </button>
                    <button @click="handleExportBibTeX"
                        class="px-2 py-1 text-xs border border-border rounded hover:bg-surface-hover">
                        Exportar .bib
                    </button>
                    <button @click="openCreateForm"
                        class="px-2 py-1 text-xs bg-accent text-white rounded hover:opacity-90">
                        + Añadir
                    </button>
                </div>
            </div>

            <div v-if="projectId" class="flex gap-1 text-xs">
                <button @click="scope = 'all'"
                    :class="scope === 'all' ? 'bg-accent text-white' : 'border border-border hover:bg-surface-hover'"
                    class="px-2 py-1 rounded">Todas</button>
                <button @click="scope = 'project'"
                    :class="scope === 'project' ? 'bg-accent text-white' : 'border border-border hover:bg-surface-hover'"
                    class="px-2 py-1 rounded">Proyecto</button>
                <button @click="scope = 'global'"
                    :class="scope === 'global' ? 'bg-accent text-white' : 'border border-border hover:bg-surface-hover'"
                    class="px-2 py-1 rounded">Globales</button>
            </div>

            <input v-model="searchQuery" type="text" placeholder="Buscar entradas..."
                class="w-full px-2 py-1.5 text-sm border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent" />

            <div class="flex-1 overflow-y-auto space-y-1 min-h-0">
                <div v-if="isLoading" class="text-sm text-text-muted text-center py-4">Cargando...</div>
                <div v-else-if="filteredEntries.length === 0" class="text-sm text-text-muted text-center py-4">
                    No hay entradas bibliográficas.
                </div>
                <div v-else v-for="entry in filteredEntries" :key="entry.id"
                    class="flex items-start justify-between gap-2 px-2 py-2 border border-border rounded hover:bg-surface-hover group">
                    <div class="flex-1 min-w-0">
                        <div class="text-sm font-medium truncate">{{ entry.title || entry.citeKey || 'Sin título' }}</div>
                        <div class="text-xs text-text-muted">
                            {{ formatCreators(entry.creators) }}
                            <span v-if="entry.year"> · {{ entry.year }}</span>
                            <span class="ml-1 px-1 bg-surface-hover rounded">{{ entry.entryType }}</span>
                            <span v-if="!entry.project" class="ml-1 px-1 bg-blue-100 text-blue-700 rounded">global</span>
                        </div>
                    </div>
                    <div class="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button @click="openEditForm(entry)" class="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-text-primary" title="Editar">
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                                <path d="M15 3L17 5L7 15H5V13L15 3Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </button>
                        <button @click="handleDelete(entry.id)" class="p-1 hover:bg-surface-hover rounded text-text-muted hover:text-red-500" title="Eliminar">
                            <svg width="14" height="14" viewBox="0 0 20 20" fill="none">
                                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            <div v-if="showForm" class="border-t border-border pt-3">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium">{{ editingEntry ? 'Editar entrada' : 'Nueva entrada' }}</span>
                    <button @click="closeForm" class="text-text-muted hover:text-text-primary text-xs">✕</button>
                </div>
                <BibliographyEntryForm
                    :entry="editingEntry"
                    :project-id="scope === 'global' ? null : projectId"
                    @save="handleSave"
                    @cancel="closeForm"
                />
            </div>
        </template>

        <!-- Import BibTeX modal (shared) -->
        <div v-if="showImportBibTeX"
            class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
            @click.self="showImportBibTeX = false">
            <div class="bg-surface-elevated rounded-lg shadow-xl p-4 w-96 max-w-full">
                <div class="flex items-center justify-between mb-3">
                    <h3 class="font-semibold">Importar BibTeX</h3>
                    <button @click="showImportBibTeX = false" class="text-text-muted hover:text-text-primary">✕</button>
                </div>
                <input type="file" accept=".bib" @change="handleBibTeXFileSelect" class="w-full text-sm" />
                <div class="flex justify-end gap-2 mt-3">
                    <button @click="showImportBibTeX = false"
                        class="px-3 py-1.5 text-sm border border-border rounded hover:bg-surface-hover">
                        Cancelar
                    </button>
                    <button @click="handleImportBibTeX" :disabled="!bibTeXFileContent"
                        class="px-3 py-1.5 text-sm bg-accent text-white rounded hover:opacity-90 disabled:opacity-50">
                        Importar
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import BibliographyEntryForm from './BibliographyEntryForm.vue';
import { useBibliography } from '../../services/bibliography/useBibliography';
import { useResourceList } from '../../services/resources/useResourceList';
import apiClient from '../../services/api';
import type { BibliographyEntry, ZoteroCreator } from '../../types/Bibliography';

const props = defineProps<{
    projectId?: number | null;
    fullScreen?: boolean;
}>();

const {
    entries,
    isLoading,
    loadAll,
    loadByProject,
    loadGlobal,
    createEntry,
    updateEntry,
    deleteEntry,
    importFromResource,
    importBibTeX,
    exportBibTeX,
} = useBibliography();

const { loadResourcesByProject } = useResourceList();

const scope = ref<'all' | 'project' | 'global'>('all');
const searchQuery = ref('');
const showForm = ref(false);
const editingEntry = ref<BibliographyEntry | null>(null);
const selectedEntry = ref<BibliographyEntry | null>(null);
const showImportBibTeX = ref(false);
const showResourceImport = ref(false);
const bibTeXFileContent = ref('');
const projectResources = ref<any[]>([]);
const resourceSearchQuery = ref('');
const resourceProjectFilter = ref<number | ''>('');
const importingResourceId = ref<number | null>(null);
const showAssignProject = ref(false);
const assignProjectId = ref<number | ''>('');
const availableProjects = ref<{ id: number; name: string }[]>();

const importedSourceIds = computed(() =>
    entries.value.filter((e) => e.sourceResource).map((e) => e.sourceResource!.id)
);

const importableResources = computed(() =>
    projectResources.value.filter((r) => !importedSourceIds.value.includes(r.id))
);

const resourceProjects = computed(() => {
    const seen = new Map<number, string>();
    for (const r of importableResources.value) {
        if (r.project) seen.set(r.project.id, r.project.name);
    }
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
});

const filteredImportableResources = computed(() => {
    let list = importableResources.value;
    if (resourceProjectFilter.value !== '') {
        list = list.filter((r) => r.project?.id === resourceProjectFilter.value);
    }
    if (resourceSearchQuery.value.trim()) {
        const q = resourceSearchQuery.value.toLowerCase();
        list = list.filter((r) => (r.title || r.name || '').toLowerCase().includes(q));
    }
    return list;
});

const filteredEntries = computed(() => {
    let list = entries.value;
    if (scope.value === 'project') list = list.filter((e) => !!e.project);
    if (scope.value === 'global') list = list.filter((e) => !e.project);
    if (searchQuery.value) {
        const q = searchQuery.value.toLowerCase();
        list = list.filter((e) =>
            e.title?.toLowerCase().includes(q) ||
            e.citeKey?.toLowerCase().includes(q) ||
            e.creators?.some((c) => `${c.lastName ?? ''} ${c.firstName ?? ''} ${c.name ?? ''}`.toLowerCase().includes(q))
        );
    }
    return list;
});

const creatorDisplayName = (c: ZoteroCreator): string => {
    if (c.name) return c.name;
    if (c.firstName) return `${c.lastName}, ${c.firstName}`;
    return c.lastName ?? '';
};

const formatCreators = (creators: ZoteroCreator[] | null): string => {
    const authors = (creators ?? []).filter((c) => c.creatorType === 'author');
    if (authors.length === 0) return '';
    if (authors.length === 1) return creatorDisplayName(authors[0]);
    if (authors.length === 2) return `${creatorDisplayName(authors[0])} & ${creatorDisplayName(authors[1])}`;
    return creatorDisplayName(authors[0]) + ' et al.';
};

const entryDetailFields = (e: BibliographyEntry): [string, string | null, boolean?][] => {
    const creatorsStr = (e.creators ?? []).map((c) => `${creatorDisplayName(c)} (${c.creatorType})`).join('; ') || null;
    return [
        ['Tipo', e.entryType],
        ['Clave BibTeX', e.citeKey],
        ['Creadores', creatorsStr],
        ['Año', e.year],
        ['Resumen', e.abstract, true],
        ['Revista', e.journal],
        ['Abreviatura', e.journalAbbreviation],
        ['Libro/Congreso', e.booktitle],
        ['Congreso', e.conferenceName],
        ['Volumen', e.volume],
        ['Número', e.number],
        ['Páginas', e.pages],
        ['Editorial', e.publisher],
        ['Lugar', e.place],
        ['Edición', e.edition],
        ['Serie', e.series],
        ['ISSN', e.issn],
        ['ISBN', e.isbn],
        ['DOI', e.doi, true],
        ['URL', e.url, true],
        ['Fecha de acceso', e.accessDate],
        ['Universidad', e.university],
        ['Institución', e.institution],
        ['Tipo de tesis', e.thesisType],
        ['Idioma', e.language],
        ['Nota', e.note],
    ];
};

const loadEntries = async () => {
    if (props.projectId) {
        await loadByProject(props.projectId);
    } else {
        await loadAll();
    }
};

const loadResources = async () => {
    try {
        if (props.projectId) {
            projectResources.value = (await loadResourcesByProject(String(props.projectId))) || [];
        } else {
            const response = await apiClient.get('/resources');
            projectResources.value = response.data || [];
        }
    } catch {
        projectResources.value = [];
    }
};

onMounted(() => {
    loadEntries();
    loadResources();
    loadProjects();
});

watch(() => props.projectId, () => {
    loadEntries();
    loadResources();
});

const selectEntry = (entry: BibliographyEntry) => {
    selectedEntry.value = entry;
    showForm.value = false;
    showResourceImport.value = false;
    showAssignProject.value = false;
    assignProjectId.value = '';
};


const openCreateForm = () => {
    editingEntry.value = null;
    selectedEntry.value = null;
    showResourceImport.value = false;
    showForm.value = true;
};

const toggleResourceImport = () => {
    showResourceImport.value = !showResourceImport.value;
    if (showResourceImport.value) {
        showForm.value = false;
        selectedEntry.value = null;
    }
};

const openEditForm = (entry: BibliographyEntry) => {
    editingEntry.value = entry;
    showForm.value = true;
    showResourceImport.value = false;
};

const closeForm = () => {
    showForm.value = false;
    editingEntry.value = null;
};

const handleSave = async (data: Partial<BibliographyEntry>) => {
    if (editingEntry.value) {
        const updated = await updateEntry(editingEntry.value.id, data);
        selectedEntry.value = updated;
    } else {
        const created = await createEntry(data);
        selectedEntry.value = created;
    }
    closeForm();
    await loadEntries();
};

const handleDelete = async (id: number) => {
    await deleteEntry(id);
    selectedEntry.value = null;
    await loadEntries();
};

const handleMakeGlobal = async (id: number) => {
    await apiClient.patch(`/bibliography/${id}/make-global`);
    await loadEntries();
    selectedEntry.value = entries.value.find((e) => e.id === id) ?? null;
};

const handleAssignToProject = async (id: number) => {
    if (!assignProjectId.value) return;
    await apiClient.patch(`/bibliography/${id}/assign-project`, { projectId: assignProjectId.value });
    showAssignProject.value = false;
    assignProjectId.value = '';
    await loadEntries();
    selectedEntry.value = entries.value.find((e) => e.id === id) ?? null;
};

const loadProjects = async () => {
    try {
        const response = await apiClient.get('/projects');
        availableProjects.value = response.data.map((p: any) => ({ id: p.id, name: p.name }));
    } catch {
        availableProjects.value = [];
    }
};

const handleImportResource = async (resourceId: number) => {
    importingResourceId.value = resourceId;
    try {
        const created = await importFromResource(resourceId, props.projectId ?? undefined);
        await loadEntries();
        await loadResources();
        if (props.fullScreen) {
            selectedEntry.value = created;
            showResourceImport.value = false;
        }
    } finally {
        importingResourceId.value = null;
    }
};

const handleBibTeXFileSelect = (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => { bibTeXFileContent.value = (e.target?.result as string) ?? ''; };
    reader.readAsText(file);
};

const handleImportBibTeX = async () => {
    if (!bibTeXFileContent.value) return;
    await importBibTeX(bibTeXFileContent.value, props.projectId ?? undefined);
    showImportBibTeX.value = false;
    bibTeXFileContent.value = '';
    await loadEntries();
};

const handleExportBibTeX = async () => {
    const content = await exportBibTeX(props.projectId ?? undefined);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bibliography.bib';
    a.click();
    URL.revokeObjectURL(url);
};
</script>
