<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Top bar: breadcrumb + canvas name -->
    <div class="flex-shrink-0 pb-3">
      <Breadcrumb :items="breadcrumbItems" />
      <div class="flex items-center gap-3 mt-1">
        <input id="canvasName" v-model="canvasData.name" type="text" required placeholder="Canvas name..."
          class="flex-1 px-4 py-2 bg-transparent border-0 border-b border-border text-lg font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors tracking-tight"
          @blur="handleNameChange" />
        <Button v-if="!isNewCanvas" variant="danger" size="small" @click="removeCanvasConfirm">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove
        </Button>
      </div>
    </div>

    <!-- Toolbar + Canvas + AI Panel -->
    <div class="flex-1 min-h-0 flex">
      <div class="flex-1 min-h-0 flex flex-col">
        <CanvasToolbar :is-saving="isSaving" :saved-successfully="savedSuccessfully"
          :pending-tool="pendingTool?.type || null" :ai-panel-open="showAiPanel"
          @select-tool="onSelectTool" @clear-tool="pendingTool = null"
          @pick-doc="openDocPicker" @pick-resource="openResourcePicker"
          @pick-image="openImageModal" @pick-infographic="openInfographicModal"
          @export="handleExport" @toggle-ai-panel="showAiPanel = !showAiPanel" />
        <div class="flex-1 min-h-0 rounded-lg border border-border overflow-hidden">
          <CanvasEditor ref="canvasEditorRef" :canvas-data="canvasData.canvasData"
            :pending-tool="pendingTool"
            @canvas-change="handleCanvasChange" @edit-image="handleEditImage"
            @node-placed="pendingTool = null" @node-selected="handleNodeSelected" />
        </div>
      </div>
      <AiImagePanel v-if="showAiPanel" :canvas-id="canvasData.id" :project-id="projectStore.currentProject?.id" :selected-image-node="selectedImageNodeForAi"
        @close="showAiPanel = false" @add-to-canvas="handleAddGeneratedImage"
        @replace-image="handleReplaceImage" />
    </div>

    <!-- Confirm Remove Modal -->
    <ConfirmModal :is-open="showRemoveModal" title="Remove Canvas"
      message="Are you sure you want to remove this canvas?" confirm-text="Remove" cancel-text="Cancel"
      confirm-variant="danger" @confirm="handleRemoveConfirm" @cancel="showRemoveModal = false" />

    <!-- Document Picker Modal -->
    <Modal v-model="showDocPicker" :title="pickerSelectedItem ? pickerSelectedItem.name : 'Select Document'"
      :wide="!!pickerSelectedItem">
      <!-- Step 1: List -->
      <div v-if="!pickerSelectedItem" class="flex flex-col gap-1 max-h-64 overflow-y-auto">
        <div v-if="projectDocs.length === 0" class="py-4 text-center text-sm text-text-muted">
          No documents in this project
        </div>
        <button v-for="doc in projectDocs" :key="doc.id" @click="loadDocContent(doc)"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors text-left cursor-pointer w-full">
          <svg class="h-4 w-4 shrink-0 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="text-sm text-text-primary truncate">{{ doc.name }}</span>
        </button>
      </div>
      <!-- Step 2: Content viewer with TOC sidebar -->
      <div v-else class="flex flex-col gap-2 h-full min-h-0">
        <div class="flex items-center gap-2 shrink-0">
          <button @click="pickerSelectedItem = null" class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="flex-1 relative">
            <input v-model="pickerSearch" type="text" placeholder="Search in content..."
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              @keydown.enter.prevent="navigateSearchResult" />
            <span v-if="pickerSearch.trim() && pickerSearchCount > 0"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
              {{ Math.min(pickerSearchIndex, pickerSearchCount) }}/{{ pickerSearchCount }}
            </span>
          </div>
        </div>
        <p class="text-[10px] text-text-muted shrink-0">Select a fragment of text, or click "Add" for the whole document.</p>
        <div class="flex gap-4 flex-1 min-h-0">
          <!-- Content -->
          <div ref="fragmentContentRef"
            class="flex-1 min-w-0 overflow-y-auto border border-border rounded-lg p-5 text-sm text-text-primary picker-content select-text cursor-text"
            v-html="pickerHighlightedContent"></div>
          <!-- TOC sidebar -->
          <div v-if="pickerHeadings.length > 0" class="w-64 shrink-0 overflow-y-auto border-l border-border pl-4">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Contents</p>
            <div class="flex flex-col gap-1">
              <button v-for="(h, i) in pickerHeadings" :key="i" @click="scrollToHeading(h)"
                class="text-left text-xs px-2 py-1.5 rounded text-text-secondary hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                :class="{ 'pl-4': h.tag === 'h2', 'pl-6': h.tag === 'h3', 'pl-8': h.tag === 'h4' }"
                :title="h.text">
                <span class="line-clamp-2">{{ h.text }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <template v-if="pickerSelectedItem" #footer>
        <Button variant="secondary" size="small" @click="showDocPicker = false; pickerSelectedItem = null">Cancel</Button>
        <Button size="small" @click="confirmFragment('docRef')">Add</Button>
      </template>
    </Modal>

    <!-- Resource Picker Modal -->
    <Modal v-model="showResourcePicker" :title="pickerSelectedItem ? pickerSelectedItem.name : 'Select Resource'"
      :wide="!!pickerSelectedItem">
      <!-- Step 1: List -->
      <div v-if="!pickerSelectedItem" class="flex flex-col gap-1 max-h-64 overflow-y-auto">
        <div v-if="projectResources.length === 0" class="py-4 text-center text-sm text-text-muted">
          No resources in this project
        </div>
        <button v-for="res in projectResources" :key="res.id" @click="loadResourceContent(res)"
          class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors text-left cursor-pointer w-full">
          <svg class="h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <div class="min-w-0 flex-1">
            <p class="text-sm text-text-primary truncate">{{ res.title || res.name }}</p>
            <p v-if="res.mimeType" class="text-xs text-text-muted">{{ res.mimeType }}</p>
          </div>
        </button>
      </div>
      <!-- Step 2: Content viewer with TOC sidebar -->
      <div v-else class="flex flex-col gap-2 h-full min-h-0">
        <div class="flex items-center gap-2 shrink-0">
          <button @click="pickerSelectedItem = null" class="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-hover cursor-pointer transition-colors">
            <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div class="flex-1 relative">
            <input v-model="pickerSearch" type="text" placeholder="Search in content..."
              class="w-full px-3 py-1.5 text-xs rounded-lg border border-border bg-surface-base text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
              @keydown.enter.prevent="navigateSearchResult" />
            <span v-if="pickerSearch.trim() && pickerSearchCount > 0"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-muted">
              {{ Math.min(pickerSearchIndex, pickerSearchCount) }}/{{ pickerSearchCount }}
            </span>
          </div>
        </div>
        <p class="text-[10px] text-text-muted shrink-0">Select a fragment of text, or click "Add" for the whole document.</p>
        <div class="flex gap-4 flex-1 min-h-0">
          <!-- Content -->
          <div ref="fragmentContentRef"
            class="flex-1 min-w-0 overflow-y-auto border border-border rounded-lg p-5 text-sm text-text-primary picker-content select-text cursor-text"
            v-html="pickerHighlightedContent"></div>
          <!-- TOC sidebar -->
          <div v-if="pickerHeadings.length > 0" class="w-64 shrink-0 overflow-y-auto border-l border-border pl-4">
            <p class="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-3">Contents</p>
            <div class="flex flex-col gap-1">
              <button v-for="(h, i) in pickerHeadings" :key="i" @click="scrollToHeading(h)"
                class="text-left text-xs px-2 py-1.5 rounded text-text-secondary hover:text-accent hover:bg-accent-subtle transition-colors cursor-pointer"
                :class="{ 'pl-4': h.tag === 'h2', 'pl-6': h.tag === 'h3', 'pl-8': h.tag === 'h4' }"
                :title="h.text">
                <span class="line-clamp-2">{{ h.text }}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <template v-if="pickerSelectedItem" #footer>
        <Button variant="secondary" size="small" @click="showResourcePicker = false; pickerSelectedItem = null">Cancel</Button>
        <Button size="small" @click="confirmFragment('resourceRef')">Add</Button>
      </template>
    </Modal>

    <!-- Image Modal -->
    <Modal v-model="showImageModal" title="Add Image">
      <div class="flex flex-col gap-3">
        <!-- Tabs -->
        <div class="flex gap-1 border-b border-border">
          <button v-for="tab in imageTabs" :key="tab.id" @click="imageTab = tab.id"
            class="px-3 py-2 text-xs font-medium transition-colors cursor-pointer"
            :class="imageTab === tab.id
              ? 'text-accent border-b-2 border-accent'
              : 'text-text-muted hover:text-text-secondary'">
            {{ tab.label }}
          </button>
        </div>

        <!-- URL tab -->
        <div v-if="imageTab === 'url'">
          <input v-model="imageUrl" type="text" placeholder="https://example.com/image.png"
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            @keydown.enter="confirmImage" />
        </div>

        <!-- File tab -->
        <div v-if="imageTab === 'file'">
          <label
            class="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-accent hover:bg-accent-subtle/30 transition-colors">
            <svg class="h-8 w-8 text-text-muted mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span class="text-sm text-text-muted">Click to select an image</span>
            <input type="file" accept="image/*" class="hidden" @change="handleFileSelect" />
          </label>
        </div>

        <!-- Project resources tab -->
        <div v-if="imageTab === 'project'" class="max-h-48 overflow-y-auto flex flex-col gap-1">
          <div v-if="imageResources.length === 0" class="py-4 text-center text-sm text-text-muted">
            No images in this project
          </div>
          <button v-for="res in imageResources" :key="res.id" @click="selectImageResource(res)"
            class="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-surface-hover transition-colors text-left cursor-pointer w-full">
            <img :src="getResourceViewUrl(res.id)" alt="" class="w-10 h-10 object-cover rounded border border-border" />
            <span class="text-sm text-text-primary truncate">{{ res.title || res.name }}</span>
          </button>
        </div>

        <!-- Preview -->
        <div v-if="imageUrl" class="rounded-lg border border-border overflow-hidden bg-surface-base">
          <img :src="imageUrl" alt="Preview" class="max-h-40 mx-auto object-contain"
            @error="imagePreviewError = true" @load="imagePreviewError = false" />
          <p v-if="imagePreviewError" class="text-xs text-red-500 text-center py-2">Could not load image</p>
        </div>
      </div>
      <template #footer>
        <Button variant="secondary" size="small" @click="showImageModal = false">Cancel</Button>
        <Button size="small" @click="confirmImage" :disabled="!imageUrl.trim()">Add</Button>
      </template>
    </Modal>
    <!-- Infographic Config Modal -->
    <Modal v-model="showInfographicModal" :title="infographicModalTitle" :wide="true">
      <div class="flex flex-col gap-4">

        <!-- StatCard config -->
        <template v-if="infographicType === 'statCard'">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Data Source</label>
              <select v-model="infographicConfig.statMetric"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent">
                <option value="resourceCount">Resource Count</option>
                <option value="docCount">Document Count</option>
                <option value="entityCount">Entity Count</option>
                <option value="bibliographyCount">Bibliography Count</option>
                <option value="noteCount">Note Count</option>
                <option value="datasetCount">Dataset Count</option>
                <option value="custom">Custom Value</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Label</label>
              <input v-model="infographicConfig.label" type="text" placeholder="e.g. Resources"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div v-if="infographicConfig.statMetric === 'custom'" class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Value</label>
              <input v-model="infographicConfig.customValue" type="text" placeholder="42"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Icon (emoji)</label>
              <input v-model="infographicConfig.icon" type="text" placeholder="📄"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
          </div>
        </template>

        <!-- Chart config -->
        <template v-if="infographicType === 'chart'">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Data Source</label>
              <select v-model="infographicConfig.chartSource"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent">
                <option value="bibliographyByYear">Bibliography by Year</option>
                <option value="bibliographyByType">Bibliography by Type</option>
                <option value="topKeywords">Top Keywords</option>
                <option value="topEntities">Top Entities</option>
                <option value="topAuthors">Top Authors</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Chart Type</label>
              <select v-model="infographicConfig.chartType"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent">
                <option value="bar">Bar</option>
                <option value="line">Line</option>
                <option value="pie">Pie</option>
                <option value="doughnut">Doughnut</option>
              </select>
            </div>
          </div>
          <div>
            <label class="text-xs font-medium text-text-secondary mb-1 block">Title</label>
            <input v-model="infographicConfig.title" type="text" placeholder="Chart title"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
        </template>

        <!-- List config -->
        <template v-if="infographicType === 'list'">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Data Source</label>
              <select v-model="infographicConfig.listSource"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent">
                <option value="topKeywords">Top Keywords</option>
                <option value="topEntities">Top Entities</option>
                <option value="topAuthors">Top Authors</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Max Items</label>
              <input v-model.number="infographicConfig.maxItems" type="number" min="3" max="20"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <input v-model="infographicConfig.showBars" type="checkbox" id="showBars" class="accent-accent" />
            <label for="showBars" class="text-xs text-text-secondary">Show progress bars</label>
          </div>
          <div>
            <label class="text-xs font-medium text-text-secondary mb-1 block">Title</label>
            <input v-model="infographicConfig.title" type="text" placeholder="List title"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
        </template>

        <!-- WordCloud config -->
        <template v-if="infographicType === 'wordCloud'">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Data Source</label>
              <select v-model="infographicConfig.wordSource"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent">
                <option value="topKeywords">Keywords</option>
                <option value="topEntities">Entities</option>
              </select>
            </div>
            <div>
              <label class="text-xs font-medium text-text-secondary mb-1 block">Color Scheme</label>
              <select v-model="infographicConfig.colorScheme"
                class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent">
                <option value="default">Default</option>
                <option value="warm">Warm</option>
                <option value="cool">Cool</option>
                <option value="mono">Mono</option>
              </select>
            </div>
          </div>
        </template>

        <!-- Timeline config -->
        <template v-if="infographicType === 'timeline'">
          <div>
            <label class="text-xs font-medium text-text-secondary mb-1 block">Data Source</label>
            <select v-model="infographicConfig.timelineSource"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="timelineEvents">Project Timelines</option>
              <option value="bibliographyByYear">Bibliography by Year</option>
            </select>
          </div>
          <div>
            <label class="text-xs font-medium text-text-secondary mb-1 block">Title</label>
            <input v-model="infographicConfig.title" type="text" placeholder="Timeline title"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
        </template>

        <!-- EntityGraph config -->
        <template v-if="infographicType === 'entityGraph'">
          <div>
            <label class="text-xs font-medium text-text-secondary mb-1 block">Title</label>
            <input v-model="infographicConfig.title" type="text" placeholder="Entity Graph"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
          <p class="text-xs text-text-muted">
            Shows a co-occurrence graph of entities found across your project's resources.
          </p>
        </template>

        <!-- QuoteCard config -->
        <template v-if="infographicType === 'quoteCard'">
          <div>
            <label class="text-xs font-medium text-text-secondary mb-1 block">Source</label>
            <select v-model="infographicConfig.quoteSource"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent">
              <option value="keyPoints">Key Point from Resources</option>
              <option value="custom">Custom Text</option>
            </select>
          </div>
          <div v-if="infographicConfig.quoteSource === 'keyPoints' && projectStats?.keyPoints?.length">
            <label class="text-xs font-medium text-text-secondary mb-1 block">Select Key Point</label>
            <div class="max-h-40 overflow-y-auto space-y-1">
              <button v-for="(kp, i) in projectStats.keyPoints" :key="i"
                @click="infographicConfig.selectedKeyPoint = i"
                class="w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors cursor-pointer"
                :class="infographicConfig.selectedKeyPoint === i ? 'bg-accent-subtle text-accent' : 'hover:bg-surface-hover text-text-primary'">
                <span class="line-clamp-2">{{ kp.text }}</span>
                <span class="text-[10px] text-text-muted block mt-0.5">— {{ kp.source }}</span>
              </button>
            </div>
          </div>
          <div v-if="infographicConfig.quoteSource === 'custom'">
            <label class="text-xs font-medium text-text-secondary mb-1 block">Quote Text</label>
            <textarea v-model="infographicConfig.customText" rows="3"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent resize-none"
              placeholder="Enter your quote..." />
            <label class="text-xs font-medium text-text-secondary mb-1 block mt-2">Attribution</label>
            <input v-model="infographicConfig.customSource" type="text" placeholder="Source name"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent" />
          </div>
        </template>

        <!-- Loading / stats status -->
        <div v-if="loadingStats" class="flex items-center gap-2 text-xs text-text-muted">
          <svg class="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Loading project data...
        </div>
      </div>
      <template #footer>
        <Button variant="secondary" size="small" @click="showInfographicModal = false">Cancel</Button>
        <Button size="small" @click="confirmInfographic" :disabled="loadingStats">Add</Button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useCanvas } from '../services/canvas/useCanvas';
