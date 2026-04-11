<template>
    <div class="h-full flex flex-col">
        <!-- Loading -->
        <div v-if="loading" class="flex-1 flex items-center justify-center">
            <div class="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
        </div>

        <template v-else-if="dataset">
            <!-- Header bar -->
            <div class="shrink-0 px-4 py-3 border-b border-border bg-surface-elevated flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-0">
                    <button @click="router.push('/datasets')"
                        class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer shrink-0">
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h1 class="text-lg font-semibold text-text-primary tracking-tight truncate">{{ dataset.name }}</h1>
                    <span v-if="dataset.project"
                        class="px-2 py-0.5 rounded-full text-[10px] font-medium bg-accent-subtle text-accent shrink-0">
                        {{ dataset.project.name }}
                    </span>
                    <span v-if="dataset.description"
                        class="text-xs text-text-muted truncate hidden lg:inline">{{ dataset.description }}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                    <button @click="showRecordForm = true"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent hover:bg-accent-dark text-white text-xs font-medium rounded-lg transition-colors cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        New Record
                    </button>
                    <button v-if="dataset.dataSources?.length"
                        @click="handleSync"
                        :disabled="syncing"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg class="h-3.5 w-3.5" :class="{ 'animate-spin': syncing }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {{ syncing ? 'Syncing...' : 'Sync' }}
                    </button>
                    <button @click="showImportModal = true"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Import CSV
                    </button>
                    <button @click="handleExportCsv"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV
                    </button>
                    <button @click="activeTab = activeTab === 'schema' ? 'data' : 'schema'"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {{ activeTab === 'schema' ? 'Data' : 'Schema' }}
                    </button>
                </div>
            </div>

            <!-- Tabs strip -->
            <div class="shrink-0 px-4 py-1.5 border-b border-border bg-surface flex items-center gap-1">
                <button v-for="tab in tabs" :key="tab.key"
                    @click="activeTab = tab.key"
                    class="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
                    :class="activeTab === tab.key
                        ? 'bg-accent text-white'
                        : 'text-text-secondary hover:bg-surface-hover'">
                    <component :is="tab.icon" class="h-3.5 w-3.5" />
                    {{ tab.label }}
                </button>

                <!-- Inline actions (selection + edits) - right aligned -->
                <div class="ml-auto flex items-center gap-2">
                    <!-- Selection actions -->
                    <template v-if="recordTableRef?.selectedIds?.size > 0">
                        <span class="text-xs font-medium text-accent">{{ recordTableRef.selectedIds.size }} selected</span>
                        <button @click="recordTableRef.selectedIds.clear()"
                            class="text-xs text-text-secondary hover:text-text-primary transition-colors cursor-pointer">
                            Deselect
                        </button>
                        <button @click="confirmBulkDelete([...recordTableRef.selectedIds])"
                            class="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-700 transition-colors cursor-pointer">
                            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                        </button>
                    </template>
                    <!-- Edit actions -->
                    <template v-if="recordTableRef?.hasChanges">
                        <span v-if="!(recordTableRef?.selectedIds?.size > 0)" class="w-px h-4"></span>
                        <span class="text-xs font-medium text-amber-600">{{ recordTableRef.editingCells.size }} change{{ recordTableRef.editingCells.size > 1 ? 's' : '' }}</span>
                        <button @click="recordTableRef.cancelEdits()"
                            class="px-2 py-0.5 text-xs font-medium text-text-secondary border border-border rounded-md hover:bg-surface-hover transition-colors cursor-pointer">
                            Cancel
                        </button>
                        <button @click="recordTableRef.applyEdits()"
                            class="px-2 py-0.5 text-xs font-medium bg-accent text-white rounded-md hover:bg-accent-dark transition-colors cursor-pointer">
                            Save
                        </button>
                    </template>
                </div>
            </div>

            <!-- Content area -->
            <div class="flex-1 overflow-auto">
                <!-- Schema editor -->
                <div v-if="activeTab === 'schema'" class="h-full flex gap-6 p-4 overflow-hidden">
                    <!-- Left: dataset info -->
                    <div class="w-64 shrink-0 space-y-4">
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1">Dataset name</label>
                            <input v-model="editableName" type="text"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1">Description</label>
                            <input v-model="editableDescription" type="text" placeholder="Optional description"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                        </div>
                        <Button @click="saveSchema" variant="info" :disabled="savingSchema || analyzingSchema">
                            {{ analyzingSchema ? 'Analyzing...' : savingSchema ? 'Saving...' : 'Save' }}
                        </Button>
                    </div>
                    <!-- Right: fields -->
                    <div class="flex-1 min-w-0 overflow-y-auto">
                        <label class="block text-xs font-medium text-text-secondary mb-1.5">Fields</label>
                        <DatasetSchemaEditor v-model="editableSchema" />
                    </div>
                </div>

                <!-- Data tab -->
                <div v-if="activeTab === 'data'" class="h-full flex flex-col">
                    <div class="shrink-0 px-4 py-2 border-b border-border-light bg-surface/50">
                        <DatasetFilterBar :schema="dataset.schema" v-model:filters="filters"
                            v-model:search-term="searchTerm" @apply="applyFilters" @search="applyFilters" />
                    </div>

                    <div class="flex-1 overflow-auto">
                        <DatasetRecordTable ref="recordTableRef" :schema="dataset.schema" :records="records" :total="totalRecords" :page="page"
                            :limit="limit" :sort-field="sortField" :sort-order="sortOrder"
                            @page="changePage" @sort="toggleSort"
                            @bulk-delete="confirmBulkDelete" @inline-update="handleInlineUpdate" />
                    </div>
                </div>

                <!-- Charts & Analysis tab -->
                <div v-if="activeTab === 'charts'" class="h-full p-4">
                    <div class="flex gap-4 h-full">
                        <!-- Left sidebar -->
                        <div class="w-72 shrink-0 space-y-3 overflow-y-auto">
                            <!-- Charts section -->
                            <div class="bg-surface-elevated rounded-xl border border-border p-3 space-y-2">
                                <span class="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Charts</span>
                                <div class="grid grid-cols-2 gap-1.5">
                                    <button v-for="ct in chartModes" :key="ct.id" @click="selectChartMode(ct.id)"
                                        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                                        :class="visualMode === ct.id ? 'bg-accent text-white' : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'">
                                        <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path v-for="(d, i) in ct.paths" :key="i" :d="d" />
                                        </svg>
                                        {{ ct.label }}
                                    </button>
                                </div>
                            </div>

                            <!-- Analysis section -->
                            <div class="bg-surface-elevated rounded-xl border border-border p-3 space-y-2">
                                <span class="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Analysis</span>
                                <div class="grid grid-cols-2 gap-1.5">
                                    <button v-for="op in analysisModes" :key="op.id" @click="visualMode = op.id"
                                        class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer"
                                        :class="visualMode === op.id ? 'bg-accent text-white' : 'bg-surface border border-border text-text-secondary hover:bg-surface-hover'">
                                        <svg class="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path v-for="(d, i) in op.paths" :key="i" :d="d" />
                                        </svg>
                                        {{ op.label }}
                                    </button>
                                </div>
                            </div>

                            <!-- Chart config (when a chart type is selected) -->
                            <DatasetChartBuilder v-if="isChartMode"
                                :schema="dataset.schema" :result="chartResult" :running="chartRunning"
                                :filters="activeChartFilters" :dataset-id="datasetId" :saved-charts="savedCharts"
                                :preselected-chart-type="preselectedChartType"
                                mode="sidebar"
                                @run="runChartWithFilters" @save="handleSaveChart" @delete-saved-chart="handleDeleteSavedChart" />

                            <!-- Analysis config (when an analysis type is selected) -->
                            <template v-else>
                                <DatasetStatsPanel v-if="statsOps.includes(visualMode)"
                                    :schema="dataset.schema" :result="analysisResult" :running="analysisRunning"
                                    :selected-operation="visualMode" mode="sidebar"
                                    @run="runAnalysis" />
                                <DatasetCorrelationMatrix v-else-if="visualMode === 'correlation'"
                                    :schema="dataset.schema" :result="analysisResult" :running="analysisRunning"
                                    mode="sidebar"
                                    @run="runAnalysis" />
                                <DatasetOutlierPanel v-else-if="visualMode === 'outliers'"
                                    :schema="dataset.schema" :result="analysisResult" :running="analysisRunning"
                                    mode="sidebar"
                                    @run="runAnalysis" />
                                <DatasetPivotTable v-else-if="visualMode === 'pivot'"
                                    :schema="dataset.schema" :result="analysisResult" :running="analysisRunning"
                                    mode="sidebar"
                                    @run="runAnalysis" />
                            </template>

                            <!-- Save current view button -->
                            <button v-if="activeResult && !activeResult.error" @click="showSaveViewDialog = true"
                                class="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 border border-border text-text-secondary text-xs font-medium rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                Save View
                            </button>

                            <!-- Saved views for current mode -->
                            <div v-if="savedViewsForCurrentMode.length > 0"
                                class="bg-surface-elevated rounded-xl border border-border overflow-hidden">
                                <div class="px-3 py-2 border-b border-border-light bg-surface">
                                    <span class="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Saved</span>
                                </div>
                                <div class="divide-y divide-border-light max-h-32 overflow-y-auto">
                                    <div v-for="sv in savedViewsForCurrentMode" :key="sv.id"
                                        class="flex items-center justify-between px-3 py-2 hover:bg-surface-hover transition-colors group">
                                        <button @click="loadSavedView(sv)"
                                            class="flex-1 min-w-0 text-xs text-text-primary hover:text-accent transition-colors cursor-pointer text-left truncate">
                                            {{ sv.name }}
                                        </button>
                                        <button @click="handleDeleteSavedChart(sv.id)"
                                            class="p-0.5 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0">
                                            <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Right panel: results -->
                        <div class="flex-1 min-w-0 flex flex-col">
                            <!-- Empty state: no results yet -->
                            <div v-if="!activeResult && !activeRunning"
                                class="flex-1 flex items-center justify-center bg-surface-elevated rounded-xl border border-border">
                                <div class="text-center">
                                    <svg class="mx-auto h-12 w-12 text-text-muted/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v16h16" />
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M8 16V9" />
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 16V4" />
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M16 16v-5" />
                                    </svg>
                                    <p class="text-sm text-text-muted">{{ activeModeName }}</p>
                                    <p class="text-xs text-text-muted/70 mt-1">Configure the parameters and click Run</p>
                                </div>
                            </div>

                            <!-- Loading -->
                            <div v-else-if="activeRunning && !activeResult"
                                class="flex-1 flex items-center justify-center bg-surface-elevated rounded-xl border border-border">
                                <div class="flex flex-col items-center gap-3">
                                    <div class="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent"></div>
                                    <span class="text-sm text-text-muted">Running {{ activeModeName }}...</span>
                                </div>
                            </div>

                            <!-- Results -->
                            <div v-else class="flex-1 min-h-0 overflow-hidden bg-surface-elevated rounded-xl border border-border p-4 flex flex-col">
                                <DatasetChartBuilder v-if="isChartMode"
                                    :schema="dataset.schema" :result="chartResult" :running="chartRunning"
                                    :filters="activeChartFilters" :dataset-id="datasetId" :saved-charts="savedCharts"
                                    :preselected-chart-type="preselectedChartType"
                                    mode="display"
                                    @run="runChartWithFilters" @save="handleSaveChart" @delete-saved-chart="handleDeleteSavedChart" />
                                <DatasetStatsPanel v-else-if="statsOps.includes(visualMode)"
                                    :schema="dataset.schema" :result="analysisResult" :running="analysisRunning"
                                    :selected-operation="visualMode" mode="display"
                                    @run="runAnalysis" />
                                <DatasetCorrelationMatrix v-else-if="visualMode === 'correlation'"
                                    :schema="dataset.schema" :result="analysisResult" :running="analysisRunning"
                                    mode="display"
                                    @run="runAnalysis" />
                                <DatasetOutlierPanel v-else-if="visualMode === 'outliers'"
                                    :schema="dataset.schema" :result="analysisResult" :running="analysisRunning"
                                    mode="display"
                                    @run="runAnalysis" />
                                <DatasetPivotTable v-else-if="visualMode === 'pivot'"
                                    :schema="dataset.schema" :result="analysisResult" :running="analysisRunning"
                                    mode="display"
                                    @run="runAnalysis" />
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Saved views tab -->
                <div v-if="activeTab === 'saved'" class="h-full flex flex-col overflow-hidden">
                    <!-- Empty state -->
                    <div v-if="savedCharts.length === 0" class="flex-1 flex items-center justify-center">
                        <div class="text-center">
                            <svg class="mx-auto h-12 w-12 text-text-muted/30 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                            <p class="text-sm text-text-muted">No saved views yet</p>
                            <p class="text-xs text-text-muted/70 mt-1">Run a chart or analysis and click "Save View" to save it here</p>
                        </div>
                    </div>

                    <template v-else>
                        <!-- Search bar + type filter -->
                        <div class="shrink-0 px-4 py-2.5 border-b border-border-light bg-surface/50 flex items-center gap-3">
                            <!-- Search by name -->
                            <div class="relative flex-1">
                                <svg class="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none"
                                    fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                <input v-model="savedSearch" type="text" placeholder="Search by name..."
                                    class="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                            </div>
                            <!-- Filter by type -->
                            <select v-model="savedTypeFilter"
                                class="rounded-lg bg-surface border border-border px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent">
                                <option value="">All types</option>
                                <optgroup label="Charts">
                                    <option v-for="ct in chartModes" :key="ct.id" :value="ct.id">{{ ct.label }}</option>
                                </optgroup>
                                <optgroup label="Analysis">
                                    <option v-for="op in analysisModes" :key="op.id" :value="op.id">{{ op.label }}</option>
                                </optgroup>
                            </select>
                        </div>

                        <!-- List -->
                        <div class="flex-1 min-h-0 overflow-y-auto">
                            <!-- No results -->
                            <div v-if="filteredSavedViews.length === 0" class="px-4 py-8 text-center text-sm text-text-muted">
                                No saved views match your search
                            </div>

                            <div v-else class="divide-y divide-border-light">
                                <div v-for="sv in filteredSavedViews" :key="sv.id"
                                    class="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors group/item">
                                    <!-- Type icon -->
                                    <svg class="h-4 w-4 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                        <path v-for="(d, pi) in (allModes.find(m => m.id === inferVisualMode(sv.config))?.paths || ['M4 4v16h16'])" :key="pi" :d="d" />
                                    </svg>
                                    <!-- Name + config summary + date -->
                                    <button @click="loadAndNavigate(sv)"
                                        class="flex-1 min-w-0 text-left cursor-pointer">
                                        <span class="text-sm font-medium text-text-primary truncate block">{{ sv.name }}</span>
                                        <span class="text-[10px] text-text-muted truncate block">{{ savedViewSummary(sv) }} · {{ new Date(sv.createdAt).toLocaleDateString() }}</span>
                                    </button>
                                    <!-- Type badge -->
                                    <span class="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-medium bg-surface border border-border-light text-text-muted">
                                        {{ savedViewLabel(sv) }}
                                    </span>
                                    <!-- Delete -->
                                    <button @click="handleDeleteSavedChart(sv.id)"
                                        class="shrink-0 p-1 rounded text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer opacity-0 group-hover/item:opacity-100"
                                        title="Delete">
                                        <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                            <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>

                        <!-- Footer count -->
                        <div class="shrink-0 px-4 py-2 border-t border-border bg-surface text-xs text-text-muted">
                            {{ filteredSavedViews.length }} of {{ savedCharts.length }} saved views
                        </div>
                    </template>
                </div>

            </div>
        </template>

        <!-- Record Form Modal -->
        <DatasetRecordForm v-if="dataset" :is-open="showRecordForm" :schema="dataset.schema"
            :record="null" @close="showRecordForm = false" @save="handleSaveRecord" />

        <!-- CSV Import Modal -->
        <CsvImportModal v-if="dataset" :is-open="showImportModal" :dataset-id="dataset.id" :schema="dataset.schema"
            @close="showImportModal = false" @upload-preview="handleCsvUpload" @confirm-import="handleCsvConfirm"
            @imported="handleImported" />

        <!-- Bulk Delete Confirm -->
        <ConfirmModal :is-open="showBulkDeleteModal" :title="`Delete ${bulkDeleteIds.length} Records`"
            :message="`Are you sure you want to delete ${bulkDeleteIds.length} selected records? This cannot be undone.`"
            confirm-text="Delete All" cancel-text="Cancel" confirm-variant="danger" @confirm="handleBulkDelete"
            @cancel="showBulkDeleteModal = false" />

        <!-- Schema Change Warning Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="showSchemaWarning && schemaAnalysis"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div class="bg-surface-elevated rounded-xl shadow-2xl shadow-black/10 border border-border max-w-lg w-full mx-4 overflow-hidden">
                        <div class="px-6 py-4 border-b border-border-light flex items-center gap-2">
                            <svg class="h-5 w-5 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                            <h3 class="text-base font-semibold text-text-primary tracking-tight">Schema change impacts</h3>
                        </div>
                        <div class="px-6 py-5 space-y-4 max-h-[50vh] overflow-y-auto">
                            <!-- Removed fields -->
                            <div v-if="schemaAnalysis.removedFields.length > 0">
                                <h4 class="text-sm font-medium text-red-600 mb-2">Removed fields with existing data</h4>
                                <div class="space-y-1.5">
                                    <div v-for="field in schemaAnalysis.removedFields" :key="field.key"
                                        class="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                                        <div>
                                            <span class="text-sm font-medium text-red-800">{{ field.name }}</span>
                                            <span class="text-xs text-red-600 ml-1">({{ field.key }})</span>
                                        </div>
                                        <span class="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">
                                            {{ field.affectedRecords }} records affected
                                        </span>
                                    </div>
                                </div>
                                <p class="text-xs text-text-muted mt-1.5">Data in these fields will become inaccessible after the schema change.</p>
                            </div>

                            <!-- Type changes -->
                            <div v-if="schemaAnalysis.typeChanges.length > 0">
                                <h4 class="text-sm font-medium text-amber-600 mb-2">Type changes</h4>
                                <div class="space-y-1.5">
                                    <div v-for="change in schemaAnalysis.typeChanges" :key="change.key"
                                        class="px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                                        <div class="flex items-center justify-between">
                                            <div class="flex items-center gap-2">
                                                <span class="text-sm font-medium text-amber-800">{{ change.name }}</span>
                                                <span class="text-xs text-amber-600">
                                                    {{ change.oldType }}
                                                    <svg class="inline h-3 w-3 mx-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                                                        <path stroke-linecap="round" stroke-linejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                                    </svg>
                                                    {{ change.newType }}
                                                </span>
                                            </div>
                                            <span v-if="change.incompatibleRecords > 0"
                                                class="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                                                {{ change.incompatibleRecords }} incompatible
                                            </span>
                                            <span v-else
                                                class="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                                                All compatible
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <p class="text-xs text-text-muted mt-1.5">Incompatible values will not match the new type and may cause validation errors.</p>
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                            <Button @click="cancelSchemaChange" variant="secondary">Cancel</Button>
                            <Button @click="applySchemaChange" variant="warning" :disabled="savingSchema">
                                {{ savingSchema ? 'Applying...' : 'Apply anyway' }}
                            </Button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>

        <!-- Save View Modal -->
        <Teleport to="body">
            <Transition name="modal">
                <div v-if="showSaveViewDialog"
                    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div class="bg-surface-elevated rounded-xl shadow-2xl border border-border max-w-sm w-full mx-4 overflow-hidden">
                        <div class="px-5 py-3 border-b border-border-light">
                            <h3 class="text-sm font-semibold text-text-primary">Save View</h3>
                        </div>
                        <div class="px-5 py-4">
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Name</label>
                            <input v-model="saveViewName" type="text" placeholder="e.g. Price distribution, Sales correlation..."
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
                                @keyup.enter="handleSaveView" />
                        </div>
                        <div class="px-5 py-3 border-t border-border-light flex justify-end gap-2">
                            <button @click="showSaveViewDialog = false"
                                class="px-3 py-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg hover:bg-surface-hover transition-colors cursor-pointer">
                                Cancel
                            </button>
                            <button @click="handleSaveView" :disabled="!saveViewName.trim()"
                                class="px-3 py-1.5 text-xs font-medium bg-accent text-white rounded-lg hover:bg-accent-dark transition-colors cursor-pointer disabled:opacity-50">
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </Transition>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useDatasets, type Dataset, type DatasetRecord, type DatasetField, type DatasetChart, type CsvPreview, type ImportResult, type SchemaAnalysis } from '../services/datasets/useDatasets';
import { useNotification } from '../composables/useNotification';
import Button from '../components/ui/Button.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import DatasetRecordTable from '../components/datasets/DatasetRecordTable.vue';
import DatasetRecordForm from '../components/datasets/DatasetRecordForm.vue';
import DatasetSchemaEditor from '../components/datasets/DatasetSchemaEditor.vue';
import DatasetFilterBar from '../components/datasets/DatasetFilterBar.vue';
import DatasetChartBuilder from '../components/datasets/DatasetChartBuilder.vue';
import DatasetStatsPanel from '../components/datasets/DatasetStatsPanel.vue';
import DatasetCorrelationMatrix from '../components/datasets/DatasetCorrelationMatrix.vue';
import DatasetOutlierPanel from '../components/datasets/DatasetOutlierPanel.vue';
import DatasetPivotTable from '../components/datasets/DatasetPivotTable.vue';
import CsvImportModal from '../components/datasets/CsvImportModal.vue';
import { useDataSources } from '../services/data-sources/useDataSources';

