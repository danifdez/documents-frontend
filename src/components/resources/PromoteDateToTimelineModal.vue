<template>
    <Teleport to="body">
        <Transition name="modal">
            <div v-if="modelValue"
                class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                @click.self="close">
                <div class="bg-surface-elevated rounded-xl shadow-2xl border border-border max-w-lg w-full mx-4 overflow-hidden">
                    <div class="px-6 py-4 border-b border-border-light">
                        <h3 class="text-base font-semibold text-text-primary tracking-tight">Add to project timeline</h3>
                        <p class="text-xs text-text-muted mt-0.5">
                            Adds <em>{{ date?.rawExpression }}</em> ({{ date?.date }}) to a timeline.
                        </p>
                    </div>

                    <div class="px-6 py-5 space-y-4 max-h-[60vh] overflow-y-auto">
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Title</label>
                            <input v-model="eventTitle" type="text"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                        </div>
                        <div>
                            <label class="block text-xs font-medium text-text-secondary mb-1.5">Description</label>
                            <textarea v-model="eventDescription" rows="2"
                                class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                        </div>
                        <div class="flex items-center gap-3">
                            <label class="text-xs font-medium text-text-secondary">Color</label>
                            <input v-model="eventColor" type="color"
                                class="h-7 w-10 rounded border border-border bg-surface cursor-pointer" />
                            <span class="text-xs text-text-muted">{{ eventColor }}</span>
                        </div>

                        <div class="border-t border-border-light pt-3">
                            <label class="block text-xs font-medium text-text-secondary mb-2">Target timeline</label>
                            <div v-if="loadingTimelines" class="flex justify-center py-4">
                                <div class="animate-spin rounded-full h-5 w-5 border-2 border-accent border-t-transparent"></div>
                            </div>
                            <div v-else class="space-y-1">
                                <label
                                    v-for="tl in timelines" :key="tl.id"
                                    class="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-surface-hover rounded px-2 py-1.5"
                                    :class="{ 'bg-accent-subtle': mode === 'existing' && selectedId === tl.id }">
                                    <input type="radio" :value="String(tl.id)" v-model="targetChoice"
                                        name="promote-timeline-target"
                                        class="text-accent focus:ring-accent/20" />
                                    <span class="flex-1 truncate">{{ tl.name }}</span>
                                    <span class="text-[10px] text-text-muted">
                                        {{ (tl.timelineData || []).length }} events
                                    </span>
                                </label>
                                <label
                                    class="flex items-center gap-2 text-sm text-text-primary cursor-pointer hover:bg-surface-hover rounded px-2 py-1.5"
                                    :class="{ 'bg-accent-subtle': mode === 'new' }">
                                    <input type="radio" value="__new__" v-model="targetChoice"
                                        name="promote-timeline-target" class="text-accent focus:ring-accent/20" />
                                    <span>Create new timeline…</span>
                                </label>
                                <div v-if="mode === 'new'" class="pl-6 pt-2">
                                    <input v-model="newTimelineName" type="text" placeholder="Timeline name"
                                        class="block w-full rounded-lg bg-surface border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent" />
                                </div>
                            </div>
                        </div>

                        <div v-if="errorMessage" class="text-xs text-red-600 dark:text-red-400">{{ errorMessage }}</div>
                    </div>

                    <div class="px-6 py-4 border-t border-border-light flex justify-end gap-2.5">
                        <Button @click="close" variant="secondary" :disabled="saving">Cancel</Button>
                        <Button @click="handleConfirm" variant="primary"
                            :disabled="!canConfirm || saving">
                            {{ saving ? 'Adding…' : 'Add to timeline' }}
                        </Button>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import Button from '../ui/Button.vue';
import { useTimelines } from '../../services/timelines/useTimelines';
import type { ResourceDate } from '../../types/ResourceDate';
import type { TimelineEvent, TimelineRecord } from '../../types/timeline';

const props = defineProps<{
    modelValue: boolean;
    projectId: number | null | undefined;
    resourceId: number;
    date: ResourceDate | null;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', v: boolean): void;
    (e: 'promoted', payload: { timelineId: number; event: TimelineEvent }): void;
}>();

const { loadTimelinesByProject, loadTimeline, createTimeline, updateTimeline } = useTimelines();

const timelines = ref<TimelineRecord[]>([]);
const loadingTimelines = ref(false);
const saving = ref(false);
const errorMessage = ref<string | null>(null);

const targetChoice = ref<string>('__new__');
const newTimelineName = ref('');
const eventTitle = ref('');
const eventDescription = ref('');
const eventColor = ref('#3b82f6');

const mode = computed<'existing' | 'new'>(() => (targetChoice.value === '__new__' ? 'new' : 'existing'));
const selectedId = computed<number>(() => {
    const n = Number(targetChoice.value);
    return Number.isFinite(n) ? n : 0;
});

const canConfirm = computed(() => {
    if (!props.date || !eventTitle.value.trim()) return false;
    if (mode.value === 'new') return !!newTimelineName.value.trim();
    return selectedId.value > 0;
});

watch(
    () => props.modelValue,
    async (open) => {
        if (!open) return;
        errorMessage.value = null;
        targetChoice.value = '__new__';
        newTimelineName.value = `Dates from resource #${props.resourceId}`;
        eventTitle.value = props.date?.rawExpression || '';
        eventDescription.value = props.date?.contextSnippet || '';
        eventColor.value = '#3b82f6';

        if (!props.projectId) {
            timelines.value = [];
            return;
        }
        loadingTimelines.value = true;
        try {
            const list = await loadTimelinesByProject(props.projectId);
            timelines.value = list || [];
            if (timelines.value.length > 0) {
                targetChoice.value = String(timelines.value[0].id);
            }
        } catch (e: any) {
            errorMessage.value = e?.message || 'Failed to load timelines';
        } finally {
            loadingTimelines.value = false;
        }
    },
);

function close() {
    if (saving.value) return;
    emit('update:modelValue', false);
}

function buildEvent(): TimelineEvent {
    const d = props.date!;
    return {
        id: uuidv4(),
        title: eventTitle.value.trim(),
        description: eventDescription.value.trim() || undefined,
        date: d.date as string,
        endDate: d.endDate || undefined,
        color: eventColor.value,
        resourceId: props.resourceId,
    };
}

async function handleConfirm() {
    if (!canConfirm.value || !props.date?.date) return;
    saving.value = true;
    errorMessage.value = null;
    try {
        const event = buildEvent();
        let timelineId: number;

        if (mode.value === 'new') {
            if (!props.projectId) throw new Error('Resource has no project');
            const created = await createTimeline({
                name: newTimelineName.value.trim(),
                timelineData: [event],
                projectId: props.projectId,
            } as Partial<TimelineRecord>);
            timelineId = created.id;
        } else {
            const current = await loadTimeline(selectedId.value);
            if (!current) throw new Error('Timeline not found');
            const nextEvents = [...(current.timelineData || []), event];
            await updateTimeline(current.id, { timelineData: nextEvents } as Partial<TimelineRecord>);
            timelineId = current.id;
        }

        emit('promoted', { timelineId, event });
        emit('update:modelValue', false);
    } catch (e: any) {
        errorMessage.value = e?.response?.data?.message || e?.message || 'Failed to add event to timeline';
    } finally {
        saving.value = false;
    }
}
</script>

<style scoped>
.modal-enter-active { transition: opacity 0.2s ease; }
.modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
</style>
