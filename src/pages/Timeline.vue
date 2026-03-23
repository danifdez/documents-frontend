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
        <Button v-if="!isNewTimeline" variant="danger" size="small" @click="showRemoveModal = true">
          <svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove
        </Button>
      </div>
    </div>

    <!-- Timeline area -->
    <div class="flex-1 min-h-0 flex flex-col">
      <!-- Toolbar -->
      <div class="flex items-center justify-between mb-4 shrink-0">
        <span class="text-sm text-text-muted">
          {{ sortedEvents.length === 0 ? 'No events yet' : `${sortedEvents.length} event${sortedEvents.length !== 1 ? 's' : ''}` }}
        </span>
        <Button size="small" @click="openAddEvent" :disabled="isNewTimeline && !timelineData.name">
          <svg class="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Add event
        </Button>
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

      <!-- Timeline visualization (absolute positioning, date-proportional) -->
      <div v-else class="flex-1 min-h-0 overflow-auto">
        <div class="relative" style="height: 360px;" :style="{ minWidth: timelineWidth + 'px' }">

          <!-- Axis line -->
          <div class="absolute left-0 right-0 h-px bg-border" style="top: 160px"></div>

          <!-- Range bars (events with start+end date shown as colored block on the axis) -->
          <template v-for="event in sortedEvents" :key="'range-' + event.id">
            <div
              v-if="event.endDate"
              class="absolute rounded-sm cursor-pointer opacity-80 hover:opacity-100 transition-opacity"
              :style="{
                left: dateToPixel(event.date) + 'px',
                width: Math.max(6, dateToPixel(event.endDate) - dateToPixel(event.date)) + 'px',
                height: '10px',
                top: '155px',
                backgroundColor: event.color,
              }"
              @click="openEditEvent(event)"
            ></div>
          </template>

          <!-- Marker dots (at start date) -->
          <template v-for="event in sortedEvents" :key="'dot-' + event.id">
            <div
              class="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm z-20 cursor-pointer ring-2 ring-border hover:ring-accent/60 transition-all"
              :style="{
                left: (dateToPixel(event.date) - 7) + 'px',
                top: '153px',
                backgroundColor: event.color,
              }"
              @click="openEditEvent(event)"
            ></div>
          </template>

          <!-- Connectors + cards (alternating above / below axis) -->
          <template v-for="(event, index) in sortedEvents" :key="'card-' + event.id">
            <!-- Connector line -->
            <div
              class="absolute w-px bg-border z-10"
              :style="index % 2 === 0
                ? { left: dateToPixel(event.date) + 'px', top: '109px', height: '44px' }
                : { left: dateToPixel(event.date) + 'px', top: '167px', height: '20px' }"
            ></div>

            <!-- Card above (even index) -->
            <div
              v-if="index % 2 === 0"
              class="absolute w-44 rounded-lg border border-border bg-surface-elevated p-2.5 shadow-sm cursor-pointer hover:shadow-md hover:border-accent/40 transition-all duration-150 -translate-x-1/2"
              :style="{
                left: dateToPixel(event.date) + 'px',
                bottom: '251px',
                borderLeftColor: event.color,
                borderLeftWidth: '3px',
              }"
              @click="openEditEvent(event)"
            >
              <p class="text-xs font-semibold text-text-primary truncate">{{ event.title }}</p>
              <p class="text-[10px] text-text-muted mt-0.5">
                {{ formatDate(event.date) }}<span v-if="event.endDate"> – {{ formatDate(event.endDate) }}</span>
              </p>
              <p v-if="event.description" class="text-[10px] text-text-secondary mt-1 line-clamp-2">{{ event.description }}</p>
              <div v-if="event.docId || event.resourceId" class="flex items-center gap-1 mt-1.5">
                <svg v-if="event.docId" class="h-3 w-3 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <svg v-if="event.resourceId" class="h-3 w-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <!-- Card below (odd index) -->
            <div
              v-else
              class="absolute w-44 rounded-lg border border-border bg-surface-elevated p-2.5 shadow-sm cursor-pointer hover:shadow-md hover:border-accent/40 transition-all duration-150 -translate-x-1/2"
              :style="{
                left: dateToPixel(event.date) + 'px',
                top: '189px',
                borderLeftColor: event.color,
                borderLeftWidth: '3px',
              }"
              @click="openEditEvent(event)"
            >
              <p class="text-xs font-semibold text-text-primary truncate">{{ event.title }}</p>
              <p class="text-[10px] text-text-muted mt-0.5">
                {{ formatDate(event.date) }}<span v-if="event.endDate"> – {{ formatDate(event.endDate) }}</span>
              </p>
              <p v-if="event.description" class="text-[10px] text-text-secondary mt-1 line-clamp-2">{{ event.description }}</p>
              <div v-if="event.docId || event.resourceId" class="flex items-center gap-1 mt-1.5">
                <svg v-if="event.docId" class="h-3 w-3 text-accent shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <svg v-if="event.resourceId" class="h-3 w-3 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </template>

        </div>
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

    <!-- Add / Edit Event Modal -->
    <Modal v-model="showEventModal" :title="editingEvent ? 'Edit Event' : 'Add Event'">
      <div class="flex flex-col gap-3">
        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Title <span class="text-red-400">*</span></label>
          <input v-model="eventForm.title" type="text" placeholder="Event title"
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors" />
        </div>

        <div>
          <label class="block text-xs font-medium text-text-secondary mb-1">Description</label>
          <textarea v-model="eventForm.description" rows="2" placeholder="Optional description"
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors resize-none"></textarea>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">Date <span class="text-red-400">*</span></label>
            <input v-model="eventForm.date" type="date"
              class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors" />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-secondary mb-1">End Date <span class="text-text-muted font-normal">(optional)</span></label>
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
            <input v-model="eventForm.color" type="color" class="w-6 h-6 rounded cursor-pointer border border-border" title="Custom color" />
          </div>
        </div>

        <div v-if="projectDocs.length > 0">
          <label class="block text-xs font-medium text-text-secondary mb-1">Link to Document <span class="text-text-muted font-normal">(optional)</span></label>
          <select v-model="eventForm.docId"
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer">
            <option :value="undefined">— None —</option>
            <option v-for="doc in projectDocs" :key="doc.id" :value="doc.id">{{ doc.name }}</option>
          </select>
        </div>

        <div v-if="projectResources.length > 0">
          <label class="block text-xs font-medium text-text-secondary mb-1">Link to Resource <span class="text-text-muted font-normal">(optional)</span></label>
          <select v-model="eventForm.resourceId"
            class="w-full px-3 py-2 rounded-lg border border-border bg-surface-base text-sm text-text-primary focus:outline-none focus:border-accent transition-colors cursor-pointer">
            <option :value="undefined">— None —</option>
            <option v-for="res in projectResources" :key="res.id" :value="res.id">{{ res.title || res.name }}</option>
          </select>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-between w-full">
          <Button v-if="editingEvent" variant="danger" size="small" @click="deleteEvent">Delete</Button>
          <div v-else></div>
          <div class="flex gap-2">
            <Button variant="secondary" size="small" @click="showEventModal = false">Cancel</Button>
            <Button size="small" :disabled="!eventForm.title || !eventForm.date" @click="saveEvent">
              {{ editingEvent ? 'Save' : 'Add' }}
            </Button>
          </div>
        </div>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { v4 as uuidv4 } from 'uuid';