const chartModes = [
    { id: 'chart-bar', label: 'Bar', paths: ['M4 4v16h16', 'M8 16V9', 'M12 16V4', 'M16 16v-5'] },
    { id: 'chart-line', label: 'Line', paths: ['M4 4v16h16', 'M7 12l4-5 3 3 5-6'] },
    { id: 'chart-pie', label: 'Pie', paths: ['M21.21 15.89A10 10 0 118 2.83', 'M22 12A10 10 0 0012 2v10z'] },
    { id: 'chart-scatter', label: 'Scatter', paths: ['M4 4v16h16', 'M7 14h.01', 'M10 10h.01', 'M14 8h.01', 'M17 11h.01', 'M11 15h.01', 'M15 13h.01'] },
];

const analysisModes = [
    { id: 'summary', label: 'Summary', paths: ['M4 6h16', 'M4 10h16', 'M4 14h10', 'M4 18h6'] },
    { id: 'distribution', label: 'Distribution', paths: ['M4 20h16', 'M6 16v4', 'M9 12v8', 'M12 8v12', 'M15 12v8', 'M18 16v4'] },
    { id: 'time-series', label: 'Time Series', paths: ['M4 4v16h16', 'M4 16l4-4 3 2 4-6 5 4'] },
    { id: 'correlation', label: 'Correlation', paths: ['M4 4h16v16H4z', 'M4 12h16', 'M12 4v16', 'M8 8h.01', 'M16 8h.01', 'M8 16h.01', 'M16 16h.01'] },
    { id: 'outliers', label: 'Outliers', paths: ['M12 9v2m0 4h.01', 'M5.07 19h13.86a2 2 0 001.73-3L13.73 4a2 2 0 00-3.46 0L3.34 16a2 2 0 001.73 3z'] },
    { id: 'pivot', label: 'Pivot Table', paths: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'] },
];

const allModes = [...chartModes, ...analysisModes] as { id: string; label: string; paths: string[] }[];
const statsOps = ['summary', 'distribution', 'time-series'];
const isChartMode = computed(() => visualMode.value.startsWith('chart-'));

const TabIcon = (paths: string[]) => ({
    render: () => h('svg', { class: 'h-3.5 w-3.5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' },
        paths.map(d => h('path', { d })))
});

const tabs = [
    { key: 'data', label: 'Data', icon: TabIcon(['M3 10h18M3 14h18M3 6h18M3 18h18']) },
    { key: 'charts', label: 'Charts & Analysis', icon: TabIcon(['M4 4v16h16', 'M8 16V9', 'M12 16V4', 'M16 16v-5']) },
    { key: 'saved', label: 'Saved', icon: TabIcon(['M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z']) },
];

const route = useRoute();
const router = useRouter();
const notification = useNotification();
const {
    getDataset, updateDataset,
    getRecords, createRecord, updateRecord,
    uploadCsvPreview, confirmCsvImport,
    analyzeSchemaChange,
    requestStats, getStatsResult,
    exportDatasetCsv, bulkDeleteRecords,
    getSavedCharts, saveChart, deleteSavedChart,
} = useDatasets();
const { triggerSync } = useDataSources();

// State
const dataset = ref<Dataset | null>(null);
const records = ref<DatasetRecord[]>([]);
const totalRecords = ref(0);
const loading = ref(true);
const activeTab = ref('data');
const visualMode = ref('summary');
const preselectedChartType = ref('bar');
const syncing = ref(false);

const selectChartMode = (modeId: string) => {
    visualMode.value = modeId;
    preselectedChartType.value = modeId.replace('chart-', '');
};
const activeResult = computed(() => isChartMode.value ? chartResult.value : analysisResult.value);
const activeRunning = computed(() => isChartMode.value ? chartRunning.value : analysisRunning.value);
const activeModeName = computed(() => allModes.find(m => m.id === visualMode.value)?.label || '');

// Pagination & sorting
const page = ref(1);
const limit = ref(50);
const sortField = ref('');
const sortOrder = ref<'asc' | 'desc'>('desc');

// Filters
const filters = ref<{ field: string; operator: string; value: string }[]>([]);
const searchTerm = ref('');

// Schema editing
const editableSchema = ref<DatasetField[]>([]);
const editableName = ref('');
const editableDescription = ref('');
const savingSchema = ref(false);
const schemaAnalysis = ref<SchemaAnalysis | null>(null);
const analyzingSchema = ref(false);
const showSchemaWarning = ref(false);

// Record table ref
const recordTableRef = ref<any>(null);

// Record form
const showRecordForm = ref(false);

// CSV import
const showImportModal = ref(false);


// Bulk delete
const showBulkDeleteModal = ref(false);
const bulkDeleteIds = ref<number[]>([]);

// Saved charts
const savedCharts = ref<DatasetChart[]>([]);
const savedSearch = ref('');
const savedTypeFilter = ref('');

const filteredSavedViews = computed(() => {
    let views = savedCharts.value;
    if (savedTypeFilter.value) {
        views = views.filter(sv => inferVisualMode(sv.config) === savedTypeFilter.value);
    }
    if (savedSearch.value.trim()) {
        const q = savedSearch.value.trim().toLowerCase();
        views = views.filter(sv => sv.name.toLowerCase().includes(q));
    }
    return views;
});

const datasetId = Number(route.params.id);

const loadRecords = async () => {
    if (!dataset.value) return;
    const params: Record<string, any> = {
        page: page.value,
        limit: limit.value,
    };

    if (sortField.value) {
        params.sort = sortField.value;
        params.order = sortOrder.value;
    }

    if (searchTerm.value) {
        params.search = searchTerm.value;
    }

    for (const f of filters.value) {
        if (f.field && f.value) {
            params[`filter[${f.field}_${f.operator}]`] = f.value;
        }
    }

    const result = await getRecords(datasetId, params);
    records.value = result.records;
    totalRecords.value = result.total;
};

const handleSync = async () => {
    const ds = dataset.value?.dataSources?.[0];
    if (!ds) return;
    syncing.value = true;
    try {
        await triggerSync(ds.id);
        notification.success('Sync started');
        dataset.value = await getDataset(datasetId);
        await loadRecords();
    } catch {
        notification.error('Failed to trigger sync');
    } finally {
        syncing.value = false;
    }
};

const changePage = (newPage: number) => {
    page.value = newPage;
    loadRecords();
};

const toggleSort = (field: string) => {
    if (sortField.value === field) {
        sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc';
    } else {
        sortField.value = field;
        sortOrder.value = 'asc';
    }
    loadRecords();
};

const applyFilters = () => {
    page.value = 1;
    loadRecords();
};

// Schema
const saveSchema = async () => {
    if (!dataset.value) return;

    analyzingSchema.value = true;
    try {
        const analysis = await analyzeSchemaChange(dataset.value.id, editableSchema.value);
        schemaAnalysis.value = analysis;

        if (!analysis.safe) {
            showSchemaWarning.value = true;
            return;
        }

        await applySchemaChange();
    } catch {
        notification.error('Failed to analyze schema changes');
    } finally {
        analyzingSchema.value = false;
    }
};

const applySchemaChange = async () => {
    if (!dataset.value) return;
    showSchemaWarning.value = false;
    savingSchema.value = true;
    try {
        dataset.value = await updateDataset(dataset.value.id, {
            name: editableName.value.trim() || dataset.value.name,
            description: editableDescription.value.trim() || undefined,
            schema: editableSchema.value,
        });
        editableName.value = dataset.value.name;
        editableDescription.value = dataset.value.description || '';
        editableSchema.value = [...dataset.value.schema];
        schemaAnalysis.value = null;
        notification.success('Schema updated');
    } catch {
        notification.error('Failed to update schema');
    } finally {
        savingSchema.value = false;
    }
};

const cancelSchemaChange = () => {
    showSchemaWarning.value = false;
    schemaAnalysis.value = null;
};

// Record CRUD
const handleSaveRecord = async (data: Record<string, any>) => {
    try {
        await createRecord(datasetId, data);
        notification.success('Record created');
        showRecordForm.value = false;
        await loadRecords();
    } catch {
        notification.error('Failed to create record');
    }
};

// Inline update
const handleInlineUpdate = async (recordId: number, data: Record<string, any>) => {
    try {
        await updateRecord(datasetId, recordId, data);
        notification.success('Record updated');
        await loadRecords();
    } catch {
        notification.error('Failed to update record');
    }
};

// Bulk delete
const confirmBulkDelete = (ids: number[]) => {
    bulkDeleteIds.value = ids;
    showBulkDeleteModal.value = true;
};

const handleBulkDelete = async () => {
    showBulkDeleteModal.value = false;
    if (!bulkDeleteIds.value.length) return;
    try {
        const result = await bulkDeleteRecords(datasetId, bulkDeleteIds.value);
        notification.success(`${result.deleted} records deleted`);
        bulkDeleteIds.value = [];
        await loadRecords();
    } catch {
        notification.error('Failed to delete records');
    }
};

// Export CSV
const handleExportCsv = async () => {
    try {
        await exportDatasetCsv(datasetId);
        notification.success('CSV exported');
    } catch {
        notification.error('Failed to export CSV');
    }
};

// CSV Import
const handleCsvUpload = async (file: File, callback: (preview: CsvPreview) => void) => {
    try {
        const preview = await uploadCsvPreview(datasetId, file);
        callback(preview);
    } catch {
        notification.error('Failed to parse CSV');
    }
};

const handleCsvConfirm = async (file: File, mappings: { csvColumn: string; fieldKey: string }[], callback: (result: ImportResult) => void) => {
    try {
        const result = await confirmCsvImport(datasetId, file, mappings);
        callback(result);
    } catch {
        notification.error('Failed to import CSV');
    }
};

const handleImported = () => {
    loadRecords();
};

// Generic async job runner
const createJobRunner = (errorMsg: string) => {
    const result = ref<Record<string, any> | null>(null);
    const running = ref(false);
    const lastOperation = ref('');
    const lastParams = ref<Record<string, any>>({});
    let timer: ReturnType<typeof setInterval> | null = null;

    const run = async (operation: string, params: Record<string, any>) => {
        running.value = true;
        result.value = null;
        lastOperation.value = operation;
        lastParams.value = { ...params };
        if (timer) clearInterval(timer);
        try {
            const { jobId } = await requestStats(datasetId, operation, params);
            timer = setInterval(async () => {
                try {
                    const { status, result: r } = await getStatsResult(datasetId, jobId);
                    if (status === 'completed' || status === 'processed') {
                        result.value = r;
                        running.value = false;
                        if (timer) clearInterval(timer);
                    } else if (status === 'failed') {
                        result.value = { error: errorMsg };
                        running.value = false;
                        if (timer) clearInterval(timer);
                    }
                } catch { /* keep polling */ }
            }, 2000);
        } catch {
            notification.error(errorMsg);
            running.value = false;
        }
    };

    return { result, running, run, lastOperation, lastParams };
};

// Charts
const { result: chartResult, running: chartRunning, run: runChart, lastParams: lastChartParams } = createJobRunner('Chart generation failed');

const activeChartFilters = computed(() => {
    return filters.value
        .filter(f => f.field && f.value)
        .map(f => ({ field: f.field, operator: f.operator, value: f.value }));
});

const runChartWithFilters = (operation: string, params: Record<string, any>) => {
    const filtersPayload = activeChartFilters.value;
    if (filtersPayload.length > 0) {
        params.filters = filtersPayload;
    }
    if (searchTerm.value) {
        params.search = searchTerm.value;
    }
    runChart(operation, params);
};

// Saved views (charts + analysis)
const showSaveViewDialog = ref(false);
const saveViewName = ref('');

const loadSavedCharts = async () => {
    try {
        savedCharts.value = await getSavedCharts(datasetId);
    } catch { /* ignore */ }
};

const handleSaveChart = async (name: string, config: Record<string, any>) => {
    config.visualMode = visualMode.value;
    try {
        const chart = await saveChart(datasetId, name, config);
        savedCharts.value.unshift(chart);
        notification.success(`"${name}" saved`);
    } catch {
        notification.error('Failed to save');
    }
};

const handleSaveView = async () => {
    if (!saveViewName.value.trim() || !activeResult.value) return;
    const config: Record<string, any> = {};
    if (isChartMode.value) {
        Object.assign(config, lastChartParams.value);
    } else {
        config.operation = lastAnalysisOp.value || (isChartMode.value ? 'summary' : visualMode.value);
        config.params = { ...lastAnalysisParams.value };
    }
    // Set visualMode last so it's never overwritten
    config.visualMode = visualMode.value;
    try {
        const chart = await saveChart(datasetId, saveViewName.value.trim(), config);
        savedCharts.value.unshift(chart);
        notification.success(`"${saveViewName.value.trim()}" saved`);
        showSaveViewDialog.value = false;
        saveViewName.value = '';
    } catch {
        notification.error('Failed to save view');
    }
};

const loadSavedView = (sv: DatasetChart) => {
    const mode = inferVisualMode(sv.config);
    visualMode.value = mode;
    if (mode.startsWith('chart-')) {
        preselectedChartType.value = mode.replace('chart-', '');
    }
    // Re-run with saved config
    if (mode.startsWith('chart-')) {
        runChartWithFilters('chart', sv.config);
    } else {
        const operation = sv.config.operation || mode;
        runAnalysis(operation, sv.config.params || {});
    }
};

const loadAndNavigate = (sv: DatasetChart) => {
    activeTab.value = 'charts';
    loadSavedView(sv);
};

const inferVisualMode = (config: Record<string, any>): string => {
    if (config.visualMode) return config.visualMode;
    // Legacy: infer from operation or chartType
    const op = config.operation;
    if (op && ['summary', 'distribution', 'time-series', 'correlation', 'outliers', 'pivot'].includes(op)) return op;
    const ct = config.chartType;
    if (ct && ['bar', 'line', 'pie', 'scatter'].includes(ct)) return `chart-${ct}`;
    return 'chart-bar';
};

const savedViewsForCurrentMode = computed(() => {
    return savedCharts.value.filter(sv => inferVisualMode(sv.config) === visualMode.value);
});

const savedViewLabel = (sv: DatasetChart): string => {
    return allModes.find(m => m.id === inferVisualMode(sv.config))?.label || 'Chart';
};

const savedViewSummary = (sv: DatasetChart): string => {
    const c = sv.config;
    const params = c.params || {};
    const fieldName = (key: string) => {
        if (!key || !dataset.value) return key;
        return dataset.value.schema.find(f => f.key === key)?.name || key;
    };
    const mode = inferVisualMode(c);
    const parts: string[] = [];

    if (mode.startsWith('chart-')) {
        if (c.xField) parts.push(fieldName(c.xField));
        if (c.yField) parts.push(fieldName(c.yField));
        if (c.aggregation && c.aggregation !== 'count') parts.push(c.aggregation);
        else if (!c.yField) parts.push('count');
    } else if (mode === 'summary') {
        parts.push('All fields overview');
    } else if (mode === 'distribution') {
        if (params.field) parts.push(fieldName(params.field));
    } else if (mode === 'time-series') {
        if (params.dateField) parts.push(fieldName(params.dateField));
        if (params.valueField) parts.push(fieldName(params.valueField));
        if (params.period) {
            const periods: Record<string, string> = { D: 'daily', W: 'weekly', ME: 'monthly', QE: 'quarterly', YE: 'yearly' };
            parts.push(periods[params.period] || params.period);
        }
    } else if (mode === 'correlation') {
        if (params.fields?.length) parts.push(`${params.fields.length} fields`);
        else parts.push('Numeric fields');
    } else if (mode === 'outliers') {
        if (params.field) parts.push(fieldName(params.field));
        parts.push('IQR + Z-score');
    } else if (mode === 'pivot') {
        if (params.rowField) parts.push(fieldName(params.rowField));
        if (params.colField) parts.push(fieldName(params.colField));
        if (params.fn) parts.push(params.fn);
    }

    if (parts.length === 0) return new Date(sv.createdAt).toLocaleDateString();
    return parts.join(' · ');
};

const handleDeleteSavedChart = async (chartId: number) => {
    try {
        await deleteSavedChart(chartId);
        savedCharts.value = savedCharts.value.filter(c => c.id !== chartId);
        notification.success('View deleted');
    } catch {
        notification.error('Failed to delete view');
    }
};

// Analysis (unified runner for all analysis operations)
const { result: analysisResult, running: analysisRunning, run: runAnalysis, lastParams: lastAnalysisParams, lastOperation: lastAnalysisOp } = createJobRunner('Analysis failed');

onMounted(async () => {
    try {
        dataset.value = await getDataset(datasetId);
        editableSchema.value = [...dataset.value.schema];
        editableName.value = dataset.value.name;
        editableDescription.value = dataset.value.description || '';
        await Promise.all([
            loadRecords(),
            loadSavedCharts(),
        ]);
    } catch {
        notification.error('Failed to load dataset');
    } finally {
        loading.value = false;
    }
});
</script>