import { useThread } from '../services/threads/useThread';
import { useDocument } from '../services/documents/useDocument';
import { useDocumentProjectList } from '../services/documents/useDocumentProjectList';
import { useResourceList } from '../services/resources/useResourceList';
import { useResource } from '../services/resources/useResource';
import { useProjectStore } from '../store/projectStore';
import CanvasEditor from '../components/canvas/CanvasEditor.vue';
import CanvasToolbar from '../components/canvas/CanvasToolbar.vue';
import AiImagePanel from '../components/canvas/AiImagePanel.vue';
import type { GeneratedImage } from '../services/canvas/useImageGeneration';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import Button from '../components/ui/Button.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import Modal from '../components/ui/Modal/Modal.vue';
import type { CanvasData } from '../types/canvas';
import apiClient from '../services/api';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const { loadCanvas, saveCanvas, createCanvas, removeCanvas } = useCanvas();
const { loadThread } = useThread();
const { loadDocument } = useDocument();
const { loadDocumentsByProject } = useDocumentProjectList();
const { loadResourcesByProject } = useResourceList();
const { loadResource } = useResource();

const canvasEditorRef = ref(null);
const canvasData = ref<Record<string, any>>({
  name: '',
  canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
});
const thread = ref(null);
const isSaving = ref(false);
const savedSuccessfully = ref(false);
const saveTimeout = ref(null);
const showRemoveModal = ref(false);
const pendingTool = ref<{ type: string; data: Record<string, any> } | null>(null);