import { useTimelines } from '../services/timelines/useTimelines';
import { useDocumentProjectList } from '../services/documents/useDocumentProjectList';
import { useResourceList } from '../services/resources/useResourceList';
import { useProjectStore } from '../store/projectStore';
import Breadcrumb from '../components/ui/Breadcrumb.vue';
import Button from '../components/ui/Button.vue';
import ConfirmModal from '../components/ui/ConfirmModal.vue';
import Modal from '../components/ui/Modal/Modal.vue';
import type { TimelineEvent } from '../types/timeline';

const route = useRoute();
const router = useRouter();
const projectStore = useProjectStore();
const { loadTimeline, createTimeline, updateTimeline, deleteTimeline } = useTimelines();
const { loadDocumentsByProject } = useDocumentProjectList();
const { loadResourcesByProject } = useResourceList();

const timelineData = ref<Record<string, any>>({ name: '', timelineData: [] });
const isSaving = ref(false);
const savedSuccessfully = ref(false);
const showRemoveModal = ref(false);
const showEventModal = ref(false);
const editingEvent = ref<TimelineEvent | null>(null);
const projectDocs = ref<Record<string, any>[]>([]);
const projectResources = ref<Record<string, any>[]>([]);

const colorPresets = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#6b7280'];

const emptyEventForm = () => ({
  title: '',
  description: '',
  date: '',
  endDate: '',
  color: '#3b82f6',
  docId: undefined as number | undefined,
  resourceId: undefined as number | undefined,
});
const eventForm = ref(emptyEventForm());

