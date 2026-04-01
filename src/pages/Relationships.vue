<template>
    <div class="h-full flex flex-col overflow-hidden">
        <div class="px-6 py-4 shrink-0">
            <!-- Header -->
            <PageHeader title="Relationships" subtitle="Manage entities and explore their relationships" :breadcrumbs="breadcrumbItems">
                <template #actions>
                    <!-- View toggle -->
                    <div class="flex gap-1">
                        <button @click="relViewMode = 'graph'" :class="relViewMode === 'graph' ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary'" class="px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer">
                            Graph
                        </button>
                        <button @click="relViewMode = 'table'" :class="relViewMode === 'table' ? 'bg-accent text-white' : 'bg-surface-elevated text-text-secondary'" class="px-3 py-1.5 rounded text-xs font-medium transition-colors cursor-pointer">
                            Table
                        </button>
                    </div>
                    <button @click="refreshRelationships" :disabled="relLoading" class="px-3 py-1.5 rounded text-xs font-medium bg-surface-elevated text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 cursor-pointer">
                        Refresh
                    </button>
                </template>
            </PageHeader>

            <!-- Filters -->
            <div class="flex flex-wrap items-center gap-3">
                <!-- Project selector (hidden when navigated from a project) -->
                <div v-if="!projectFromRoute" class="flex items-center gap-2">
                    <label class="text-xs text-text-secondary">Project:</label>
                    <select v-model="relSelectedProjectId" class="px-2 py-1 rounded border border-border bg-surface text-sm min-w-[180px]">
                        <option :value="0">All projects</option>
                        <option v-for="p in allProjects" :key="p.id" :value="p.id">{{ p.name }}</option>
                    </select>
                </div>
                <!-- Resource filter -->
                <div v-if="relSelectedProjectId" class="flex items-center gap-2">
                    <label class="text-xs text-text-secondary">Resource:</label>
                    <select v-model="relSelectedResourceId" class="px-2 py-1 rounded border border-border bg-surface text-sm min-w-[160px]">
                        <option :value="0">All resources</option>
                        <option v-for="r in relResources" :key="r.id" :value="r.id">{{ r.name }}</option>
                    </select>
                </div>
                <!-- Entity type filter -->
                <div class="flex items-center gap-2">
                    <label class="text-xs text-text-secondary">Entity type:</label>
                    <select v-model="relSelectedEntityType" class="px-2 py-1 rounded border border-border bg-surface text-sm">
                        <option value="">All types</option>
                        <option v-for="t in relEntityTypes" :key="t" :value="t">{{ t }}</option>
                    </select>
                </div>
                <!-- Predicate filter -->
                <div class="flex items-center gap-2">
                    <label class="text-xs text-text-secondary">Predicate:</label>
                    <select v-model="relSelectedPredicate" class="px-2 py-1 rounded border border-border bg-surface text-sm">
                        <option value="">All predicates</option>
                        <option v-for="p in relPredicates" :key="p" :value="p">{{ p }}</option>
                    </select>
                </div>
                <div v-if="relData.relationships.length > 0" class="text-xs text-text-muted">
                    {{ relFilteredRelationships.length }} relationships, {{ relFilteredEntities.length }} entities
                </div>
            </div>
        </div>

        <!-- ==================== MAIN CONTENT: RELATIONSHIPS LEFT + ENTITIES RIGHT ==================== -->
        <div class="flex-1 min-h-0 px-6 pb-4 flex gap-4 overflow-hidden">

            <!-- LEFT: Relationships (graph or table) -->
            <div class="flex-1 min-w-0 flex flex-col">
                <!-- Loading -->
                <div v-if="relLoading" class="flex-1 flex items-center justify-center">
                    <div class="text-sm text-text-muted">Loading relationships...</div>
                </div>

                <!-- Empty -->
                <div v-else-if="relData.relationships.length === 0" class="flex-1 flex items-center justify-center rounded-lg border border-border">
                    <div class="text-sm text-text-muted">No relationships found</div>
                </div>

                <!-- Graph view -->
                <div v-else-if="relViewMode === 'graph'" class="flex-1 min-h-0 rounded-lg border border-border overflow-hidden relative">
                    <canvas ref="canvasRef" class="w-full h-full cursor-grab active:cursor-grabbing"
                        @wheel.prevent="onWheel" @mousedown="onMouseDown" @mousemove="onMouseMove" @mouseup="onMouseUp" @mouseleave="onMouseLeave" @dblclick="onDblClick" />
                    <div class="absolute bottom-3 right-3 flex flex-col gap-1">
                        <button @click="zoomIn" class="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary text-sm font-bold cursor-pointer">+</button>
                        <button @click="zoomOut" class="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary text-sm font-bold cursor-pointer">-</button>
                        <button @click="zoomToFit" class="w-7 h-7 rounded bg-surface-elevated border border-border flex items-center justify-center text-text-secondary hover:text-text-primary cursor-pointer" title="Fit">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                        </button>
                    </div>
                    <div class="absolute bottom-3 left-3 text-[10px] text-text-muted">{{ Math.round(zoom * 100) }}%</div>
                </div>

                <!-- Table view -->
                <div v-else class="flex-1 min-h-0 overflow-y-auto rounded-lg border border-border">
                    <table class="w-full text-sm">
                        <thead class="sticky top-0 bg-surface">
                            <tr class="border-b border-border">
                                <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Subject</th>
                                <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Relationship</th>
                                <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Object</th>
                                <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Confidence</th>
                                <th class="text-left px-4 py-2.5 text-text-secondary font-medium">Resource</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="(rel, idx) in relFilteredRelationships" :key="idx" class="border-b border-border hover:bg-surface-elevated transition-colors">
                                <td class="px-4 py-2">
                                    <span class="inline-flex items-center gap-1.5">
                                        <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: getRelEntityColor(getRelEntityType(rel.source)) }"></span>
                                        {{ getRelEntityName(rel.source) }}
                                    </span>
                                </td>
                                <td class="px-4 py-2">
                                    <span class="px-2 py-0.5 rounded bg-surface-elevated text-xs font-mono">{{ rel.predicate }}</span>
                                </td>
                                <td class="px-4 py-2">
                                    <span class="inline-flex items-center gap-1.5">
                                        <span class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: getRelEntityColor(getRelEntityType(rel.target)) }"></span>
                                        {{ getRelEntityName(rel.target) }}
                                    </span>
                                </td>
                                <td class="px-4 py-2 text-text-muted">{{ Math.round((rel.confidence || 0) * 100) }}%</td>
                                <td class="px-4 py-2 text-text-muted">
                                    <router-link v-if="rel.resource_id" :to="`/resource/${rel.resource_id}`" class="text-accent hover:underline">
                                        {{ getRelResourceName(rel.resource_id) }}
                                    </router-link>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- RIGHT: Entities panel -->
            <div class="w-80 shrink-0 flex flex-col border border-border rounded-xl bg-surface-elevated overflow-hidden">
                <!-- Panel header -->
                <div class="px-3 py-2.5 border-b border-border bg-surface flex items-center justify-between shrink-0">
                    <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">Entities <span class="font-normal">({{ filteredEntities.length }})</span></span>
                    <div class="flex items-center gap-1">
                        <button v-if="checkedEntityIds.size > 0" @click="clearChecked"
                            class="px-1.5 py-0.5 rounded text-[10px] text-text-muted hover:text-text-primary bg-surface-elevated border border-border-light hover:border-border transition-colors cursor-pointer"
                            title="Clear selection">
                            Clear ({{ checkedEntityIds.size }})
                        </button>
                        <button @click="openCreateModal"
                            class="p-1 rounded text-text-muted hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                            title="New Entity">
                            <svg class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clip-rule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Search -->
                <div class="px-3 py-2 border-b border-border-light shrink-0">
                    <input v-model="searchTerm" type="text" placeholder="Search entities..."
                        class="w-full px-2.5 py-1.5 rounded border border-border bg-surface text-xs focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent" />
                </div>

                <!-- Type filter chips -->
                <div class="px-3 py-2 border-b border-border-light flex flex-wrap gap-1 shrink-0">
                    <button @click="selectedType = null"
                        class="px-2 py-0.5 text-[10px] font-medium rounded-full transition-all cursor-pointer"
                        :class="selectedType === null ? 'bg-accent text-white' : 'bg-surface text-text-muted border border-border-light'">
                        All
                    </button>
                    <button v-for="typeInfo in entityTypesWithCounts" :key="typeInfo.name"
                        @click="selectedType = typeInfo.name"
                        class="px-2 py-0.5 text-[10px] font-medium rounded-full transition-all cursor-pointer"
                        :class="selectedType === typeInfo.name
                            ? getTypeChipActiveClass(typeInfo.name)
                            : 'bg-surface text-text-muted border border-border-light'">
                        {{ typeInfo.name }} <span class="opacity-60">{{ typeInfo.count }}</span>
                    </button>
                </div>

                <!-- Loading -->
                <div v-if="loading" class="flex-1 flex items-center justify-center">
                    <LoadingSpinner size="sm" />
                </div>

                <!-- Entity list -->
                <div v-else class="flex-1 overflow-y-auto divide-y divide-border-light">
                    <div v-for="entity in filteredEntities" :key="entity.id">
                        <div class="group px-3 py-2 hover:bg-surface-hover transition-colors cursor-pointer"
                            :class="activeEntityIds && !activeEntityIds.has(entity.id) ? 'opacity-20' : activeEntityIds?.has(entity.id) ? 'bg-accent-subtle/30' : ''"
                            @click="toggleExpand(entity)">
                            <div class="flex items-center gap-2">
                                <input type="checkbox" :checked="checkedEntityIds.has(entity.id)"
                                    @click.stop="toggleChecked(entity.id)"
                                    class="h-3 w-3 rounded border-border text-accent shrink-0 cursor-pointer" />
                                <span class="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider shrink-0"
                                    :class="getEntityTypeBadgeClass(entity.entityType?.name)">
                                    {{ entity.entityType?.name || '—' }}
                                </span>
                                <span class="text-xs font-medium text-text-primary truncate flex-1">{{ entity.name }}</span>
                                <!-- Actions -->
                                <div class="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" @click.stop>
                                    <button @click="startEditing(entity)" class="p-1 rounded text-text-muted hover:text-accent transition-colors cursor-pointer" title="Edit">
                                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button @click="openMergeModal(entity)" class="p-1 rounded text-text-muted hover:text-amber-600 transition-colors cursor-pointer" title="Merge">
                                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                        </svg>
                                    </button>
                                    <button @click="confirmDelete(entity)" class="p-1 rounded text-text-muted hover:text-red-500 transition-colors cursor-pointer" title="Delete">
                                        <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <p v-if="entity.description" class="text-[11px] text-text-muted truncate mt-0.5 pl-0.5">{{ entity.description }}</p>

                            <!-- Expanded detail -->
                            <div v-if="expandedId === entity.id" class="mt-2 pt-2 border-t border-border-light" @click.stop>
                                <div v-if="loadingDetail" class="flex items-center gap-1.5 py-1">
                                    <LoadingSpinner size="sm" />
                                    <span class="text-[10px] text-text-muted">Loading...</span>
                                </div>
                                <div v-else-if="expandedDetail" class="space-y-1.5">
                                    <div v-if="expandedDetail.resources && expandedDetail.resources.length > 0">
                                        <span class="text-[10px] font-semibold text-text-muted uppercase">Resources ({{ expandedDetail.resources.length }})</span>
                                        <button v-for="resource in expandedDetail.resources" :key="resource.id"
                                            @click="navigateToResource(resource.id)"
                                            class="block w-full text-left text-[11px] text-accent hover:underline truncate">
                                            {{ resource.name }}
                                        </button>
                                    </div>
                                    <div v-if="expandedDetail.projects && expandedDetail.projects.length > 0">
                                        <span class="text-[10px] font-semibold text-text-muted uppercase">Projects ({{ expandedDetail.projects.length }})</span>
                                        <button v-for="project in expandedDetail.projects" :key="project.id"
                                            @click="navigateToProject(project.id)"
                                            class="block w-full text-left text-[11px] text-accent hover:underline truncate">
                                            {{ project.name }}
                                        </button>
                                    </div>
                                    <p v-if="(!expandedDetail.resources || expandedDetail.resources.length === 0) && (!expandedDetail.projects || expandedDetail.projects.length === 0)"
                                        class="text-[10px] text-text-muted">Not linked to any resources</p>
                                </div>
                            </div>
                        </div>

                    </div>
                    <div v-if="!loading && filteredEntities.length === 0" class="px-3 py-6 text-center text-xs text-text-muted">
                        {{ entities.length === 0 ? 'No entities yet' : 'No entities match your search' }}
                    </div>
                </div>
            </div>
        </div>

        <!-- ==================== MODALS ==================== -->

        <!-- Edit Entity Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="editingId !== null"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-lg w-full mx-4 overflow-hidden">
                        <div class="px-6 py-4 border-b border-border-light">
                            <h3 class="text-base font-semibold text-text-primary tracking-tight">Edit Entity</h3>
                        </div>
                        <div class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
                            <!-- Name & Type -->
                            <div class="grid grid-cols-2 gap-3">
                                <div>
                                    <label class="block text-xs font-medium text-text-secondary mb-1.5">Name *</label>
                                    <input v-model="editForm.name" type="text"
                                        class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                        placeholder="Entity name" />
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-text-secondary mb-1.5">Type *</label>
                                    <select v-model="editForm.entityTypeId"
                                        class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                        <option v-for="et in entityTypes" :key="et.id" :value="et.id">{{ et.name }}</option>
                                    </select>
                                </div>
                            </div>
                            <!-- Description -->
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Description</label>
                                <textarea v-model="editForm.description" rows="2"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                                    placeholder="Optional description"></textarea>
                            </div>
                            <!-- Global -->
                            <label class="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" v-model="editForm.global" class="h-3.5 w-3.5 rounded border-border text-accent" />
                                <span class="text-sm text-text-secondary">Global entity</span>
                            </label>
                            <!-- Translations -->
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <label class="text-xs font-medium text-text-secondary">Translations</label>
                                    <button @click="addTranslation" class="text-xs text-accent hover:underline cursor-pointer">+ Add translation</button>
                                </div>
                                <div v-for="(t, i) in editForm.translations" :key="i" class="flex gap-2 mb-2">
                                    <input v-model="t.locale" placeholder="locale (e.g. es)"
                                        class="w-20 rounded-lg bg-surface border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                                    <input v-model="t.value" placeholder="translated name"
                                        class="flex-1 rounded-lg bg-surface border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                                    <button @click="removeTranslation(i)" class="p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Remove">
                                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <p v-if="editForm.translations.length === 0" class="text-xs text-text-muted">No translations</p>
                            </div>
                            <!-- Aliases -->
                            <div>
                                <div class="flex items-center justify-between mb-2">
                                    <label class="text-xs font-medium text-text-secondary">Aliases</label>
                                    <button @click="addAlias" class="text-xs text-accent hover:underline cursor-pointer">+ Add alias</button>
                                </div>
                                <div v-for="(a, i) in editForm.aliases" :key="i" class="flex gap-2 mb-2">
                                    <input v-model="a.locale" placeholder="locale (e.g. en)"
                                        class="w-20 rounded-lg bg-surface border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                                    <input v-model="a.value" placeholder="alias name"
                                        class="flex-1 rounded-lg bg-surface border border-border px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                                    <button @click="removeAlias(i)" class="p-1.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer" title="Remove">
                                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <p v-if="editForm.aliases.length === 0" class="text-xs text-text-muted">No aliases</p>
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                            <Button @click="cancelEditing" variant="secondary">Cancel</Button>
                            <Button @click="saveEditing" variant="info" :disabled="!editForm.name.trim() || saving">
                                {{ saving ? 'Saving...' : 'Save' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Create Entity Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="showCreateModal"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div
                        class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-md w-full mx-4 overflow-hidden">
                        <div class="px-6 py-4 border-b border-border-light">
                            <h3 class="text-base font-semibold text-text-primary tracking-tight">New Entity</h3>
                        </div>
                        <div class="px-6 py-5 space-y-4">
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Name *</label>
                                <input v-model="createForm.name" type="text"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                    placeholder="Entity name" />
                            </div>
                            <div>
                                <label class="block text-xs font-medium text-text-secondary mb-1.5">Type *</label>
                                <select v-model="createForm.entityTypeId"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                    <option :value="0" disabled>Select a type...</option>
                                    <option v-for="et in entityTypes" :key="et.id" :value="et.id">{{ et.name }}
                                    </option>
                                </select>
                            </div>
                            <div>
                                <label
                                    class="block text-xs font-medium text-text-secondary mb-1.5">Description</label>
                                <textarea v-model="createForm.description" rows="2"
                                    class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent resize-none"
                                    placeholder="Optional description"></textarea>
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                            <Button @click="showCreateModal = false" variant="secondary">Cancel</Button>
                            <Button @click="handleCreate" variant="info"
                                :disabled="!createForm.name.trim() || !createForm.entityTypeId || creating">
                                {{ creating ? 'Creating...' : 'Create' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Merge Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="showMergeModal"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div
                        class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-md w-full mx-4 overflow-hidden">
                        <div class="px-6 py-4 border-b border-border-light">
                            <h3 class="text-base font-semibold text-text-primary tracking-tight">
                                Merge: {{ mergeSource?.name }}
                            </h3>
                            <p class="text-xs text-text-muted mt-1">Search for the target entity to merge into</p>
                        </div>
                        <div class="px-6 py-5">
                            <input v-model="mergeSearchTerm" @input="debouncedMergeSearch" type="text"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent mb-3"
                                placeholder="Type entity name..." />

                            <div v-if="mergeSearching" class="text-center py-4">
                                <div class="inline-flex items-center gap-2 text-sm text-text-muted">
                                    <LoadingSpinner size="sm" />
                                    Searching...
                                </div>
                            </div>

                            <div v-else-if="mergeResults.length > 0"
                                class="max-h-48 overflow-y-auto border border-border rounded-lg">
                                <div
                                    class="px-3 py-1.5 text-[11px] text-text-muted border-b border-border-light font-medium uppercase tracking-wider">
                                    {{ mergeResults.length }} found
                                </div>
                                <button v-for="result in mergeResults" :key="result.id"
                                    @click="mergeTarget = result"
                                    class="w-full text-left px-3 py-2.5 hover:bg-surface-hover transition-colors cursor-pointer border-b border-border-light last:border-b-0 flex items-center gap-2.5"
                                    :class="mergeTarget?.id === result.id ? 'bg-accent-subtle' : ''">
                                    <span
                                        class="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider shrink-0"
                                        :class="getEntityTypeBadgeClass(result.entityType?.name)">
                                        {{ result.entityType?.name }}
                                    </span>
                                    <div class="min-w-0">
                                        <div class="text-sm font-medium text-text-primary truncate">{{ result.name }}
                                        </div>
                                        <div v-if="result.aliases && result.aliases.length > 0"
                                            class="text-[11px] text-text-muted truncate">
                                            {{ result.aliases.map(a => a.value).join(', ') }}
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <div v-else-if="mergeSearchTerm && !mergeSearching"
                                class="text-center py-4 text-sm text-text-muted">
                                No entities found
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                            <Button @click="closeMergeModal" variant="secondary">Cancel</Button>
                            <Button @click="handleMerge" variant="warning" :disabled="!mergeTarget || merging">
                                {{ merging ? 'Merging...' : 'Merge' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Delete Confirm Modal -->
        <ConfirmModal :is-open="showDeleteModal" title="Delete Entity"
            :message="`Are you sure you want to delete &quot;${entityToDelete?.name}&quot;? This will remove it from all resources and cannot be undone.`"
            confirm-text="Delete" cancel-text="Cancel" confirm-variant="danger" @confirm="handleDelete"
            @cancel="showDeleteModal = false" />

        <!-- Merge Confirm Modal -->
        <ConfirmModal :is-open="showMergeConfirm" title="Confirm Merge"
            :message="`Merge &quot;${mergeSource?.name}&quot; into &quot;${mergeTarget?.name}&quot;? The source entity will become an alias of the target. This cannot be undone.`"
            confirm-text="Merge" cancel-text="Cancel" confirm-variant="warning" @confirm="executeMerge"
            @cancel="showMergeConfirm = false" />
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import LoadingSpinner from '../components/ui/LoadingSpinner.vue';
import PageHeader from '../components/ui/PageHeader.vue';
import { useEntities, type Entity, type EntityDetail } from '../services/entities/useEntities';
import { useEntityTypes, type EntityType } from '../services/entity-types/useEntityTypes';
import { useRelationships } from '../services/relationships/useRelationships';
import { useProjectList } from '../services/projects/useProjectList';
import { useNotification } from '../composables/useNotification';
import Button from '../components/ui/Button.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import apiClient from '../services/api';

const router = useRouter();
const route = useRoute();
const { getAllEntities, updateEntity, deleteEntity, createEntity, mergeEntities, searchEntities, getEntityById } = useEntities();
const { fetchEntityTypes } = useEntityTypes();
const { isLoading: relLoading, data: relData, fetchAll, fetchByProject } = useRelationships();
const { projects: allProjects, loadProjects } = useProjectList();
const notification = useNotification();

// ==================== PROJECT CONTEXT ====================
const projectFromRoute = computed(() => route.query.project ? Number(route.query.project) : 0);
const projectName = ref('');

const breadcrumbItems = computed(() => {
    const items: { name: string; path?: string }[] = [];
    if (projectFromRoute.value && projectName.value) {
        items.push({ name: projectName.value, path: `/project/${projectFromRoute.value}` });
    }
    items.push({ name: 'Relationships' });
    return items;
});

// ==================== ENTITIES STATE ====================
const entities = ref<Entity[]>([]);
const entityTypes = ref<EntityType[]>([]);
const loading = ref(true);
const searchTerm = ref('');
const selectedType = ref<string | null>(null);

// Checked entities — when non-empty, graph only shows these + their mutual relationships
const checkedEntityIds = ref<Set<number>>(new Set());

const toggleChecked = (id: number) => {
    const s = new Set(checkedEntityIds.value);
    if (s.has(id)) s.delete(id); else s.add(id);
    checkedEntityIds.value = s;
};

const clearChecked = () => {
    checkedEntityIds.value = new Set();
};

const entityTypesWithCounts = computed(() => {
    const counts: Record<string, number> = {};
    for (const entity of entities.value) {
        const typeName = entity.entityType?.name || 'Unknown';
        counts[typeName] = (counts[typeName] || 0) + 1;
    }
    return Object.entries(counts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
});

const filteredEntities = computed(() => {
    let result = entities.value;

    if (selectedType.value) {
        result = result.filter(e => e.entityType?.name === selectedType.value);
    }

    const q = searchTerm.value.trim().toLowerCase();
    if (q) {
        result = result.filter(entity => {
            if ((entity.name || '').toLowerCase().includes(q)) return true;
            if (entity.entityType?.name?.toLowerCase().includes(q)) return true;
            if (entity.description?.toLowerCase().includes(q)) return true;
            if (entity.aliases) {
                for (const a of entity.aliases) {
                    if ((a.value || '').toLowerCase().includes(q)) return true;
                }
            }
            if (entity.translations) {
                for (const v of Object.values(entity.translations)) {
                    if ((v || '').toLowerCase().includes(q)) return true;
                }
            }
            return false;
        });
    }

    return result;
});

// Expand state
const expandedId = ref<number | null>(null);
const expandedDetail = ref<EntityDetail | null>(null);
const loadingDetail = ref(false);

const toggleExpand = async (entity: Entity) => {
    if (expandedId.value === entity.id) {
        expandedId.value = null;
        expandedDetail.value = null;
        return;
    }
    expandedId.value = entity.id;
    expandedDetail.value = null;
    loadingDetail.value = true;
    try {
        expandedDetail.value = await getEntityById(entity.id);
    } catch {
        notification.error('Failed to load entity details');
        expandedId.value = null;
    } finally {
        loadingDetail.value = false;
    }
};

const navigateToResource = (resourceId: number) => {
    router.push(`/resource/${resourceId}`);
};

const navigateToProject = (projectId: number) => {
    router.push(`/project/${projectId}`);
};

// Edit state
const editingId = ref<number | null>(null);
const editForm = ref({
    name: '',
    description: '',
    entityTypeId: 0,
    global: false,
    translations: [] as { locale: string; value: string }[],
    aliases: [] as { locale: string; value: string }[],
});
const saving = ref(false);

const startEditing = (entity: Entity) => {
    editingId.value = entity.id;
    editForm.value = {
        name: entity.name,
        description: entity.description || '',
        entityTypeId: entity.entityType?.id || 0,
        global: (entity as any).global || false,
        translations: entity.translations
            ? Object.entries(entity.translations).map(([locale, value]) => ({ locale, value }))
            : [],
        aliases: entity.aliases
            ? entity.aliases.map(a => ({ locale: a.locale || '', value: a.value }))
            : [],
    };
};

const cancelEditing = () => {
    editingId.value = null;
};

const addTranslation = () => { editForm.value.translations.push({ locale: '', value: '' }); };
const removeTranslation = (i: number) => { editForm.value.translations.splice(i, 1); };
const addAlias = () => { editForm.value.aliases.push({ locale: '', value: '' }); };
const removeAlias = (i: number) => { editForm.value.aliases.splice(i, 1); };

const saveEditing = async () => {
    if (!editingId.value || !editForm.value.name.trim()) return;
    saving.value = true;
    try {
        const translations: Record<string, string> = {};
        for (const t of editForm.value.translations) {
            if (t.locale.trim() && t.value.trim()) translations[t.locale.trim()] = t.value.trim();
        }
        const aliases = editForm.value.aliases
            .filter(a => a.value.trim())
            .map(a => ({ locale: a.locale.trim() || 'en', value: a.value.trim() }));

        const data: any = {
            name: editForm.value.name.trim(),
            description: editForm.value.description.trim() || undefined,
            entityTypeId: editForm.value.entityTypeId || undefined,
            global: editForm.value.global,
            translations: Object.keys(translations).length > 0 ? translations : undefined,
            aliases: aliases.length > 0 ? aliases : undefined,
        };

        await updateEntity(editingId.value, data);
        const idx = entities.value.findIndex(e => e.id === editingId.value);
        if (idx !== -1) {
            entities.value[idx].name = data.name;
            entities.value[idx].description = data.description || null;
            entities.value[idx].translations = Object.keys(translations).length > 0 ? translations : null;
            entities.value[idx].aliases = aliases.length > 0 ? aliases : null;
            if (data.entityTypeId) {
                const et = entityTypes.value.find(t => t.id === data.entityTypeId);
                if (et) entities.value[idx].entityType = { id: et.id, name: et.name, description: et.description };
            }
        }
        editingId.value = null;
        notification.success('Entity updated');
    } catch {
        notification.error('Failed to update entity');
    } finally {
        saving.value = false;
    }
};

// Delete state
const showDeleteModal = ref(false);
const entityToDelete = ref<Entity | null>(null);

const confirmDelete = (entity: Entity) => {
    entityToDelete.value = entity;
    showDeleteModal.value = true;
};

const handleDelete = async () => {
    showDeleteModal.value = false;
    if (!entityToDelete.value) return;
    try {
        await deleteEntity(entityToDelete.value.id);
        entities.value = entities.value.filter(e => e.id !== entityToDelete.value!.id);
        notification.success(`"${entityToDelete.value.name}" deleted`);
    } catch {
        notification.error('Failed to delete entity');
    } finally {
        entityToDelete.value = null;
    }
};

// Merge state
const showMergeModal = ref(false);
const showMergeConfirm = ref(false);
const mergeSource = ref<Entity | null>(null);
const mergeTarget = ref<Entity | null>(null);
const mergeSearchTerm = ref('');
const mergeResults = ref<Entity[]>([]);
const mergeSearching = ref(false);
const merging = ref(false);
let mergeSearchTimeout: ReturnType<typeof setTimeout> | null = null;

const openMergeModal = (entity: Entity) => {
    mergeSource.value = entity;
    mergeTarget.value = null;
    mergeSearchTerm.value = '';
    mergeResults.value = [];
    showMergeModal.value = true;
};

const closeMergeModal = () => {
    showMergeModal.value = false;
    mergeSource.value = null;
    mergeTarget.value = null;
    mergeSearchTerm.value = '';
    mergeResults.value = [];
    if (mergeSearchTimeout) clearTimeout(mergeSearchTimeout);
};

const debouncedMergeSearch = () => {
    if (mergeSearchTimeout) clearTimeout(mergeSearchTimeout);
    mergeSearchTimeout = setTimeout(async () => {
        if (mergeSearchTerm.value.trim().length < 1) {
            mergeResults.value = [];
            return;
        }
        mergeSearching.value = true;
        try {
            const results = await searchEntities(mergeSearchTerm.value);
            mergeResults.value = results.filter(e => e.id !== mergeSource.value?.id);
        } catch {
            notification.error('Search failed');
        } finally {
            mergeSearching.value = false;
        }
    }, 300);
};

const handleMerge = () => {
    if (!mergeSource.value || !mergeTarget.value) return;
    showMergeConfirm.value = true;
};

const executeMerge = async () => {
    showMergeConfirm.value = false;
    if (!mergeSource.value || !mergeTarget.value) return;
    merging.value = true;
    try {
        const merged = await mergeEntities(mergeSource.value.id, mergeTarget.value.id);
        entities.value = entities.value.filter(e => e.id !== mergeSource.value!.id);
        const idx = entities.value.findIndex(e => e.id === mergeTarget.value!.id);
        if (idx !== -1) {
            entities.value[idx] = merged;
        }
        notification.success(`"${mergeSource.value.name}" merged into "${mergeTarget.value.name}"`);
        closeMergeModal();
    } catch {
        notification.error('Failed to merge entities');
    } finally {
        merging.value = false;
    }
};

// Create state
const showCreateModal = ref(false);
const creating = ref(false);
const createForm = ref({ name: '', entityTypeId: 0, description: '' });

const openCreateModal = () => {
    createForm.value = { name: '', entityTypeId: 0, description: '' };
    showCreateModal.value = true;
};

const handleCreate = async () => {
    if (!createForm.value.name.trim() || !createForm.value.entityTypeId) return;
    creating.value = true;
    try {
        const data: { name: string; entityTypeId: number; description?: string } = {
            name: createForm.value.name.trim(),
            entityTypeId: createForm.value.entityTypeId,
        };
        if (createForm.value.description.trim()) {
            data.description = createForm.value.description.trim();
        }
        const created = await createEntity(data);
        entities.value.push(created);
        entities.value.sort((a, b) => a.name.localeCompare(b.name));
        showCreateModal.value = false;
        notification.success(`"${created.name}" created`);
    } catch {
        notification.error('Failed to create entity');
    } finally {
        creating.value = false;
    }
};

// Badge colors
const getEntityTypeBadgeClass = (typeName: string | undefined) => {
    const map: Record<string, string> = {
        'PERSON': 'bg-blue-100 text-blue-800',
        'ORGANIZATION': 'bg-green-100 text-green-800',
        'LOCATION': 'bg-yellow-100 text-yellow-800',
        'GEOPOLITICAL': 'bg-orange-100 text-orange-800',
        'NATIONALITY': 'bg-teal-100 text-teal-800',
        'EVENT': 'bg-pink-100 text-pink-800',
        'FACILITY': 'bg-cyan-100 text-cyan-800',
        'PRODUCT': 'bg-lime-100 text-lime-800',
        'WORK_OF_ART': 'bg-rose-100 text-rose-800',
        'LANGUAGE': 'bg-violet-100 text-violet-800',
        'LAW': 'bg-amber-100 text-amber-800',
    };
    return map[typeName || ''] || 'bg-surface-hover text-text-primary';
};

const getTypeChipActiveClass = (typeName: string) => {
    const map: Record<string, string> = {
        'PERSON': 'bg-blue-500 text-white shadow-sm',
        'ORGANIZATION': 'bg-green-500 text-white shadow-sm',
        'LOCATION': 'bg-yellow-500 text-white shadow-sm',
        'GEOPOLITICAL': 'bg-orange-500 text-white shadow-sm',
        'NATIONALITY': 'bg-teal-500 text-white shadow-sm',
        'EVENT': 'bg-pink-500 text-white shadow-sm',
        'FACILITY': 'bg-cyan-500 text-white shadow-sm',
        'PRODUCT': 'bg-lime-500 text-white shadow-sm',
        'WORK_OF_ART': 'bg-rose-500 text-white shadow-sm',
        'LANGUAGE': 'bg-violet-500 text-white shadow-sm',
        'LAW': 'bg-amber-500 text-white shadow-sm',
    };
    return map[typeName] || 'bg-gray-500 text-white shadow-sm';
};

// ==================== RELATIONSHIPS STATE ====================
const relViewMode = ref<'graph' | 'table'>('graph');
const relSelectedProjectId = ref(0);
const relSelectedResourceId = ref(0);
const relSelectedEntityType = ref('');
const relSelectedPredicate = ref('');
const relResources = ref<{ id: number; name: string }[]>([]);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Initialize from route query (for redirect from /project/:id/relationships)
if (projectFromRoute.value) {
    relSelectedProjectId.value = projectFromRoute.value;
}

const relTypeColors: Record<string, string> = {
    PERSON: '#6366f1', PER: '#6366f1',
    ORG: '#3b82f6', ORGANIZATION: '#3b82f6',
    GPE: '#10b981', LOCATION: '#10b981', LOC: '#10b981', GEOPOLITICAL: '#10b981',
    EVENT: '#f59e0b',
    WORK_OF_ART: '#ec4899',
    FACILITY: '#8b5cf6',
    PRODUCT: '#f97316',
    NATIONALITY: '#06b6d4',
    default: '#94a3b8',
};

const getRelEntityColor = (type: string) => relTypeColors[type?.toUpperCase()] || relTypeColors.default;
const getRelEntityName = (id: number | string) => relData.value.entities.find(e => e.id === id)?.name || String(id);
const getRelEntityType = (id: number | string) => relData.value.entities.find(e => e.id === id)?.type || '';
const getRelResourceName = (id: number) => relResources.value.find(r => r.id === id)?.name || `Resource #${id}`;

const relEntityTypes = computed(() => {
    const types = new Set<string>();
    for (const e of relData.value.entities) { if (e.type) types.add(e.type); }
    return Array.from(types).sort();
});

const relPredicates = computed(() => {
    const preds = new Set<string>();
    for (const r of relData.value.relationships) { if (r.predicate) preds.add(r.predicate); }
    return Array.from(preds).sort();
});

const relFilteredRelationships = computed(() => {
    let rels = relData.value.relationships;
    if (relSelectedResourceId.value) rels = rels.filter(r => r.resource_id === relSelectedResourceId.value);
    if (relSelectedPredicate.value) rels = rels.filter(r => r.predicate === relSelectedPredicate.value);
    if (relSelectedEntityType.value) {
        const ids = new Set(relData.value.entities.filter(e => e.type === relSelectedEntityType.value).map(e => e.id));
        rels = rels.filter(r => ids.has(r.source) || ids.has(r.target));
    }
    // When entities are checked, only show relationships between checked entities
    if (checkedEntityIds.value.size > 0) {
        const checked = checkedEntityIds.value as Set<number | string>;
        rels = rels.filter(r => checked.has(r.source) && checked.has(r.target));
    }
    return rels;
});

const relFilteredEntities = computed(() => {
    const usedIds = new Set<number | string>();
    for (const r of relFilteredRelationships.value) { usedIds.add(r.source); usedIds.add(r.target); }
    // Also include all checked entities even without mutual relationships
    if (checkedEntityIds.value.size > 0) {
        for (const id of checkedEntityIds.value) usedIds.add(id);
    }
    return relData.value.entities.filter(e => usedIds.has(e.id));
});

const loadProjectResources = async (projectId: number) => {
    try {
        const res = await apiClient.get(`/resources/project/${projectId}`);
        relResources.value = (res.data || []).map((r: any) => ({ id: r.id, name: r.name }));
    } catch {
        relResources.value = [];
    }
};

const refreshRelationships = async () => {
    if (relSelectedProjectId.value) {
        const resourceIds = relSelectedResourceId.value ? [relSelectedResourceId.value] : undefined;
        await fetchByProject(relSelectedProjectId.value, resourceIds);
    } else {
        await fetchAll();
    }
    if (relViewMode.value === 'graph') nextTick(buildGraph);
};

// --- Zoom & Pan ---
const zoom = ref(1);
const panX = ref(0);
const panY = ref(0);
let isPanning = false;
let panStartX = 0;
let panStartY = 0;
let panStartPanX = 0;
let panStartPanY = 0;
let draggedNode: SimNode | null = null;
let didDrag = false;
const selectedNodeIdx = ref<number | null>(null);
// Focused node (dblclick): shows only nodes up to 2 hops away
const focusedNodeIdx = ref<number | null>(null);
// Set of entity IDs visible in the focused/selected view — used by entity list
const activeEntityIds = ref<Set<number | string> | null>(null);

// Esc to clear selection and focus
const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        if (focusedNodeIdx.value !== null) {
            focusedNodeIdx.value = null;
            activeEntityIds.value = null;
        }
        selectedNodeIdx.value = null;
        drawFrame();
    }
};

const zoomIn = () => { zoom.value = Math.min(zoom.value * 1.25, 5); drawFrame(); };
const zoomOut = () => { zoom.value = Math.max(zoom.value / 1.25, 0.2); drawFrame(); };

const zoomToFit = () => {
    if (!simNodes.length || !canvasRef.value) return;
    const w = canvasRef.value.offsetWidth;
    const h = canvasRef.value.offsetHeight;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of simNodes) {
        minX = Math.min(minX, n.x - n.radius - 40);
        minY = Math.min(minY, n.y - n.radius - 40);
        maxX = Math.max(maxX, n.x + n.radius + 40);
        maxY = Math.max(maxY, n.y + n.radius + 40);
    }
    const gw = maxX - minX || 1;
    const gh = maxY - minY || 1;
    zoom.value = Math.min((w - 60) / gw, (h - 60) / gh, 3);
    panX.value = (w / 2) - ((minX + maxX) / 2) * zoom.value;
    panY.value = (h / 2) - ((minY + maxY) / 2) * zoom.value;
    drawFrame();
};

const onWheel = (e: WheelEvent) => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const oldZoom = zoom.value;
    zoom.value = Math.max(0.15, Math.min(5, zoom.value * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
    panX.value = mx - (mx - panX.value) * (zoom.value / oldZoom);
    panY.value = my - (my - panY.value) * (zoom.value / oldZoom);
    drawFrame();
};

const screenToGraph = (clientX: number, clientY: number): { gx: number; gy: number } => {
    const canvas = canvasRef.value!;
    const rect = canvas.getBoundingClientRect();
    const gx = (clientX - rect.left - panX.value) / zoom.value;
    const gy = (clientY - rect.top - panY.value) / zoom.value;
    return { gx, gy };
};

const findNodeAt = (gx: number, gy: number): SimNode | null => {
    for (let i = simNodes.length - 1; i >= 0; i--) {
        const n = simNodes[i];
        const dx = gx - n.x, dy = gy - n.y;
        if (dx * dx + dy * dy <= n.radius * n.radius) return n;
    }
    return null;
};

const onMouseDown = (e: MouseEvent) => {
    didDrag = false;
    const { gx, gy } = screenToGraph(e.clientX, e.clientY);
    const node = findNodeAt(gx, gy);
    if (node) {
        draggedNode = node;
    } else {
        isPanning = true;
        panStartX = e.clientX; panStartY = e.clientY;
        panStartPanX = panX.value; panStartPanY = panY.value;
    }
};

const onMouseMove = (e: MouseEvent) => {
    if (draggedNode) {
        didDrag = true;
        const { gx, gy } = screenToGraph(e.clientX, e.clientY);
        draggedNode.x = gx;
        draggedNode.y = gy;
        drawFrame();
    } else if (isPanning) {
        didDrag = true;
        panX.value = panStartPanX + (e.clientX - panStartX);
        panY.value = panStartPanY + (e.clientY - panStartY);
        drawFrame();
    }
};

const onMouseUp = () => {
    // Click (not drag) on a node → select it (1-hop highlight)
    if (!didDrag && draggedNode) {
        const clickedIdx = simNodes.indexOf(draggedNode);
        if (selectedNodeIdx.value === clickedIdx && focusedNodeIdx.value === null) {
            selectedNodeIdx.value = null;
            activeEntityIds.value = null;
        } else if (focusedNodeIdx.value === null) {
            selectedNodeIdx.value = clickedIdx;
            // Set active entity IDs for 1-hop
            const ids = new Set<number | string>();
            ids.add(simNodes[clickedIdx].id);
            for (const l of simLinks) {
                if (l.source === clickedIdx) ids.add(simNodes[l.target].id);
                if (l.target === clickedIdx) ids.add(simNodes[l.source].id);
            }
            activeEntityIds.value = ids;
        }
        drawFrame();
    }
    // Click on empty space (no drag) → deselect and unfocus
    if (!didDrag && !draggedNode) {
        selectedNodeIdx.value = null;
        focusedNodeIdx.value = null;
        activeEntityIds.value = null;
        drawFrame();
    }
    isPanning = false;
    draggedNode = null;
};

const onMouseLeave = () => {
    isPanning = false;
    draggedNode = null;
};

const onDblClick = (e: MouseEvent) => {
    const { gx, gy } = screenToGraph(e.clientX, e.clientY);
    const node = findNodeAt(gx, gy);
    if (!node) {
        focusedNodeIdx.value = null;
        activeEntityIds.value = null;
        drawFrame();
        return;
    }
    const nodeIdx = simNodes.indexOf(node);
    // If already focused on this node, unfocus
    if (focusedNodeIdx.value === nodeIdx) {
        focusedNodeIdx.value = null;
        activeEntityIds.value = null;
        drawFrame();
        return;
    }
    focusedNodeIdx.value = nodeIdx;
    selectedNodeIdx.value = nodeIdx;

    // BFS up to depth 2 from the focused node
    const visited = new Set<number>();
    visited.add(nodeIdx);
    let frontier = [nodeIdx];
    for (let depth = 0; depth < 2; depth++) {
        const nextFrontier: number[] = [];
        for (const fi of frontier) {
            for (const l of simLinks) {
                if (l.source === fi && !visited.has(l.target)) { visited.add(l.target); nextFrontier.push(l.target); }
                if (l.target === fi && !visited.has(l.source)) { visited.add(l.source); nextFrontier.push(l.source); }
            }
        }
        frontier = nextFrontier;
    }

    // Set active entity IDs for the entity list
    const ids = new Set<number | string>();
    for (const ni of visited) ids.add(simNodes[ni].id);
    activeEntityIds.value = ids;

    drawFrame();
};

// --- Graph rendering ---
interface SimNode { id: number | string; name: string; type: string; x: number; y: number; vx: number; vy: number; radius: number; }
interface SimLink { source: number; target: number; predicate: string; weight: number; }
let simNodes: SimNode[] = [];
let simLinks: SimLink[] = [];
let animFrame = 0;
const SIM_W = 2400;
const SIM_H = 1800;

const buildGraph = () => {
    const ents = relFilteredEntities.value;
    const rels = relFilteredRelationships.value;
    if (!ents.length || !canvasRef.value) return;

    const idxMap = new Map<number | string, number>();

    // Count connections per entity to determine importance
    const degreeCount = new Map<number | string, number>();
    for (const r of rels) {
        degreeCount.set(r.source, (degreeCount.get(r.source) || 0) + 1);
        degreeCount.set(r.target, (degreeCount.get(r.target) || 0) + 1);
    }

    // Sort entities: most connected first
    const sortedEnts = [...ents].sort((a, b) => (degreeCount.get(b.id) || 0) - (degreeCount.get(a.id) || 0));

    // Build nodes — position with BFS-like radial layout from hubs
    simNodes = sortedEnts.map((e, i) => {
        idxMap.set(e.id, i);
        return { id: e.id, name: e.name, type: e.type || 'default',
            x: 0, y: 0, vx: 0, vy: 0,
            radius: Math.max(28, Math.min(50, 10 + e.name.length * 2.2)) };
    });

    simLinks = [];
    for (const r of rels) {
        const si = idxMap.get(r.source); const ti = idxMap.get(r.target);
        if (si !== undefined && ti !== undefined) simLinks.push({ source: si, target: ti, predicate: r.predicate, weight: r.confidence || 1 });
    }

    // Initial layout: place hubs at center, radiate neighbors outward
    const placed = new Set<number>();
    const queue: number[] = [];

    // Place the top hub at center
    if (simNodes.length > 0) {
        simNodes[0].x = SIM_W / 2;
        simNodes[0].y = SIM_H / 2;
        placed.add(0);
        queue.push(0);
    }

    // BFS radial placement
    while (queue.length > 0) {
        const curr = queue.shift()!;
        const neighbors: number[] = [];
        for (const l of simLinks) {
            if (l.source === curr && !placed.has(l.target)) neighbors.push(l.target);
            if (l.target === curr && !placed.has(l.source)) neighbors.push(l.source);
        }
        if (neighbors.length === 0) continue;

        const ringRadius = simNodes[curr].radius + 140 + neighbors.length * 15;
        // Find existing angle bias from already-placed neighbors
        let startAngle = Math.random() * Math.PI * 2;
        const angleStep = (Math.PI * 2) / Math.max(neighbors.length, 1);

        for (let i = 0; i < neighbors.length; i++) {
            const ni = neighbors[i];
            const angle = startAngle + i * angleStep;
            simNodes[ni].x = simNodes[curr].x + Math.cos(angle) * ringRadius;
            simNodes[ni].y = simNodes[curr].y + Math.sin(angle) * ringRadius;
            placed.add(ni);
            queue.push(ni);
        }
    }

    // Place any disconnected nodes in a ring around the periphery
    const unplaced = simNodes.filter((_, i) => !placed.has(i));
    if (unplaced.length > 0) {
        const peripheryRadius = SIM_W * 0.35;
        const angleStep = (Math.PI * 2) / unplaced.length;
        unplaced.forEach((n, i) => {
            n.x = SIM_W / 2 + Math.cos(i * angleStep) * peripheryRadius;
            n.y = SIM_H / 2 + Math.sin(i * angleStep) * peripheryRadius;
        });
    }

    runSimulation();
};

const runSimulation = () => {
    const maxIter = 500;

    // Build adjacency for quick neighbor lookup
    const adj = new Map<number, Set<number>>();
    for (const l of simLinks) {
        if (!adj.has(l.source)) adj.set(l.source, new Set());
        if (!adj.has(l.target)) adj.set(l.target, new Set());
        adj.get(l.source)!.add(l.target);
        adj.get(l.target)!.add(l.source);
    }

    for (let iterations = 0; iterations < maxIter; iterations++) {
        const alpha = Math.max(0.01, 1 - iterations / maxIter);

        // Very light gravity
        for (const n of simNodes) {
            n.vx += (SIM_W / 2 - n.x) * 0.0005 * alpha;
            n.vy += (SIM_H / 2 - n.y) * 0.0005 * alpha;
        }

        // Repulsion between nodes — radius-aware, stronger for non-neighbors
        for (let i = 0; i < simNodes.length; i++) {
            for (let j = i + 1; j < simNodes.length; j++) {
                let dx = simNodes[j].x - simNodes[i].x;
                let dy = simNodes[j].y - simNodes[i].y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                const minDist = simNodes[i].radius + simNodes[j].radius + 60;
                const areNeighbors = adj.get(i)?.has(j);
                const repStrength = areNeighbors ? 3000 : 5000;
                let force = (repStrength * alpha) / (dist * dist);
                if (dist < minDist) {
                    force += (minDist - dist) * 1.0;
                }
                dx = (dx / dist) * force; dy = (dy / dist) * force;
                simNodes[i].vx -= dx; simNodes[i].vy -= dy;
                simNodes[j].vx += dx; simNodes[j].vy += dy;
            }
        }

        // Attraction along edges — keeps connected nodes close
        for (const l of simLinks) {
            const s = simNodes[l.source], t = simNodes[l.target];
            const dx = t.x - s.x, dy = t.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy) || 1;
            const idealDist = s.radius + t.radius + 130;
            const force = (dist - idealDist) * 0.004 * alpha;
            s.vx += (dx / dist) * force; s.vy += (dy / dist) * force;
            t.vx -= (dx / dist) * force; t.vy -= (dy / dist) * force;
        }

        // Edge-node repulsion — prevent nodes from sitting on top of edges
        if (iterations % 4 === 0) {
            for (const l of simLinks) {
                const s = simNodes[l.source], t = simNodes[l.target];
                for (let k = 0; k < simNodes.length; k++) {
                    if (k === l.source || k === l.target) continue;
                    const n = simNodes[k];
                    const ex = t.x - s.x, ey = t.y - s.y;
                    const edgeLen2 = ex * ex + ey * ey || 1;
                    const proj = Math.max(0, Math.min(1, ((n.x - s.x) * ex + (n.y - s.y) * ey) / edgeLen2));
                    const closestX = s.x + proj * ex, closestY = s.y + proj * ey;
                    const dx2 = n.x - closestX, dy2 = n.y - closestY;
                    const distToEdge = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 1;
                    const clearance = n.radius + 35;
                    if (distToEdge < clearance) {
                        const push = (clearance - distToEdge) * 0.4 * alpha;
                        n.vx += (dx2 / distToEdge) * push;
                        n.vy += (dy2 / distToEdge) * push;
                    }
                }
            }
        }

        // Damping
        for (const n of simNodes) { n.vx *= 0.7; n.vy *= 0.7; n.x += n.vx; n.y += n.vy; }
    }

    zoomToFit();
};

const drawFrame = () => {
    const canvas = canvasRef.value;
    if (!canvas) return;
    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr; canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(panX.value, panY.value);
    ctx.scale(zoom.value, zoom.value);

    const mutedColor = getComputedStyle(canvas).getPropertyValue('--color-text-muted') || '#94a3b8';

    // Highlight set — focus (dblclick, 2-hop) takes priority over selection (click, 1-hop)
    const focus = focusedNodeIdx.value;
    const sel = focus ?? selectedNodeIdx.value;
    const highlightNodes = new Set<number>();
    const highlightEdges = new Set<number>();
    if (focus !== null) {
        // Use the same BFS 2-hop set
        highlightNodes.add(focus);
        let frontier = [focus];
        for (let depth = 0; depth < 2; depth++) {
            const next: number[] = [];
            for (const fi of frontier) {
                simLinks.forEach((l, li) => {
                    if (l.source === fi && !highlightNodes.has(l.target)) { highlightNodes.add(l.target); next.push(l.target); }
                    if (l.target === fi && !highlightNodes.has(l.source)) { highlightNodes.add(l.source); next.push(l.source); }
                });
            }
            frontier = next;
        }
        // Mark edges where both endpoints are in the highlight set
        simLinks.forEach((l, li) => {
            if (highlightNodes.has(l.source) && highlightNodes.has(l.target)) highlightEdges.add(li);
        });
    } else if (sel !== null) {
        highlightNodes.add(sel);
        simLinks.forEach((l, li) => {
            if (l.source === sel || l.target === sel) {
                highlightEdges.add(li);
                highlightNodes.add(l.source);
                highlightNodes.add(l.target);
            }
        });
    }
    const hasSelection = sel !== null;

    // Count parallel edges between same node pairs to curve them
    const edgePairCount = new Map<string, number>();
    const edgePairIndex = new Map<string, number>();
    for (const l of simLinks) {
        const key = Math.min(l.source, l.target) + '-' + Math.max(l.source, l.target);
        edgePairCount.set(key, (edgePairCount.get(key) || 0) + 1);
    }
    simLinks.forEach((l, li) => {
        const key = Math.min(l.source, l.target) + '-' + Math.max(l.source, l.target);
        const idx = edgePairIndex.get(key) || 0;
        edgePairIndex.set(key, idx + 1);
        const total = edgePairCount.get(key) || 1;

        const isActive = !hasSelection || highlightEdges.has(li);
        const edgeAlpha = isActive ? 0.4 : 0.06;
        const arrowAlpha = isActive ? 0.5 : 0.08;
        const labelAlpha = isActive ? 1 : 0.15;

        const s = simNodes[l.source], t = simNodes[l.target];
        const dx = t.x - s.x, dy = t.y - s.y, dist = Math.sqrt(dx * dx + dy * dy) || 1;

        // Perpendicular offset for parallel edges
        const nx = -dy / dist, ny = dx / dist;
        const curveAmount = total > 1 ? (idx - (total - 1) / 2) * 40 : 0;
        const cpx = (s.x + t.x) / 2 + nx * curveAmount;
        const cpy = (s.y + t.y) / 2 + ny * curveAmount;

        // Draw curved edge
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        if (curveAmount !== 0) {
            ctx.quadraticCurveTo(cpx, cpy, t.x, t.y);
        } else {
            ctx.lineTo(t.x, t.y);
        }
        ctx.strokeStyle = `rgba(148,163,184,${edgeAlpha})`; ctx.lineWidth = isActive ? Math.min(2.5, 1 + l.weight) : 1; ctx.stroke();

        // Arrow
        let arrowAngle: number;
        if (curveAmount !== 0) {
            arrowAngle = Math.atan2(t.y - cpy, t.x - cpx);
        } else {
            arrowAngle = Math.atan2(dy, dx);
        }
        const arrowLen = 10;
        const ex = t.x - Math.cos(arrowAngle) * (t.radius + 3);
        const ey = t.y - Math.sin(arrowAngle) * (t.radius + 3);
        ctx.beginPath(); ctx.moveTo(ex, ey);
        ctx.lineTo(ex - arrowLen * Math.cos(arrowAngle - 0.3), ey - arrowLen * Math.sin(arrowAngle - 0.3));
        ctx.lineTo(ex - arrowLen * Math.cos(arrowAngle + 0.3), ey - arrowLen * Math.sin(arrowAngle + 0.3));
        ctx.closePath(); ctx.fillStyle = `rgba(148,163,184,${arrowAlpha})`; ctx.fill();

        // Label
        const labelX = curveAmount !== 0 ? (s.x + 2 * cpx + t.x) / 4 : (s.x + t.x) / 2;
        const labelY = curveAmount !== 0 ? (s.y + 2 * cpy + t.y) / 4 : (s.y + t.y) / 2;
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = mutedColor;
        ctx.font = '10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        const lbl = l.predicate.replace(/_/g, ' ');
        ctx.fillText(lbl.length > 24 ? lbl.slice(0, 23) + '…' : lbl, labelX, labelY - 4);
        ctx.globalAlpha = 1;
    });

    for (let ni = 0; ni < simNodes.length; ni++) {
        const n = simNodes[ni];
        const isActive = !hasSelection || highlightNodes.has(ni);
        const isSelected = ni === sel;
        const nodeAlpha = isActive ? 1 : 0.15;
        const color = getRelEntityColor(n.type);

        ctx.globalAlpha = nodeAlpha;

        // Circle
        ctx.shadowColor = isSelected ? color : 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = isSelected ? 16 : 8;
        ctx.shadowOffsetY = isSelected ? 0 : 2;
        ctx.beginPath(); ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = color + 'cc'; ctx.fill();
        ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = isSelected ? 3.5 : 2.5;
        ctx.stroke();

        // Name inside
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const maxWidth = n.radius * 1.6;
        const fontSize = Math.max(8, Math.min(12, n.radius * 0.38));
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;

        const words = n.name.split(/\s+/);
        const lines: string[] = [];
        let currentLine = '';
        for (const word of words) {
            const testLine = currentLine ? currentLine + ' ' + word : word;
            if (ctx.measureText(testLine).width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        if (currentLine) lines.push(currentLine);

        const maxLines = Math.max(1, Math.floor(n.radius / (fontSize * 0.7)));
        const displayLines = lines.slice(0, maxLines);
        if (lines.length > maxLines) {
            displayLines[maxLines - 1] = displayLines[maxLines - 1].slice(0, -1) + '…';
        }

        const lineHeight = fontSize * 1.2;
        const startY = n.y - ((displayLines.length - 1) * lineHeight) / 2;
        for (let i = 0; i < displayLines.length; i++) {
            ctx.fillText(displayLines[i], n.x, startY + i * lineHeight);
        }

        ctx.globalAlpha = 1;
    }

    ctx.restore();
};

const resizeObserver = new ResizeObserver(() => {
    if (canvasRef.value && relFilteredEntities.value.length > 0) drawFrame();
});

// ==================== WATCHERS ====================
watch(relSelectedProjectId, async (projectId) => {
    relSelectedResourceId.value = 0;
    relSelectedEntityType.value = '';
    relSelectedPredicate.value = '';
    if (projectId) {
        await loadProjectResources(projectId);
    } else {
        relResources.value = [];
    }
    await refreshRelationships();
});

watch([relSelectedResourceId, relSelectedEntityType, relSelectedPredicate, checkedEntityIds], () => {
    // Clear graph selection/focus when filters change
    selectedNodeIdx.value = null;
    focusedNodeIdx.value = null;
    activeEntityIds.value = null;
    if (relViewMode.value === 'graph') nextTick(buildGraph);
});

watch(relViewMode, (mode) => {
    if (mode === 'graph' && relFilteredEntities.value.length > 0) nextTick(buildGraph);
});


// ==================== LIFECYCLE ====================
onMounted(async () => {
    // Load entities data
    try {
        const [allEntities, allTypes] = await Promise.all([
            getAllEntities(),
            fetchEntityTypes(),
        ]);
        entities.value = allEntities;
        entityTypes.value = allTypes;
    } catch {
        notification.error('Failed to load entities');
    } finally {
        loading.value = false;
    }

    // Load projects list for relationships tab
    await loadProjects();

    // If project was pre-selected (from route query), load its name and resources
    if (projectFromRoute.value) {
        try {
            const res = await apiClient.get(`/projects/${projectFromRoute.value}`);
            projectName.value = res.data.name;
        } catch { /* ignore */ }
        await loadProjectResources(relSelectedProjectId.value);
    }

    // Load relationships (global or project-scoped)
    await refreshRelationships();

    nextTick(() => {
        if (canvasRef.value) resizeObserver.observe(canvasRef.value);
    });

    window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
    cancelAnimationFrame(animFrame);
    resizeObserver.disconnect();
    window.removeEventListener('keydown', onKeyDown);
});
</script>

<style scoped>
.modal-enter-active {
    transition: opacity 0.2s ease;
}

.modal-leave-active {
    transition: opacity 0.15s ease;
}

.modal-enter-from,
.modal-leave-to {
    opacity: 0;
}
</style>