// Infographic state
const showInfographicModal = ref(false);
const infographicType = ref('');
const loadingStats = ref(false);
const projectStats = ref<Record<string, any> | null>(null);
const infographicConfig = ref<Record<string, any>>({});

const infographicModalTitle = computed(() => {
  const titles: Record<string, string> = {
    statCard: 'Add Stat Card',
    chart: 'Add Chart',
    list: 'Add List',
    wordCloud: 'Add Word Cloud',
    timeline: 'Add Timeline',
    entityGraph: 'Add Entity Graph',
    quoteCard: 'Add Quote Card',
  };
  return titles[infographicType.value] || 'Add Infographic';
});

const fetchProjectStats = async () => {
  const projectId = projectStore.currentProject?.id;
  if (!projectId || projectStats.value) return;
  loadingStats.value = true;
  try {
    const response = await fetch(`${apiBaseUrl}/projects/${projectId}/stats`);
    projectStats.value = await response.json();
  } catch (e) {
    console.error('Failed to load project stats:', e);
    projectStats.value = {};
  } finally {
    loadingStats.value = false;
  }
};

const openInfographicModal = async (type: string) => {
  infographicType.value = type;
  infographicConfig.value = {
    statMetric: 'resourceCount',
    label: '',
    customValue: '',
    icon: '',
    chartSource: 'bibliographyByYear',
    chartType: 'bar',
    title: '',
    listSource: 'topKeywords',
    maxItems: 10,
    showBars: true,
    wordSource: 'topKeywords',
    colorScheme: 'default',
    timelineSource: 'timelineEvents',
    quoteSource: 'keyPoints',
    selectedKeyPoint: 0,
    customText: '',
    customSource: '',
  };
  showInfographicModal.value = true;
  await fetchProjectStats();
};