const isNewTimeline = computed(() => route.params.id === 'new');

const sortedEvents = computed(() => {
  const events = timelineData.value.timelineData || [];
  return [...events].sort((a: TimelineEvent, b: TimelineEvent) => a.date.localeCompare(b.date));
});

// Date-based positioning
const MS_PER_DAY = 86400000;
const PADDING_PX = 80;
const MIN_PX_PER_DAY = 5;

const timelineDateRange = computed(() => {
  if (sortedEvents.value.length === 0) return { minMs: 0, maxMs: 0, rangeMs: 0 };
  const allMs = sortedEvents.value
    .flatMap((e: TimelineEvent) => [e.date, e.endDate].filter(Boolean))
    .map((d: string) => new Date(d + 'T00:00:00').getTime());
  const minMs = Math.min(...allMs);
  const maxMs = Math.max(...allMs);
  return { minMs, maxMs, rangeMs: maxMs - minMs };
});

const timelineWidth = computed(() => {
  const { rangeMs } = timelineDateRange.value;
  const days = rangeMs / MS_PER_DAY;
  return Math.max(600, Math.ceil(days * MIN_PX_PER_DAY) + PADDING_PX * 2);
});

const dateToPixel = (dateStr: string): number => {
  const { minMs, rangeMs } = timelineDateRange.value;
  if (!dateStr) return PADDING_PX;
  const dateMs = new Date(dateStr + 'T00:00:00').getTime();
  if (rangeMs === 0) return timelineWidth.value / 2;
  const usable = timelineWidth.value - PADDING_PX * 2;
  return PADDING_PX + ((dateMs - minMs) / rangeMs) * usable;
};

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
    timelineData.value = { ...data, timelineData: data.timelineData || [] };
  } else {
    timelineData.value = {
      name: '',
      timelineData: [],
      project: projectId ? { id: Number(projectId) } : null,
    };
  }

  const resolvedProjectId = timelineData.value.project?.id || (projectId ? Number(projectId) : projectStore.currentProject?.id);
  if (resolvedProjectId) {
    try { projectDocs.value = await loadDocumentsByProject(resolvedProjectId); } catch { projectDocs.value = []; }
    try { projectResources.value = await loadResourcesByProject(resolvedProjectId); } catch { projectResources.value = []; }
  }
});

const handleNameChange = async () => {
  if (!timelineData.value.name) return;
  isSaving.value = true;
  savedSuccessfully.value = false;
  try {
    if (isNewTimeline.value) {
      const created = await createTimeline({
        name: timelineData.value.name,
        timelineData: [],
        project: timelineData.value.project,
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

const openAddEvent = () => {
  editingEvent.value = null;
  eventForm.value = emptyEventForm();
  showEventModal.value = true;
};

const openEditEvent = (event: TimelineEvent) => {
  editingEvent.value = event;
  eventForm.value = {
    title: event.title,
    description: event.description || '',
    date: event.date,
    endDate: event.endDate || '',
    color: event.color,
    docId: event.docId,
    resourceId: event.resourceId,
  };
  showEventModal.value = true;
};

const saveEvent = async () => {
  if (!eventForm.value.title || !eventForm.value.date) return;
  const events: TimelineEvent[] = [...(timelineData.value.timelineData || [])];

  if (editingEvent.value) {
    const idx = events.findIndex((e) => e.id === editingEvent.value!.id);
    if (idx !== -1) {
      events[idx] = {
        ...editingEvent.value,
        title: eventForm.value.title,
        description: eventForm.value.description || undefined,
        date: eventForm.value.date,
        endDate: eventForm.value.endDate || undefined,
        color: eventForm.value.color,
        docId: eventForm.value.docId,
        resourceId: eventForm.value.resourceId,
      };
    }
  } else {
    events.push({
      id: uuidv4(),
      title: eventForm.value.title,
      description: eventForm.value.description || undefined,
      date: eventForm.value.date,
      endDate: eventForm.value.endDate || undefined,
      color: eventForm.value.color,
      docId: eventForm.value.docId,
      resourceId: eventForm.value.resourceId,
    });
  }

  timelineData.value.timelineData = events;
  showEventModal.value = false;
  await saveEvents();
};

const deleteEvent = async () => {
  if (!editingEvent.value) return;
  timelineData.value.timelineData = (timelineData.value.timelineData || []).filter(
    (e: TimelineEvent) => e.id !== editingEvent.value!.id
  );
  showEventModal.value = false;
  await saveEvents();
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
</script>
