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
                                    <!-- Knowledge Base entries -->
                                    <div v-if="expandedDetail.knowledgeEntries && expandedDetail.knowledgeEntries.length > 0">
                                        <span class="text-[10px] font-semibold text-text-muted uppercase">Knowledge Base ({{ expandedDetail.knowledgeEntries.length }})</span>
                                        <button v-for="kb in expandedDetail.knowledgeEntries" :key="kb.id"
                                            @click="navigateToKBEntry(kb.id)"
                                            class="block w-full text-left text-[11px] text-accent hover:underline truncate">
                                            {{ kb.title }}
                                        </button>
                                    </div>
                                    <div v-if="featureStore.isEnabled('knowledge_base') && (!expandedDetail.knowledgeEntries || expandedDetail.knowledgeEntries.length === 0)">
                                        <button @click="createKBFromEntity(entity)"
                                            class="text-[10px] text-accent hover:underline cursor-pointer">
                                            + Crear entrada en Knowledge Base
                                        </button>
                                    </div>
                                    <p v-if="(!expandedDetail.resources || expandedDetail.resources.length === 0) && (!expandedDetail.projects || expandedDetail.projects.length === 0) && (!expandedDetail.knowledgeEntries || expandedDetail.knowledgeEntries.length === 0)"
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
import { useGraphCanvas } from '../services/relationships/useGraphCanvas';
import { useProjectList } from '../services/projects/useProjectList';
import { useNotification } from '../composables/useNotification';
import Button from '../components/ui/Button.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import { useKnowledgeBase } from '../services/knowledge/useKnowledgeBase';
import { useFeatureStore } from '../store/featureStore';

const router = useRouter();
const route = useRoute();
const { getAllEntities, updateEntity, deleteEntity, createEntity, mergeEntities, searchEntities, getEntityById } = useEntities();
const { fetchEntityTypes } = useEntityTypes();
const { isLoading: relLoading, data: relData, fetchAll, fetchByProject, fetchProjectResources, fetchProjectName } = useRelationships();
const { projects: allProjects, loadProjects } = useProjectList();
const notification = useNotification();
const { createEntry: createKBEntry } = useKnowledgeBase();
const featureStore = useFeatureStore();

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

const navigateToKBEntry = (kbId: number) => {
    router.push(`/knowledge-base/${kbId}`);
};

const createKBFromEntity = async (entity: Entity) => {
    try {
        const entry = await createKBEntry({
            title: entity.name,
            summary: entity.description || undefined,
            isDefinition: true,
            entityId: entity.id,
        });
        router.push(`/knowledge-base/${entry.id}`);
    } catch (err) {
        notification.error('Failed to create KB entry');
    }
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
        relResources.value = await fetchProjectResources(projectId);
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

// Graph canvas: pan/zoom, hit-testing, selection/focus and rendering live in
// useGraphCanvas (interaction layer) + graphEngine (pure layout/drawing)
const {
    canvasRef,
    zoom,
    activeEntityIds,
    buildGraph,
    zoomIn,
    zoomOut,
    zoomToFit,
    onWheel,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onMouseLeave,
    onDblClick,
    onKeyDown,
    clearSelection,
    observeCanvas,
    dispose,
} = useGraphCanvas({
    getEntities: () => relFilteredEntities.value,
    getRelationships: () => relFilteredRelationships.value,
    getNodeColor: getRelEntityColor,
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
    clearSelection();
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
            projectName.value = await fetchProjectName(projectFromRoute.value);
        } catch { /* ignore */ }
        await loadProjectResources(relSelectedProjectId.value);
    }

    // Load relationships (global or project-scoped)
    await refreshRelationships();

    nextTick(observeCanvas);

    window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
    dispose();
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