const buildNodeData = (type: string): Record<string, any> => {
  const stats = projectStats.value || {};
  const cfg = infographicConfig.value;

  switch (type) {
    case 'statCard': {
      if (cfg.statMetric === 'custom') {
        return { value: cfg.customValue, label: cfg.label || 'Value', icon: cfg.icon };
      }
      const metricLabels: Record<string, string> = {
        resourceCount: 'Resources', docCount: 'Documents', entityCount: 'Entities',
        bibliographyCount: 'Bibliography', noteCount: 'Notes', datasetCount: 'Datasets',
      };
      return {
        value: Number(stats[cfg.statMetric]) || 0,
        label: cfg.label || metricLabels[cfg.statMetric] || cfg.statMetric,
      };
    }

    case 'chart': {
      const sourceData = stats[cfg.chartSource] || [];
      let labels: string[] = [];
      let values: number[] = [];

      if (cfg.chartSource === 'bibliographyByYear') {
        labels = sourceData.map((d: any) => String(d.year));
        values = sourceData.map((d: any) => d.count);
      } else if (cfg.chartSource === 'bibliographyByType') {
        labels = sourceData.map((d: any) => d.type);
        values = sourceData.map((d: any) => d.count);
      } else if (cfg.chartSource === 'topKeywords') {
        const items = sourceData.slice(0, 15);
        labels = items.map((d: any) => d.word);
        values = items.map((d: any) => d.count);
      } else if (cfg.chartSource === 'topEntities') {
        const items = sourceData.slice(0, 15);
        labels = items.map((d: any) => d.name);
        values = items.map((d: any) => d.count);
      } else if (cfg.chartSource === 'topAuthors') {
        const items = sourceData.slice(0, 15);
        labels = items.map((d: any) => d.name);
        values = items.map((d: any) => d.count);
      }

      return {
        chartType: cfg.chartType,
        title: cfg.title,
        chartData: {
          labels,
          datasets: [{ label: cfg.title || cfg.chartSource, data: values }],
        },
      };
    }

    case 'list': {
      const sourceData = stats[cfg.listSource] || [];
      const items = sourceData.slice(0, cfg.maxItems).map((d: any) => ({
        label: d.word || d.name,
        value: d.count,
      }));
      return {
        title: cfg.title || cfg.listSource.replace('top', 'Top '),
        items,
        showBars: cfg.showBars,
        maxItems: cfg.maxItems,
      };
    }

    case 'wordCloud': {
      const sourceData = stats[cfg.wordSource] || [];
      const words = sourceData.map((d: any) => ({
        text: d.word || d.name,
        weight: d.count || 1,
      }));
      return {
        words,
        colorScheme: cfg.colorScheme,
        title: cfg.title,
      };
    }

    case 'timeline': {
      if (cfg.timelineSource === 'timelineEvents') {
        return {
          title: cfg.title || 'Timeline',
          events: (stats.timelineEvents || []).map((e: any) => ({
            date: e.date,
            label: e.label,
            endDate: e.endDate,
          })),
        };
      } else {
        // bibliographyByYear as timeline events
        return {
          title: cfg.title || 'Bibliography Timeline',
          events: (stats.bibliographyByYear || []).map((d: any) => ({
            date: `${d.year}-01-01`,
            label: `${d.count} publication${d.count !== 1 ? 's' : ''}`,
          })),
        };
      }
    }

    case 'entityGraph': {
      const topEnts = (stats.topEntities || []).slice(0, 20);
      const cooc = stats.entityCooccurrence || [];
      const entNames = new Set(topEnts.map((e: any) => e.name));
      const filteredLinks = cooc.filter((l: any) => entNames.has(l.source) && entNames.has(l.target));
      return {
        title: cfg.title || 'Entity Network',
        entities: topEnts.map((e: any) => ({ id: e.name, name: e.name, type: e.type })),
        links: filteredLinks,
      };
    }

    case 'quoteCard': {
      if (cfg.quoteSource === 'custom') {
        return { text: cfg.customText, source: cfg.customSource };
      }
      const kp = stats.keyPoints?.[cfg.selectedKeyPoint];
      return {
        text: kp?.text || 'No key points available',
        source: kp?.source || '',
      };
    }

    default:
      return {};
  }
};

