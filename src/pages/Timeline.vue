<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- Top bar -->
    <div class="flex-shrink-0 pb-3">
      <Breadcrumb :items="breadcrumbItems" />
      <div class="flex items-center gap-3 mt-1">
        <input
          v-model="timelineData.name"
          type="text"
          placeholder="Timeline name..."
          class="flex-1 px-4 py-2 bg-transparent border-0 border-b border-border text-lg font-semibold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors tracking-tight"
          @blur="handleNameChange"
          @keydown.enter="($event.target as HTMLElement).blur()"
        />
        <span v-if="isSaving" class="text-xs text-text-muted shrink-0">Saving...</span>
        <span v-else-if="savedSuccessfully" class="text-xs text-text-muted shrink-0">Saved</span>
        <!-- Export dropdown -->
        <div v-if="!isNewTimeline && sortedEvents.length > 0" class="relative" ref="exportDropdownRef">
          <Button size="small" variant="secondary" @click="showExportMenu = !showExportMenu">
            <svg class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export
          </Button>
          <div v-if="showExportMenu" class="absolute right-0 top-full mt-1 w-48 bg-surface-elevated border border-border rounded-lg shadow-lg z-50 py-1">
            <button class="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-surface-hover transition-colors" @click="exportAsImage('download')">
              <span class="flex items-center gap-2">
                <svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Download as PNG
              </span>
            </button>
            <button class="w-full text-left px-3 py-2 text-xs text-text-primary hover:bg-surface-hover transition-colors" @click="exportAsImage('resource')">
              <span class="flex items-center gap-2">
                <svg class="h-3.5 w-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                Save as resource
              </span>
            </button>
          </div>
        </div>

        <Button v-if="!isNewTimeline" variant="danger" size="small" @click="showRemoveModal = true">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove
        </Button>
      </div>
    </div>

    <!-- Main content: timeline + panel -->
    <div class="flex-1 min-h-0 flex gap-0" :class="currentLayout === 'horizontal' ? 'flex-col' : 'flex-row'">
      <!-- Timeline area -->
      <div class="flex flex-col" :class="currentLayout === 'horizontal' ? 'flex-1 min-h-0' : 'flex-1 min-w-0'">
        <!-- Toolbar -->
        <div class="flex items-center justify-between mb-3 shrink-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-sm text-text-muted">
              {{ sortedEvents.length === 0 ? 'No events yet' : `${sortedEvents.length} event${sortedEvents.length !== 1 ? 's' : ''}` }}
            </span>

            <!-- Layout selector -->
            <div v-if="sortedEvents.length > 0" class="inline-flex bg-surface rounded-lg p-0.5 border border-border-light gap-0.5">
              <button
                v-for="layout in layoutOptions"
                :key="layout.value"
                :title="layout.label"
                class="px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1.5"
                :class="currentLayout === layout.value
                  ? 'bg-surface-elevated text-text-primary shadow-sm font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover'"
                @click="setLayout(layout.value)"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" v-html="layout.icon"></svg>
                <span>{{ layout.label }}</span>
              </button>
            </div>

            <!-- View toggles -->
            <template v-if="sortedEvents.length > 0">
              <button
                :title="showCards ? 'Compact labels' : 'Show cards'"
                class="px-2.5 py-1.5 rounded-lg text-sm transition-all border flex items-center gap-1.5"
                :class="!showCards
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'text-text-muted hover:text-text-secondary border-border hover:bg-surface-hover'"
                @click="showCards = !showCards"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path v-if="showCards" stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h8m-8 6h16" />
                  <path v-else stroke-linecap="round" stroke-linejoin="round" d="M3 10h11M3 14h7m4-8v12m4-12v12" />
                </svg>
                <span class="text-xs">{{ showCards ? 'Compact' : 'Cards' }}</span>
              </button>

              <button
                :title="showRuler ? 'Hide ruler' : 'Show ruler'"
                class="px-2.5 py-1.5 rounded-lg text-sm transition-all border flex items-center gap-1.5"
                :class="showRuler
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'text-text-muted hover:text-text-secondary border-border hover:bg-surface-hover'"
                @click="showRuler = !showRuler"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span class="text-xs">Ruler</span>
              </button>

              <button
                :title="showInlineMarks ? 'Hide inline marks' : 'Show marks on timeline'"
                class="px-2.5 py-1.5 rounded-lg text-sm transition-all border flex items-center gap-1.5"
                :class="showInlineMarks
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'text-text-muted hover:text-text-secondary border-border hover:bg-surface-hover'"
                @click="showInlineMarks = !showInlineMarks"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 12h1m4 0h1m4 0h1m4 0h1M4 6h16M4 18h16" />
                </svg>
                <span class="text-xs">Marks</span>
              </button>

              <button
                v-if="currentLayout === 'horizontal' || currentLayout === 'vertical'"
                :title="timelineData.axisBreaks ? 'Disable axis breaks' : 'Enable axis breaks'"
                class="px-2.5 py-1.5 rounded-lg text-sm transition-all border flex items-center gap-1.5"
                :class="timelineData.axisBreaks
                  ? 'bg-accent/10 text-accent border-accent/30'
                  : 'text-text-muted hover:text-text-secondary border-border hover:bg-surface-hover'"
                @click="toggleAxisBreaks"
              >
                <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span class="text-xs">Breaks</span>
              </button>
            </template>
          </div>

          <div class="flex gap-2 items-center">
            <!-- Sync indicator -->
            <template v-if="isSynced">
              <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Synced
              </div>
              <Button size="small" variant="secondary" @click="syncFromDataset" title="Refresh from dataset">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </Button>
              <Button size="small" variant="danger" @click="unsyncDataset" title="Unsync from dataset">
                <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </Button>
            </template>

            <template v-else>
              <Button size="small" variant="secondary" @click="openImportModal" :disabled="isNewTimeline && !timelineData.name">
                <svg class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Import
              </Button>
            </template>

            <Button size="small" variant="secondary" @click="openAddEpoch" :disabled="isNewTimeline && !timelineData.name">
              <svg class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 5h16v14H4V5zm4 0v14m8-14v14" />
              </svg>
              Epoch
            </Button>
            <Button v-if="!isSynced" size="small" @click="openAddEvent" :disabled="isNewTimeline && !timelineData.name">
              <svg class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Event
            </Button>
          </div>
        </div>

        <!-- Empty state -->
        <div v-if="sortedEvents.length === 0"
          class="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-border text-center py-16">
          <svg class="h-10 w-10 text-text-muted mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.25">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p class="text-sm text-text-muted">Add your first event to start building the timeline</p>
        </div>

        <!-- Timeline layout -->
        <component
          v-if="sortedEvents.length > 0"
          :is="activeLayoutComponent"
          :events="sortedEvents"
          :epochs="timelineData.epochs || []"
          :axis-breaks="timelineData.axisBreaks || false"
          :show-cards="showCards"
          :show-ruler="showRuler"
          :show-inline-marks="showInlineMarks"
          :highlighted-event-id="selectedEvent?.id || null"
          @edit-event="selectEvent"
          @edit-epoch="openEditEpoch"
          @delete-epoch="(epoch: TimelineEpoch) => deleteEpochById(epoch.id)"
        />
      </div>

      <!-- Info panel: right sidebar (vertical) or bottom panel (horizontal) -->
      <div
        v-if="sortedEvents.length > 0 || timelineData.notes"
        class="shrink-0 flex flex-col bg-surface"
        :class="currentLayout === 'horizontal'
          ? 'h-96 border-t border-border mt-1'
          : 'w-[420px] border-l border-border ml-1'"
      >
        <!-- VERTICAL MODE: tabbed sidebar -->
        <template v-if="currentLayout === 'vertical'">
          <div class="flex border-b border-border shrink-0">
            <button
              v-for="tab in sidebarTabs"
              :key="tab.id"
              class="flex-1 px-3 py-2 text-xs font-medium transition-colors text-center"
              :class="activeSidebarTab === tab.id
                ? 'text-text-primary border-b-2 border-accent'
                : 'text-text-muted hover:text-text-secondary'"
              @click="activeSidebarTab = tab.id"
            >{{ tab.label }}</button>
          </div>

          <!-- Detail tab -->
          <div v-if="activeSidebarTab === 'detail'" class="flex-1 overflow-y-auto">
            <div v-if="selectedEvent" class="p-3 flex flex-col gap-3">
              <p v-if="isSynced" class="text-[10px] text-emerald-400 bg-emerald-500/10 rounded px-2 py-1">Synced — read only</p>
              <div>
                <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Title</label>
                <input v-model="selectedEvent.title" type="text" :disabled="isSynced"
                  class="w-full px-2 py-1.5 rounded border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                  @blur="saveEvents" />
              </div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Date</label>
                  <input v-model="selectedEvent.date" type="date" :disabled="isSynced"
                    class="w-full px-2 py-1.5 rounded border border-border bg-surface-base text-xs text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                    @change="saveEvents" />
                </div>
                <div>
                  <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">End date</label>
                  <input v-model="selectedEvent.endDate" type="date" :disabled="isSynced"
                    class="w-full px-2 py-1.5 rounded border border-border bg-surface-base text-xs text-text-primary focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
                    @change="saveEvents" />
                </div>
              </div>
              <div>
                <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Description</label>
                <textarea v-model="selectedEvent.description" rows="3" :disabled="isSynced"
                  class="w-full px-2 py-1.5 rounded border border-border bg-surface-base text-xs text-text-primary focus:outline-none focus:border-accent transition-colors resize-none disabled:opacity-50"
                  @blur="saveEvents"></textarea>
              </div>
              <div v-if="!isSynced">
                <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Color</label>
                <div class="flex items-center gap-1.5 flex-wrap">
                  <button v-for="c in colorPresets" :key="c"
                    class="w-5 h-5 rounded-full border-2 transition-all cursor-pointer"
                    :style="{ backgroundColor: c }"
                    :class="selectedEvent.color === c ? 'border-text-primary scale-110' : 'border-transparent hover:scale-105'"
                    @click="selectedEvent.color = c; saveEvents()"></button>
                </div>
              </div>
              <div v-if="projectDocs.length > 0 && !isSynced">
                <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Document</label>
                <select v-model="selectedEvent.docId" class="w-full px-2 py-1.5 rounded border border-border bg-surface-base text-xs text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer" @change="saveEvents">
                  <option :value="undefined">— None —</option>
                  <option v-for="doc in projectDocs" :key="doc.id" :value="doc.id">{{ doc.name }}</option>
                </select>
              </div>
              <div v-if="projectResources.length > 0 && !isSynced">
                <label class="block text-[10px] font-medium text-text-muted uppercase tracking-wider mb-1">Resource</label>
                <select v-model="selectedEvent.resourceId" class="w-full px-2 py-1.5 rounded border border-border bg-surface-base text-xs text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer" @change="saveEvents">
                  <option :value="undefined">— None —</option>
                  <option v-for="res in projectResources" :key="res.id" :value="res.id">{{ res.title || res.name }}</option>
                </select>
              </div>
              <button v-if="!isSynced" class="mt-2 text-xs text-red-400 hover:text-red-300 transition-colors self-start" @click="deleteSelectedEvent">Delete event</button>
            </div>
            <div v-else class="flex-1 flex items-center justify-center p-4">
              <p class="text-xs text-text-muted text-center">Click an event to see its details</p>
            </div>
          </div>

          <!-- Events list tab -->
          <div v-if="activeSidebarTab === 'list'" class="flex-1 flex flex-col overflow-hidden">
            <div class="px-2 pt-2 pb-1 shrink-0">
              <input v-model="eventSearch" type="text" placeholder="Search events..."
                class="w-full px-2 py-1 rounded border border-border bg-surface-base text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors" />
            </div>
            <div class="flex-1 overflow-y-auto">
            <div v-for="event in filteredListEvents" :key="'list-' + event.id"
              class="flex items-center gap-2 px-3 py-2 border-b border-border/50 cursor-pointer hover:bg-surface-hover transition-colors group"
              :class="selectedEvent?.id === event.id ? 'bg-accent/5' : ''"
              @click="highlightEvent(event)">
              <div class="w-2 h-2 rounded-full shrink-0" :style="{ backgroundColor: event.color }"></div>
              <div class="min-w-0 flex-1">
                <p class="text-xs text-text-primary truncate font-medium">{{ event.title }}</p>
                <p class="text-[10px] text-text-muted">{{ formatDate(event.date) }}</p>
              </div>
              <div class="hidden group-hover:flex items-center gap-1 shrink-0">
                <button class="p-0.5 rounded hover:bg-surface-elevated text-text-muted hover:text-accent transition-colors" title="Edit" @click.stop="selectEvent(event)">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button class="p-0.5 rounded hover:bg-surface-elevated text-text-muted hover:text-red-400 transition-colors" v-if="!isSynced" title="Delete" @click.stop="deleteEventById(event.id)">
                  <svg class="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            </div>
          </div>

          <!-- Notes tab -->
          <div v-if="activeSidebarTab === 'notes'" class="flex-1 flex flex-col p-3">
            <textarea v-model="timelineData.notes" placeholder="Write notes about this timeline..."
              class="flex-1 w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none leading-relaxed"
              @blur="saveNotes"></textarea>
          </div>
        </template>

        <!-- HORIZONTAL MODE: 3 columns side by side -->
        <template v-else>
          <div class="flex-1 flex min-h-0">
            <!-- Events list column -->
            <div class="w-[480px] shrink-0 border-r border-border flex flex-col">
              <div class="px-2 py-1 border-b border-border">
                <input v-model="eventSearch" type="text" placeholder="Search..."
                  class="w-full px-1.5 py-0.5 rounded border border-border bg-surface-base text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors" />
              </div>
              <div class="flex-1 overflow-y-auto">
                <div v-for="event in filteredListEvents" :key="'hlist-' + event.id"
                  class="flex items-center gap-3 px-4 py-3 border-b border-border/30 cursor-pointer hover:bg-surface-hover transition-colors group"
                  :class="selectedEvent?.id === event.id ? 'bg-accent/5' : ''"
                  @click="highlightEvent(event)">
                  <div class="w-3 h-3 rounded-full shrink-0" :style="{ backgroundColor: event.color }"></div>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm text-text-primary truncate font-medium">{{ event.title }}</p>
                    <p class="text-xs text-text-muted">{{ formatDate(event.date) }}</p>
                  </div>
                  <div class="hidden group-hover:flex items-center gap-1 shrink-0">
                    <button class="p-1 rounded hover:bg-surface-elevated text-text-muted hover:text-accent transition-colors" title="Edit" @click.stop="selectEvent(event)">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button class="p-1 rounded hover:bg-surface-elevated text-text-muted hover:text-red-400 transition-colors" v-if="!isSynced" title="Delete" @click.stop="deleteEventById(event.id)">
                      <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Detail column -->
            <div class="flex-1 min-w-0 border-r border-border flex flex-col">
              <div class="px-2 py-1.5 border-b border-border text-[10px] font-medium text-text-muted uppercase tracking-wider">Detail</div>
              <div class="flex-1 overflow-y-auto">
                <div v-if="selectedEvent" class="p-2 flex flex-col gap-2">
                  <input v-model="selectedEvent.title" type="text"
                    class="w-full px-2 py-1 rounded border border-border bg-surface-base text-xs text-text-primary focus:outline-none focus:border-accent transition-colors"
                    @blur="saveEvents" />
                  <div class="flex gap-2">
                    <input v-model="selectedEvent.date" type="date"
                      class="flex-1 px-2 py-1 rounded border border-border bg-surface-base text-[10px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                      @change="saveEvents" />
                    <input v-model="selectedEvent.endDate" type="date"
                      class="flex-1 px-2 py-1 rounded border border-border bg-surface-base text-[10px] text-text-primary focus:outline-none focus:border-accent transition-colors"
                      @change="saveEvents" />
                  </div>
                  <textarea v-model="selectedEvent.description" rows="2" placeholder="Description..."
                    class="w-full px-2 py-1 rounded border border-border bg-surface-base text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"
                    @blur="saveEvents"></textarea>
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <button v-for="c in colorPresets" :key="'hc-' + c"
                      class="w-4 h-4 rounded-full border-2 transition-all cursor-pointer"
                      :style="{ backgroundColor: c }"
                      :class="selectedEvent.color === c ? 'border-text-primary scale-110' : 'border-transparent hover:scale-105'"
                      @click="selectedEvent.color = c; saveEvents()"></button>
                  </div>
                  <button class="text-[10px] text-red-400 hover:text-red-300 transition-colors self-start" @click="deleteSelectedEvent">Delete</button>
                </div>
                <div v-else class="flex items-center justify-center p-3">
                  <p class="text-[10px] text-text-muted">Click an event</p>
                </div>
              </div>
            </div>

            <!-- Notes column -->
            <div class="flex-1 min-w-0 flex flex-col">
              <div class="px-2 py-1.5 border-b border-border text-[10px] font-medium text-text-muted uppercase tracking-wider">Notes</div>
              <div class="flex-1 p-2">
                <textarea v-model="timelineData.notes" placeholder="Write notes..."
                  class="w-full h-full px-2 py-1.5 rounded border border-border bg-surface-base text-[10px] text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none leading-relaxed"
                  @blur="saveNotes"></textarea>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Confirm Remove Timeline Modal -->
    <ConfirmModal
      :is-open="showRemoveModal"
      title="Remove Timeline"
      message="Are you sure you want to remove this timeline?"
      confirm-text="Remove"
      cancel-text="Cancel"
      confirm-variant="danger"
      @confirm="handleRemoveConfirm"
      @cancel="showRemoveModal = false"
    />

    <!-- Import from Dataset Modal -->
    <Modal v-model="showImportModal" title="Import from Dataset">
      <div class="flex flex-col gap-4">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Dataset</label>
          <select v-model="importDatasetId"
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer"
            @change="onDatasetSelected">
            <option :value="null">— Select a dataset —</option>
            <option v-for="ds in availableDatasets" :key="ds.id" :value="ds.id">
              {{ ds.name }} <span v-if="ds.recordCount">({{ ds.recordCount }} records)</span>
            </option>
          </select>
        </div>

        <template v-if="importSchema.length > 0">
          <div class="border-t border-border pt-3">
            <p class="text-xs font-medium text-text-secondary mb-2">Map dataset columns to event fields</p>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs text-text-muted mb-1">Title <span class="text-red-400">*</span></label>
                <select v-model="importMapping.titleField"
                  class="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer">
                  <option value="">— Select —</option>
                  <option v-for="f in importSchema" :key="f.key" :value="f.key">{{ f.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Date <span class="text-red-400">*</span></label>
                <select v-model="importMapping.dateField"
                  class="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer">
                  <option value="">— Select —</option>
                  <option v-for="f in importDateFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">End Date <span class="text-text-muted font-normal">(opt)</span></label>
                <select v-model="importMapping.endDateField"
                  class="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer">
                  <option value="">— None —</option>
                  <option v-for="f in importDateFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                </select>
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Description <span class="text-text-muted font-normal">(opt)</span></label>
                <select v-model="importMapping.descriptionField"
                  class="w-full px-3 py-1.5 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer">
                  <option value="">— None —</option>
                  <option v-for="f in importTextFields" :key="f.key" :value="f.key">{{ f.name }}</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-xs text-text-muted mb-1">Color for imported events</label>
            <div class="flex items-center gap-2 flex-wrap">
              <button
                v-for="c in colorPresets"
                :key="'import-' + c"
                class="w-5 h-5 rounded-full border-2 transition-all cursor-pointer"
                :style="{ backgroundColor: c }"
                :class="importMapping.color === c ? 'border-text-primary scale-110' : 'border-transparent hover:scale-105'"
                @click="importMapping.color = c"
              ></button>
            </div>
          </div>

          <div v-if="importPreviewRecords.length > 0" class="border-t border-border pt-3">
            <p class="text-xs font-medium text-text-secondary mb-2">
              Preview ({{ importPreviewRecords.length }} of {{ importTotalRecords }} records)
            </p>
            <div class="max-h-40 overflow-auto rounded-lg border border-border">
              <table class="w-full text-xs">
                <thead class="bg-surface-elevated sticky top-0">
                  <tr>
                    <th class="text-left px-2 py-1.5 text-text-muted font-medium">Title</th>
                    <th class="text-left px-2 py-1.5 text-text-muted font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(rec, i) in importPreviewRecords" :key="i" class="border-t border-border">
                    <td class="px-2 py-1 text-text-primary truncate max-w-[180px]">{{ rec.title }}</td>
                    <td class="px-2 py-1 text-text-secondary">{{ rec.date }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="importSkippedCount > 0" class="text-[10px] text-amber-500 mt-1">
              {{ importSkippedCount }} records will be skipped (missing title or date)
            </p>
          </div>
        </template>

        <div v-if="importError" class="text-xs text-red-400">{{ importError }}</div>
        <div v-if="isImporting" class="text-xs text-text-muted">Loading...</div>

        <!-- Sync toggle -->
        <div v-if="importSchema.length > 0" class="border-t border-border pt-3">
          <label class="flex items-center gap-2 cursor-pointer">
            <input v-model="importSync" type="checkbox" class="rounded border-border text-accent focus:ring-accent" />
            <span class="text-xs text-text-secondary">Keep synced with dataset</span>
          </label>
          <p class="text-[10px] text-text-muted mt-1 ml-5">Events will auto-update from the dataset. Manual editing will be disabled.</p>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end w-full gap-2">
          <Button variant="secondary" size="small" @click="showImportModal = false">Cancel</Button>
          <Button size="small" :disabled="!canImport || isImporting" @click="executeImport">
            {{ importSync ? 'Import & Sync' : 'Import' }} {{ importValidRecords.length }} events
          </Button>
        </div>
      </template>
    </Modal>

    <!-- Add / Edit Event Modal (only for new events now) -->
    <Modal v-model="showEventModal" :title="'Add Event'">
      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Title <span class="text-red-400">*</span></label>
          <input v-model="eventForm.title" type="text" placeholder="Event title"
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Date <span class="text-red-400">*</span></label>
            <input v-model="eventForm.date" type="date"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">End Date <span class="text-text-muted font-normal">(opt)</span></label>
            <input v-model="eventForm.endDate" type="date"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1.5">Color</label>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="c in colorPresets"
              :key="c"
              class="w-6 h-6 rounded-full border-2 transition-all cursor-pointer"
              :style="{ backgroundColor: c }"
              :class="eventForm.color === c ? 'border-text-primary scale-110' : 'border-transparent hover:scale-105'"
              @click="eventForm.color = c"
            ></button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-end w-full gap-2">
          <Button variant="secondary" size="small" @click="showEventModal = false">Cancel</Button>
          <Button size="small" :disabled="!eventForm.title || !eventForm.date" @click="addEvent">Add</Button>
        </div>
      </template>
    </Modal>

    <!-- Add / Edit Epoch Modal -->
    <Modal v-model="showEpochModal" :title="editingEpoch ? 'Edit Epoch' : 'Add Epoch'">
      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Name <span class="text-red-400">*</span></label>
          <input v-model="epochForm.name" type="text" placeholder="e.g. Renaissance, World War II..."
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Start Date <span class="text-red-400">*</span></label>
            <input v-model="epochForm.startDate" type="date"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">End Date <span class="text-red-400">*</span></label>
            <input v-model="epochForm.endDate" type="date"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
          </div>
        </div>
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1.5">Color</label>
          <div class="flex items-center gap-2 flex-wrap">
            <button
              v-for="c in epochColorPresets"
              :key="'epoch-' + c"
              class="w-6 h-6 rounded-full border-2 transition-all cursor-pointer"
              :style="{ backgroundColor: c }"
              :class="epochForm.color === c ? 'border-text-primary scale-110' : 'border-transparent hover:scale-105'"
              @click="epochForm.color = c"
            ></button>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="flex items-center justify-between w-full">
          <Button v-if="editingEpoch" variant="danger" size="small" @click="deleteEpoch">Delete</Button>
          <div v-else></div>
          <div class="flex gap-2">
            <Button variant="secondary" size="small" @click="showEpochModal = false">Cancel</Button>
            <Button size="small" :disabled="!epochForm.name || !epochForm.startDate || !epochForm.endDate" @click="saveEpoch">
              {{ editingEpoch ? 'Save' : 'Add' }}
            </Button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, type Component } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { useTimelines } from '../services/timelines/useTimelines';
import { useDocumentProjectList } from '../services/documents/useDocumentProjectList';
import { useResourceList } from '../services/resources/useResourceList';
import { useDatasets, type DatasetField, type Dataset } from '../services/datasets/useDatasets';
import { useProjectStore } from '../store/projectStore';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import Button from '../components/ui/Button.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import Modal from '../components/ui/Modal/Modal.vue';
import TimelineHorizontal from '../components/timeline/TimelineHorizontal.vue';
import TimelineVertical from '../components/timeline/TimelineVertical.vue';
import type { TimelineEvent, TimelineEpoch, TimelineLayoutType } from '../types/timeline';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const { loadTimeline, createTimeline, updateTimeline, deleteTimeline } = useTimelines();
const { loadDocumentsByProject } = useDocumentProjectList();
const { loadResourcesByProject } = useResourceList();
const { getAllDatasets, getDataset, getRecords } = useDatasets();

const timelineData = ref<Record<string, any>>({ name: '', timelineData: [], epochs: [], notes: '', layoutType: 'horizontal', axisBreaks: false });
const isSaving = ref(false);
const savedSuccessfully = ref(false);
const showRemoveModal = ref(false);
const showEventModal = ref(false);
const projectDocs = ref<Record<string, any>[]>([]);
const projectResources = ref<Record<string, any>[]>([]);
const showCards = ref(true);
const showExportMenu = ref(false);
const exportDropdownRef = ref<HTMLElement | null>(null);
const timelineAreaRef = ref<HTMLElement | null>(null);

// Close export dropdown on click outside
const onClickOutsideExport = (e: MouseEvent) => {
  if (exportDropdownRef.value && !exportDropdownRef.value.contains(e.target as Node)) {
    showExportMenu.value = false;
  }
};
watch(showExportMenu, (v) => {
  if (v) document.addEventListener('click', onClickOutsideExport, { capture: true });
  else document.removeEventListener('click', onClickOutsideExport, { capture: true });
});

const exportAsImage = async (mode: 'download' | 'resource') => {
  showExportMenu.value = false;
  const { toPng } = await import('html-to-image');

  // Find the timeline visualization element (the scroll container inside the layout)
  const layoutEl = document.querySelector('[data-timeline-export]') as HTMLElement;
  if (!layoutEl) return;

  const bgColor = getComputedStyle(document.documentElement).getPropertyValue('--color-surface')?.trim() || '#000000';

  try {
    const dataUrl = await toPng(layoutEl, {
      backgroundColor: bgColor,
      pixelRatio: 2,
    });

    if (mode === 'download') {
      const link = document.createElement('a');
      link.download = `${timelineData.value.name || 'timeline'}.png`;
      link.href = dataUrl;
      link.click();
    } else {
      // Convert dataUrl to blob and upload as resource
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `${timelineData.value.name || 'timeline'}.png`, { type: 'image/png' });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('name', `${timelineData.value.name || 'Timeline'} (image)`);
      const projectId = timelineData.value.project?.id;
      if (projectId) formData.append('projectId', String(projectId));

      const { default: apiClient } = await import('../services/api');
      await apiClient.post('/resources/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      savedSuccessfully.value = true;
      setTimeout(() => { savedSuccessfully.value = false; }, 3000);
    }
  } catch (err) {
    console.error('Export failed:', err);
  }
};
const showRuler = ref(false);
const showInlineMarks = ref(false);

// Sidebar
const selectedEvent = ref<TimelineEvent | null>(null);
const activeSidebarTab = ref<'detail' | 'list' | 'notes'>('list');
const sidebarTabs = [
  { id: 'detail' as const, label: 'Detail' },
  { id: 'list' as const, label: 'Events' },
  { id: 'notes' as const, label: 'Notes' },
];

// Highlight event (scroll to it) without switching to detail tab
const highlightEvent = (event: TimelineEvent) => {
  const events: TimelineEvent[] = timelineData.value.timelineData || [];
  selectedEvent.value = events.find(e => e.id === event.id) || null;
};

// Select event and open detail tab
const selectEvent = (event: TimelineEvent) => {
  highlightEvent(event);
  activeSidebarTab.value = 'detail';
};

const deleteSelectedEvent = async () => {
  if (!selectedEvent.value) return;
  timelineData.value.timelineData = (timelineData.value.timelineData || []).filter(
    (e: TimelineEvent) => e.id !== selectedEvent.value!.id
  );
  selectedEvent.value = null;
  await saveEvents();
};

const deleteEventById = async (id: string) => {
  timelineData.value.timelineData = (timelineData.value.timelineData || []).filter(
    (e: TimelineEvent) => e.id !== id
  );
  if (selectedEvent.value?.id === id) selectedEvent.value = null;
  await saveEvents();
};

// Event list search
const eventSearch = ref('');
const filteredListEvents = computed(() => {
  if (!eventSearch.value) return sortedEvents.value;
  const q = eventSearch.value.toLowerCase();
  return sortedEvents.value.filter((e: TimelineEvent) =>
    e.title.toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q)
  );
});

// Epoch management
const showEpochModal = ref(false);
const editingEpoch = ref<TimelineEpoch | null>(null);
const epochColorPresets = ['#3b82f620', '#10b98120', '#f59e0b20', '#ef444420', '#8b5cf620', '#ec489920', '#06b6d420', '#6b728020'];
const emptyEpochForm = () => ({ name: '', startDate: '', endDate: '', color: '#3b82f620' });
const epochForm = ref(emptyEpochForm());

const openAddEpoch = () => {
  editingEpoch.value = null;
  epochForm.value = emptyEpochForm();
  showEpochModal.value = true;
};

const openEditEpoch = (epoch: TimelineEpoch) => {
  editingEpoch.value = epoch;
  epochForm.value = { name: epoch.name, startDate: epoch.startDate, endDate: epoch.endDate, color: epoch.color };
  showEpochModal.value = true;
};

const saveEpoch = async () => {
  if (!epochForm.value.name || !epochForm.value.startDate || !epochForm.value.endDate) return;
  const epochs: TimelineEpoch[] = [...(timelineData.value.epochs || [])];
  if (editingEpoch.value) {
    const idx = epochs.findIndex((e) => e.id === editingEpoch.value!.id);
    if (idx !== -1) epochs[idx] = { ...editingEpoch.value, ...epochForm.value };
  } else {
    epochs.push({ id: uuidv4(), ...epochForm.value });
  }
  timelineData.value.epochs = epochs;
  showEpochModal.value = false;
  await saveField('epochs', epochs);
};

const deleteEpoch = async () => {
  if (!editingEpoch.value) return;
  timelineData.value.epochs = (timelineData.value.epochs || []).filter(
    (e: TimelineEpoch) => e.id !== editingEpoch.value!.id
  );
  showEpochModal.value = false;
  await saveField('epochs', timelineData.value.epochs);
};

const deleteEpochById = async (id: string) => {
  timelineData.value.epochs = (timelineData.value.epochs || []).filter(
    (e: TimelineEpoch) => e.id !== id
  );
  await saveField('epochs', timelineData.value.epochs);
};

// Layout
const layoutOptions: { value: TimelineLayoutType; label: string; icon: string }[] = [
  { value: 'horizontal', label: 'Horizontal', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M4 12h16M8 8v8M12 6v12M16 8v8" />' },
  { value: 'vertical', label: 'Vertical', icon: '<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16M8 8h8M6 12h12M8 16h8" />' },
];

const layoutComponents: Record<TimelineLayoutType, Component> = {
  horizontal: TimelineHorizontal,
  vertical: TimelineVertical,
};

const currentLayout = computed<TimelineLayoutType>(() => timelineData.value.layoutType || 'horizontal');
const activeLayoutComponent = computed(() => layoutComponents[currentLayout.value]);

const setLayout = async (layout: TimelineLayoutType) => {
  timelineData.value.layoutType = layout;
  if (!isNewTimeline.value && timelineData.value.id) await saveField('layoutType', layout);
};

const toggleAxisBreaks = async () => {
  timelineData.value.axisBreaks = !timelineData.value.axisBreaks;
  if (!isNewTimeline.value && timelineData.value.id) await saveField('axisBreaks', timelineData.value.axisBreaks);
};

const saveField = async (field: string, value: any) => {
  isSaving.value = true;
  savedSuccessfully.value = false;
  try {
    await updateTimeline(timelineData.value.id, { [field]: value });
    savedSuccessfully.value = true;
  } finally {
    isSaving.value = false;
    setTimeout(() => { savedSuccessfully.value = false; }, 3000);
  }
};

const colorPresets = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'];

const emptyEventForm = () => ({
  title: '', description: '', date: '', endDate: '', color: '#3b82f6',
  docId: undefined as number | undefined, resourceId: undefined as number | undefined,
});
const eventForm = ref(emptyEventForm());

const isNewTimeline = computed(() => route.params.id === 'new');

const sortedEvents = computed(() => {
  const events = timelineData.value.timelineData || [];
  return [...events].sort((a: TimelineEvent, b: TimelineEvent) => a.date.localeCompare(b.date));
});

const breadcrumbItems = computed(() => {
  const items: Record<string, any>[] = [];
  if (projectStore.currentProject) {
    items.push({ name: projectStore.currentProject.name, path: `/project/${projectStore.currentProject.id}` });
  }
  items.push({ name: isNewTimeline.value ? 'New Timeline' : timelineData.value.name || 'Timeline' });
  return items;
});

onMounted(async () => {
  const id = route.params.id as string;
  const projectId = route.query.projectId as string;

  if (!isNewTimeline.value) {
    const data = await loadTimeline(id);
    timelineData.value = {
      ...data,
      timelineData: data.timelineData || [],
      epochs: data.epochs || [],
      notes: data.notes || '',
      layoutType: data.layoutType || 'horizontal',
      axisBreaks: data.axisBreaks || false,
    };
  } else {
    timelineData.value = {
      name: '', timelineData: [], epochs: [], notes: '',
      layoutType: 'horizontal', axisBreaks: false,
      project: projectId ? { id: Number(projectId) } : null,
    };
  }

  const resolvedProjectId = timelineData.value.project?.id || (projectId ? Number(projectId) : projectStore.currentProject?.id);
  if (resolvedProjectId) {
    try { projectDocs.value = await loadDocumentsByProject(resolvedProjectId); } catch { projectDocs.value = []; }
    try { projectResources.value = await loadResourcesByProject(resolvedProjectId); } catch { projectResources.value = []; }
  }

  // Auto-sync from dataset if synced
  if (timelineData.value.syncDatasetId) {
    await syncFromDataset();
  }
});

const handleNameChange = async () => {
  if (!timelineData.value.name) return;
  isSaving.value = true;
  savedSuccessfully.value = false;
  try {
    if (isNewTimeline.value) {
      const created = await createTimeline({
        name: timelineData.value.name, timelineData: [], layoutType: timelineData.value.layoutType,
        axisBreaks: timelineData.value.axisBreaks, project: timelineData.value.project,
      });
      timelineData.value.id = created.id;
      router.replace(`/timeline/${created.id}`);
    } else {
      await updateTimeline(timelineData.value.id, { name: timelineData.value.name });
    }
    savedSuccessfully.value = true;
  } finally {
    isSaving.value = false;
    setTimeout(() => { savedSuccessfully.value = false; }, 3000);
  }
};

const saveEvents = async () => {
  if (isNewTimeline.value || !timelineData.value.id) return;
  isSaving.value = true;
  savedSuccessfully.value = false;
  try {
    await updateTimeline(timelineData.value.id, { timelineData: timelineData.value.timelineData });
    savedSuccessfully.value = true;
  } finally {
    isSaving.value = false;
    setTimeout(() => { savedSuccessfully.value = false; }, 3000);
  }
};

const saveNotes = async () => {
  if (isNewTimeline.value || !timelineData.value.id) return;
  await saveField('notes', timelineData.value.notes || '');
};

const openAddEvent = () => {
  eventForm.value = emptyEventForm();
  showEventModal.value = true;
};

const addEvent = async () => {
  if (!eventForm.value.title || !eventForm.value.date) return;
  const events: TimelineEvent[] = [...(timelineData.value.timelineData || [])];
  const newEvent: TimelineEvent = {
    id: uuidv4(),
    title: eventForm.value.title,
    description: eventForm.value.description || undefined,
    date: eventForm.value.date,
    endDate: eventForm.value.endDate || undefined,
    color: eventForm.value.color,
    docId: eventForm.value.docId,
    resourceId: eventForm.value.resourceId,
  };
  events.push(newEvent);
  timelineData.value.timelineData = events;
  showEventModal.value = false;
  await saveEvents();
  selectEvent(newEvent);
};

const handleRemoveConfirm = async () => {
  showRemoveModal.value = false;
  try {
    await deleteTimeline(timelineData.value.id);
    const projectId = timelineData.value.project?.id;
    router.push(projectId ? `/project/${projectId}` : '/');
  } catch (err) {
    console.error('Error removing timeline:', err);
  }
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// --- Import from Dataset ---
const showImportModal = ref(false);
const availableDatasets = ref<Dataset[]>([]);
const importDatasetId = ref<number | null>(null);
const importSchema = ref<DatasetField[]>([]);
const importAllRecords = ref<Record<string, any>[]>([]);
const importTotalRecords = ref(0);
const importError = ref('');
const isImporting = ref(false);

const importMapping = ref({ titleField: '', dateField: '', endDateField: '', descriptionField: '', color: '#3b82f6' });
const importSync = ref(false);

const isSynced = computed(() => !!timelineData.value.syncDatasetId);

const importDateFields = computed(() => importSchema.value.filter(f => f.type === 'date' || f.type === 'datetime'));
const importTextFields = computed(() => importSchema.value.filter(f => f.type === 'text'));

const normalizeDate = (val: any): string => {
  if (!val) return '';
  const str = String(val);
  const match = str.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : '';
};

const importPreviewRecords = computed(() => {
  if (!importMapping.value.titleField || !importMapping.value.dateField) return [];
  return importAllRecords.value.slice(0, 10).map(r => ({
    title: r.data?.[importMapping.value.titleField] || '',
    date: normalizeDate(r.data?.[importMapping.value.dateField]),
    endDate: importMapping.value.endDateField ? normalizeDate(r.data?.[importMapping.value.endDateField]) : '',
  }));
});

const importValidRecords = computed(() => {
  if (!importMapping.value.titleField || !importMapping.value.dateField) return [];
  return importAllRecords.value.filter(r => {
    const title = r.data?.[importMapping.value.titleField];
    const date = normalizeDate(r.data?.[importMapping.value.dateField]);
    return title && date;
  });
});

const importSkippedCount = computed(() => importAllRecords.value.length - importValidRecords.value.length);

const canImport = computed(() =>
  importMapping.value.titleField && importMapping.value.dateField && importValidRecords.value.length > 0
);

const openImportModal = async () => {
  importDatasetId.value = null;
  importSchema.value = [];
  importAllRecords.value = [];
  importTotalRecords.value = 0;
  importError.value = '';
  importMapping.value = { titleField: '', dateField: '', endDateField: '', descriptionField: '', color: '#3b82f6' };
  showImportModal.value = true;
  try { availableDatasets.value = await getAllDatasets(); } catch { availableDatasets.value = []; }
};

const onDatasetSelected = async () => {
  importSchema.value = [];
  importAllRecords.value = [];
  importTotalRecords.value = 0;
  importError.value = '';
  importMapping.value = { ...importMapping.value, titleField: '', dateField: '', endDateField: '', descriptionField: '' };
  if (!importDatasetId.value) return;
  isImporting.value = true;
  try {
    const ds = await getDataset(importDatasetId.value);
    importSchema.value = ds.schema || [];
    const { records, total } = await getRecords(importDatasetId.value, { limit: 5000 });
    importAllRecords.value = records;
    importTotalRecords.value = total;
    const firstText = importSchema.value.find(f => f.type === 'text');
    const dateFields = importDateFields.value;
    if (firstText) importMapping.value.titleField = firstText.key;
    if (dateFields.length >= 1) importMapping.value.dateField = dateFields[0].key;
    if (dateFields.length >= 2) importMapping.value.endDateField = dateFields[1].key;
  } catch (err: any) {
    importError.value = err.message || 'Failed to load dataset';
  } finally {
    isImporting.value = false;
  }
};

const buildEventsFromRecords = (records: Record<string, any>[], mapping: typeof importMapping.value): TimelineEvent[] => {
  return records
    .filter(r => r.data?.[mapping.titleField] && normalizeDate(r.data?.[mapping.dateField]))
    .map(r => ({
      id: uuidv4(),
      title: String(r.data[mapping.titleField]),
      description: mapping.descriptionField ? (r.data[mapping.descriptionField] || undefined) : undefined,
      date: normalizeDate(r.data[mapping.dateField]),
      endDate: mapping.endDateField ? (normalizeDate(r.data[mapping.endDateField]) || undefined) : undefined,
      color: mapping.color,
    }));
};

const executeImport = async () => {
  if (!canImport.value) return;
  const newEvents = buildEventsFromRecords(importAllRecords.value, importMapping.value);

  if (importSync.value) {
    // Sync mode: replace all events, save dataset reference + mapping
    timelineData.value.timelineData = newEvents;
    timelineData.value.syncDatasetId = importDatasetId.value;
    timelineData.value.syncMapping = { ...importMapping.value };
    showImportModal.value = false;
    await saveEvents();
    await saveField('syncDatasetId', timelineData.value.syncDatasetId);
    await saveField('syncMapping', timelineData.value.syncMapping);
  } else {
    // Normal import: append events
    timelineData.value.timelineData = [...(timelineData.value.timelineData || []), ...newEvents];
    showImportModal.value = false;
    await saveEvents();
  }
};

const syncFromDataset = async () => {
  const dsId = timelineData.value.syncDatasetId;
  const mapping = timelineData.value.syncMapping;
  if (!dsId || !mapping) return;
  try {
    const { records } = await getRecords(dsId, { limit: 5000 });
    const events = buildEventsFromRecords(records, mapping);
    timelineData.value.timelineData = events;
    await saveEvents();
  } catch (err) {
    console.error('Sync failed:', err);
  }
};

const unsyncDataset = async () => {
  timelineData.value.syncDatasetId = null;
  timelineData.value.syncMapping = null;
  await saveField('syncDatasetId', null);
  await saveField('syncMapping', null);
};
</script>