const confirmInfographic = () => {
  const data = buildNodeData(infographicType.value);
  if (canvasEditorRef.value) {
    canvasEditorRef.value.addNode(infographicType.value, data);
  }
  showInfographicModal.value = false;
};

// Picker state
const showDocPicker = ref(false);
const showResourcePicker = ref(false);
const showImageModal = ref(false);
const imageUrl = ref('');
const imagePreviewError = ref(false);
const imageTab = ref<'url' | 'file' | 'project'>('url');
const imageResources = ref<Record<string, any>[]>([]);
const editingImageNodeId = ref<string | null>(null);

// AI Image Panel
const showAiPanel = ref(false);
const selectedImageNodeForAi = ref<{ id: string; data: Record<string, any> } | null>(null);
const projectDocs = ref<Record<string, any>[]>([]);
const projectResources = ref<Record<string, any>[]>([]);
const pickerSelectedItem = ref<{ id: number; name: string; htmlContent: string; type: 'doc' | 'resource' } | null>(null);
const fragmentContentRef = ref<HTMLElement | null>(null);
const pickerSearch = ref('');
const pickerSearchIndex = ref(0);

const pickerSearchCount = computed(() => {
  if (!fragmentContentRef.value || !pickerSearch.value.trim()) return 0;
  return fragmentContentRef.value.querySelectorAll('mark').length;
});

const navigateSearchResult = () => {
  if (!fragmentContentRef.value || !pickerSearch.value.trim()) return;
  const marks = fragmentContentRef.value.querySelectorAll('mark');
  if (marks.length === 0) return;

  // Clear previous active
  marks.forEach((m) => m.classList.remove('ring-2', 'ring-accent'));

  pickerSearchIndex.value = pickerSearchIndex.value % marks.length;
  const target = marks[pickerSearchIndex.value];
  target.classList.add('ring-2', 'ring-accent');
  target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  pickerSearchIndex.value++;
};

watch(pickerSearch, () => {
  pickerSearchIndex.value = 0;
});

const pickerHeadings = computed(() => {
  if (!pickerSelectedItem.value) return [];
  const tmp = document.createElement('div');
  tmp.innerHTML = pickerSelectedItem.value.htmlContent;
  const headings: { text: string; tag: string }[] = [];
  tmp.querySelectorAll('h1, h2, h3, h4').forEach((el) => {
    const text = el.textContent?.trim();
    if (text) headings.push({ text, tag: el.tagName.toLowerCase() });
  });
  return headings;
});

const pickerHighlightedContent = computed(() => {
  if (!pickerSelectedItem.value) return '';
  const html = pickerSelectedItem.value.htmlContent;
  if (!pickerSearch.value.trim()) return html;
  const term = pickerSearch.value.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${term})`, 'gi');
  return html.replace(/>([^<]*)</g, (match: string, text: string) => {
    return '>' + text.replace(regex, '<mark class="bg-amber-200/60 rounded px-0.5">$1</mark>') + '<';
  });
});

const scrollToHeading = (heading: { text: string }) => {
  if (!fragmentContentRef.value) return;
  const els = fragmentContentRef.value.querySelectorAll('h1, h2, h3, h4');
  for (const el of els) {
    if (el.textContent?.trim() === heading.text) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      break;
    }
  }
};

const imageTabs = [
  { id: 'url' as const, label: 'URL' },
  { id: 'file' as const, label: 'Local file' },
  { id: 'project' as const, label: 'Project' },
];

const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const getResourceViewUrl = (id: number) => `${apiBaseUrl}/resources/${id}/view`;

const isNewCanvas = computed(() => route.params.id === 'new');

const breadcrumbItems = computed(() => {
  const items = [];
  items.push({
    name: projectStore.currentProject.name,
    path: `/project/${projectStore.currentProject.id}`,
  });
  if (thread.value) {
    items.push({
      name: thread.value.name,
      path: `/thread/${thread.value.id}`,
    });
  }
  items.push({
    name: isNewCanvas.value ? 'New Canvas' : canvasData.value.name || 'Canvas',
  });
  return items;
});

onMounted(async () => {
  const id = route.params.id;

  if (!isNewCanvas.value) {
    canvasData.value = await loadCanvas(String(id));
  }

  let threadId: string | number | undefined = route.query.threadId || canvasData.value?.thread;
  let projectId: string | number | undefined = route.query.projectId || projectStore.currentProject.id;

  try {
    if (threadId) {
      thread.value = await loadThread(threadId);
      if (thread.value && thread.value.project) {
        projectId = thread.value.project;
      }
    }
  } catch (error) {
    console.error('Error loading hierarchy data for breadcrumbs:', error);
  }

  if (isNewCanvas.value) {
    canvasData.value = {
      name: '',
      canvasData: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
      thread: threadId ? Number(threadId) : null,
      project: projectId ? Number(projectId) : null,
    };
  }
});

const handleCanvasChange = (data: CanvasData) => {
  if (!canvasData.value.name) return;

  if (saveTimeout.value) {
    clearTimeout(saveTimeout.value);
  }

  isSaving.value = true;
  savedSuccessfully.value = false;

  saveTimeout.value = setTimeout(async () => {
    try {
      canvasData.value.canvasData = data;

      if (isNewCanvas.value) {
        const created = await createCanvas(canvasData.value);
        canvasData.value.id = created.id;
        router.replace(`/canvas/${created.id}`);
      } else {
        await saveCanvas(canvasData.value.id, { canvasData: data });
      }
      savedSuccessfully.value = true;
    } catch (error) {
      console.error('Error saving canvas:', error);
    } finally {
      isSaving.value = false;
      setTimeout(() => {
        savedSuccessfully.value = false;
      }, 3000);
    }
  }, 1000);
};

const handleNameChange = () => {
  if (!canvasData.value.name || isNewCanvas.value) return;
  saveCanvas(canvasData.value.id, { name: canvasData.value.name });
};

const onSelectTool = (tool: string, data: Record<string, any>) => {
  pendingTool.value = { type: tool, data };
};

const handleAddNode = (type: string, data: Record<string, any>) => {
  if (canvasEditorRef.value) {
    canvasEditorRef.value.addNode(type, data);
  }
};

const handleExport = () => {
  canvasEditorRef.value?.exportAsImage();
};

// Document picker
const openDocPicker = async () => {
  pickerSelectedItem.value = null;
  const projectId = projectStore.currentProject?.id;
  if (projectId) {
    try {
      projectDocs.value = await loadDocumentsByProject(projectId);
    } catch {
      projectDocs.value = [];
    }
  }
  showDocPicker.value = true;
};

const loadDocContent = async (doc: Record<string, any>) => {
  pickerSearch.value = '';
  try {
    const full = await loadDocument(String(doc.id));
    pickerSelectedItem.value = {
      id: doc.id,
      name: doc.name,
      htmlContent: (full as any).content || '<p>No content</p>',
      type: 'doc',
    };
  } catch {
    pickerSelectedItem.value = {
      id: doc.id,
      name: doc.name,
      htmlContent: '<p>Could not load content</p>',
      type: 'doc',
    };
  }
};

const loadResourceContent = async (res: Record<string, any>) => {
  pickerSearch.value = '';
  try {
    const full = await loadResource(String(res.id));
    pickerSelectedItem.value = {
      id: res.id,
      name: res.title || res.name,
      htmlContent: full.content || '<p>No content</p>',
      type: 'resource',
    };
  } catch {
    pickerSelectedItem.value = {
      id: res.id,
      name: res.title || res.name,
      htmlContent: '<p>Could not load content</p>',
      type: 'resource',
    };
  }
};

const getSelectedText = (): string => {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return '';
  const range = selection.getRangeAt(0);
  if (!fragmentContentRef.value?.contains(range.commonAncestorContainer)) return '';
  return selection.toString().trim();
};

const confirmFragment = (nodeType: 'docRef' | 'resourceRef') => {
  if (!pickerSelectedItem.value) return;
  const selected = getSelectedText();
  const title = selected || pickerSelectedItem.value.name;

  const data: Record<string, any> = {
    title,
    ...(nodeType === 'docRef'
      ? { docId: pickerSelectedItem.value.id }
      : { resourceId: pickerSelectedItem.value.id }),
    sourceName: pickerSelectedItem.value.name,
  };

  let style: Record<string, any> | undefined;
  if (selected) {
    const len = selected.length;
    const width = Math.max(160, Math.min(320, len * 3 + 50));
    const lines = Math.ceil(len / (width / 7));
    const height = Math.max(50, lines * 18 + 40);
    style = { width: `${width}px`, height: `${height}px` };
  }

  if (canvasEditorRef.value) {
    canvasEditorRef.value.addNode(nodeType, data, style);
  }
  showDocPicker.value = false;
  showResourcePicker.value = false;
  pickerSelectedItem.value = null;
};

// Image modal
const openImageModal = async () => {
  editingImageNodeId.value = null;
  imageUrl.value = '';
  imagePreviewError.value = false;
  imageTab.value = 'url';
  // Load image resources from project
  const projectId = projectStore.currentProject?.id;
  if (projectId) {
    try {
      const all = await loadResourcesByProject(projectId);
      imageResources.value = all.filter((r: Record<string, any>) =>
        r.mimeType && r.mimeType.startsWith('image/')
      );
    } catch {
      imageResources.value = [];
    }
  }
  showImageModal.value = true;
};

const confirmImage = () => {
  if (!imageUrl.value.trim()) return;
  if (editingImageNodeId.value) {
    canvasEditorRef.value?.updateNodeData(editingImageNodeId.value, { src: imageUrl.value.trim() });
    editingImageNodeId.value = null;
  } else {
    handleAddNode('image', { src: imageUrl.value.trim(), alt: 'Image' });
  }
  imageUrl.value = '';
  showImageModal.value = false;
};

const handleEditImage = async (nodeId: string, currentSrc: string) => {
  editingImageNodeId.value = nodeId;
  imageUrl.value = currentSrc;
  imagePreviewError.value = false;
  imageTab.value = 'url';
  const projectId = projectStore.currentProject?.id;
  if (projectId) {
    try {
      const all = await loadResourcesByProject(projectId);
      imageResources.value = all.filter((r: Record<string, any>) =>
        r.mimeType && r.mimeType.startsWith('image/')
      );
    } catch {
      imageResources.value = [];
    }
  }
  showImageModal.value = true;
};

const handleFileSelect = (e: Event) => {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    imageUrl.value = reader.result as string;
  };
  reader.readAsDataURL(file);
};

const selectImageResource = (res: Record<string, any>) => {
  imageUrl.value = getResourceViewUrl(res.id);
};

// AI Image Panel handlers
const handleNodeSelected = (node: { id: string; type: string; data: Record<string, any> } | null) => {
  if (node && node.type === 'image') {
    selectedImageNodeForAi.value = { id: node.id, data: node.data };
  } else {
    selectedImageNodeForAi.value = null;
  }
};

const handleAddGeneratedImage = (image: GeneratedImage) => {
  apiClient.post(`/resources/${image.resourceId}/promote`).catch(() => {});
  handleAddNode('image', { src: image.url, alt: image.prompt });
};

const handleReplaceImage = (nodeId: string, image: GeneratedImage) => {
  apiClient.post(`/resources/${image.resourceId}/promote`).catch(() => {});
  canvasEditorRef.value?.updateNodeData(nodeId, { src: image.url, alt: image.prompt });
};

// Resource picker
const openResourcePicker = async () => {
  pickerSelectedItem.value = null;
  const projectId = projectStore.currentProject?.id;
  if (projectId) {
    try {
      projectResources.value = await loadResourcesByProject(projectId);
    } catch {
      projectResources.value = [];
    }
  }
  showResourcePicker.value = true;
};


const removeCanvasConfirm = () => {
  showRemoveModal.value = true;
};

const handleRemoveConfirm = async () => {
  showRemoveModal.value = false;
  if (!canvasData.value.id) return;
  try {
    await removeCanvas(canvasData.value.id);
    if (thread.value) {
      router.push(`/thread/${thread.value.id}`);
    } else {
      router.push(`/project/${projectStore.currentProject.id}`);
    }
  } catch (error) {
    console.error('Failed to remove canvas:', error);
  }
};
</script>

<style>
.picker-content h1 {
  font-size: 1.5em;
  font-weight: 700;
  margin: 1em 0 0.5em;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-light);
  padding-bottom: 0.3em;
}
.picker-content h2 {
  font-size: 1.25em;
  font-weight: 600;
  margin: 0.8em 0 0.4em;
  color: var(--color-text-primary);
}
.picker-content h3 {
  font-size: 1.1em;
  font-weight: 600;
  margin: 0.7em 0 0.3em;
  color: var(--color-text-primary);
}
.picker-content h4 {
  font-size: 1em;
  font-weight: 600;
  margin: 0.6em 0 0.25em;
  color: var(--color-text-secondary);
}
.picker-content p {
  margin: 0.5em 0;
  line-height: 1.6;
}
.picker-content ul, .picker-content ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.picker-content ul { list-style-type: disc; }
.picker-content ol { list-style-type: decimal; }
.picker-content li {
  margin: 0.25em 0;
  line-height: 1.5;
}
.picker-content blockquote {
  border-left: 3px solid var(--color-accent, #6366f1);
  margin: 0.75em 0;
  padding: 0.5em 1em;
  color: var(--color-text-secondary);
  background: var(--color-surface-hover);
  border-radius: 0 0.375rem 0.375rem 0;
}
.picker-content pre {
  background: var(--color-surface-hover);
  border: 1px solid var(--color-border);
  border-radius: 0.375rem;
  padding: 0.75em 1em;
  margin: 0.75em 0;
  overflow-x: auto;
  font-size: 0.85em;
}
.picker-content code {
  background: var(--color-surface-hover);
  border-radius: 0.25rem;
  padding: 0.15em 0.35em;
  font-size: 0.9em;
}
.picker-content pre code {
  background: none;
  padding: 0;
}
.picker-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 0.75em 0;
  font-size: 0.9em;
}
.picker-content th, .picker-content td {
  border: 1px solid var(--color-border);
  padding: 0.4em 0.75em;
  text-align: left;
}
.picker-content th {
  background: var(--color-surface-hover);
  font-weight: 600;
}
.picker-content a {
  color: var(--color-accent, #6366f1);
  text-decoration: underline;
}
.picker-content img {
  max-width: 100%;
  border-radius: 0.375rem;
  margin: 0.5em 0;
}
.picker-content hr {
  border: none;
  border-top: 1px solid var(--color-border);
  margin: 1em 0;
}
.picker-content > *:first-child {
  margin-top: 0;
}
</style>
