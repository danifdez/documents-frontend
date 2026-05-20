<template>
    <Modal v-model="showModal" :title="isEditing ? 'Edit Event' : 'New Event'">
        <form @submit.prevent="handleSubmit" class="space-y-4">
            <FormField label="Title *" v-model="form.title" placeholder="Event title" required />
            <FormField label="Description" v-model="form.description" type="textarea" placeholder="Optional description" :rows="2" />

            <div class="flex items-center gap-3">
                <label class="flex items-center gap-2 cursor-pointer">
                    <input v-model="form.allDay" type="checkbox"
                        class="w-4 h-4 rounded border-border text-accent focus:ring-accent/20" />
                    <span class="text-xs text-text-secondary">All day</span>
                </label>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1.5">Start</label>
                    <input v-model="form.startDate" :type="form.allDay ? 'date' : 'datetime-local'"
                        class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                        required />
                </div>
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1.5">End</label>
                    <input v-model="form.endDate" :type="form.allDay ? 'date' : 'datetime-local'"
                        class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all" />
                </div>
            </div>

            <div class="grid grid-cols-2 gap-3">
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1.5">Color</label>
                    <div class="flex items-center gap-2">
                        <input v-model="form.color" type="color"
                            class="w-8 h-8 rounded-lg border border-border cursor-pointer" />
                        <span class="text-xs text-text-muted">{{ form.color }}</span>
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-medium text-text-secondary mb-1.5">Project</label>
                    <select v-model="form.projectId"
                        class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer">
                        <option :value="null">No project</option>
                        <option v-for="project in projects" :key="project.id" :value="project.id">
                            {{ project.name }}
                        </option>
                    </select>
                </div>
            </div>

            <!-- Recurrence -->
            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1.5">Repeats</label>
                <select v-model="form.recurrencePreset" @change="onRecurrencePresetChange"
                    class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent cursor-pointer">
                    <option value="none">Does not repeat</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="custom">Custom…</option>
                    <option v-if="form.recurrencePreset === 'readonly'" value="readonly">Custom (read-only)</option>
                </select>
                <p v-if="form.recurrencePreset === 'readonly'"
                    class="mt-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                    This recurrence rule can't be edited visually. Edit it via the assistant or delete and recreate.
                </p>
                <textarea v-if="form.recurrencePreset === 'readonly'" :value="form.recurrenceRuleRaw" readonly
                    class="mt-1.5 w-full px-3 py-2 bg-surface border border-border rounded-lg text-[11px] font-mono text-text-muted"
                    rows="2"></textarea>

                <div v-if="form.recurrencePreset === 'custom'" class="mt-2 space-y-2 rounded-lg border border-border bg-surface/50 p-3">
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-[11px] text-text-muted mb-1">Frequency</label>
                            <select v-model="form.customFreq"
                                class="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs">
                                <option value="DAILY">Daily</option>
                                <option value="WEEKLY">Weekly</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="YEARLY">Yearly</option>
                            </select>
                        </div>
                        <div>
                            <label class="block text-[11px] text-text-muted mb-1">Interval</label>
                            <input v-model.number="form.customInterval" type="number" min="1"
                                class="w-full px-2 py-1.5 bg-surface border border-border rounded text-xs" />
                        </div>
                    </div>
                    <div v-if="form.customFreq === 'WEEKLY'">
                        <label class="block text-[11px] text-text-muted mb-1">Days</label>
                        <div class="flex gap-1 flex-wrap">
                            <button v-for="d in WEEKDAYS" :key="d.code" type="button"
                                @click="toggleWeekday(d.code)"
                                :class="[
                                    'px-2 py-1 text-[11px] rounded-md border transition-colors',
                                    form.customByDay.includes(d.code)
                                        ? 'bg-accent text-white border-accent'
                                        : 'bg-surface text-text-secondary border-border hover:bg-surface-hover',
                                ]">
                                {{ d.label }}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label class="block text-[11px] text-text-muted mb-1">Ends</label>
                        <div class="flex flex-col gap-1.5">
                            <label class="flex items-center gap-2 text-xs">
                                <input type="radio" value="never" v-model="form.customEnds" />
                                <span>Never</span>
                            </label>
                            <label class="flex items-center gap-2 text-xs">
                                <input type="radio" value="count" v-model="form.customEnds" />
                                <span>After</span>
                                <input v-model.number="form.customCount" type="number" min="1"
                                    :disabled="form.customEnds !== 'count'"
                                    class="w-16 px-2 py-1 bg-surface border border-border rounded text-xs disabled:opacity-50" />
                                <span>occurrences</span>
                            </label>
                            <label class="flex items-center gap-2 text-xs">
                                <input type="radio" value="until" v-model="form.customEnds" />
                                <span>On</span>
                                <input v-model="form.customUntil" type="date"
                                    :disabled="form.customEnds !== 'until'"
                                    class="px-2 py-1 bg-surface border border-border rounded text-xs disabled:opacity-50" />
                            </label>
                        </div>
                    </div>
                    <p class="text-[11px] text-text-muted">{{ customPreview }}</p>
                </div>
            </div>

            <!-- Alarm -->
            <div>
                <label class="block text-xs font-medium text-text-secondary mb-1.5">Alarm</label>
                <div class="flex gap-1.5 flex-wrap">
                    <button v-for="chip in ALARM_CHIPS" :key="chip.key" type="button"
                        @click="form.alarmPreset = chip.key"
                        :class="[
                            'px-2.5 py-1 text-[11px] rounded-full border transition-colors',
                            form.alarmPreset === chip.key
                                ? 'bg-accent text-white border-accent'
                                : 'bg-surface text-text-secondary border-border hover:bg-surface-hover',
                        ]">
                        {{ chip.label }}
                    </button>
                </div>
                <div v-if="form.alarmPreset === 'custom'" class="mt-2 flex items-center gap-2">
                    <input v-model.number="form.alarmCustomMinutes" type="number" min="0" max="10080"
                        class="w-24 px-2 py-1 bg-surface border border-border rounded text-xs" />
                    <span class="text-[11px] text-text-muted">minutes before start</span>
                </div>
            </div>

            <div class="flex justify-between pt-2">
                <div>
                    <Button v-if="isEditing" type="button" variant="danger" size="small" @click="$emit('delete')">
                        Delete
                    </Button>
                </div>
                <div class="flex gap-2.5">
                    <Button type="button" variant="secondary" @click="closeModal">Cancel</Button>
                    <Button type="submit" variant="info" :disabled="isSubmitting">
                        {{ isSubmitting ? 'Saving...' : (isEditing ? 'Update' : 'Create') }}
                    </Button>
                </div>
            </div>
        </form>
    </Modal>
</template>

<script setup lang="ts">
import { ref, watch, reactive, computed } from 'vue';
import type { CalendarEvent, AlarmDescriptor } from '../../types/CalendarEvent';
import Modal from '../ui/Modal/Modal.vue';
import FormField from '../ui/FormField.vue';
import Button from '../ui/Button.vue';

const props = defineProps<{
    modelValue: boolean;
    event?: CalendarEvent | null;
    projects: Array<{ id: number; name: string }>;
    defaultDate?: Date;
    defaultProjectId?: number | null;
}>();

const emit = defineEmits(['update:modelValue', 'submit', 'delete']);

const showModal = ref(false);
const isSubmitting = ref(false);
const isEditing = ref(false);

type RecurrencePreset = 'none' | 'daily' | 'weekly' | 'custom' | 'readonly';
type AlarmPreset = 'none' | 'start' | '-10' | '-60' | 'custom';

const WEEKDAYS: Array<{ code: string; label: string }> = [
    { code: 'MO', label: 'Mon' }, { code: 'TU', label: 'Tue' }, { code: 'WE', label: 'Wed' },
    { code: 'TH', label: 'Thu' }, { code: 'FR', label: 'Fri' }, { code: 'SA', label: 'Sat' },
    { code: 'SU', label: 'Sun' },
];

const ALARM_CHIPS: Array<{ key: AlarmPreset; label: string }> = [
    { key: 'none', label: 'No alarm' },
    { key: 'start', label: 'At start' },
    { key: '-10', label: '-10 min' },
    { key: '-60', label: '-1 h' },
    { key: 'custom', label: 'Custom' },
];

const form = reactive({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    color: '#3b82f6',
    allDay: false,
    projectId: null as number | null,
    recurrencePreset: 'none' as RecurrencePreset,
    recurrenceRuleRaw: '' as string,
    customFreq: 'DAILY' as 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY',
    customInterval: 1,
    customByDay: [] as string[],
    customEnds: 'never' as 'never' | 'count' | 'until',
    customCount: 10,
    customUntil: '',
    alarmPreset: 'none' as AlarmPreset,
    alarmCustomMinutes: 15,
});

function formatDateForInput(date: Date, allDay: boolean): string {
    if (allDay) {
        return date.toISOString().split('T')[0];
    }
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
}

function resetForm() {
    const date = props.defaultDate || new Date();
    form.title = '';
    form.description = '';
    form.startDate = formatDateForInput(date, false);
    form.endDate = '';
    form.color = '#3b82f6';
    form.allDay = false;
    form.projectId = null;
    form.recurrencePreset = 'none';
    form.recurrenceRuleRaw = '';
    form.customFreq = 'DAILY';
    form.customInterval = 1;
    form.customByDay = [];
    form.customEnds = 'never';
    form.customCount = 10;
    form.customUntil = '';
    form.alarmPreset = 'none';
    form.alarmCustomMinutes = 15;
    isEditing.value = false;
}

function toggleWeekday(code: string) {
    const i = form.customByDay.indexOf(code);
    if (i >= 0) form.customByDay.splice(i, 1);
    else form.customByDay.push(code);
}

function onRecurrencePresetChange() {
    if (form.recurrencePreset === 'weekly' && form.customByDay.length === 0) {
        // Default to the start date's weekday.
        const d = form.startDate ? new Date(form.startDate) : new Date();
        form.customByDay = [WEEKDAYS[(d.getDay() + 6) % 7].code];
    }
}

function buildRRule(): string | null {
    if (form.recurrencePreset === 'none') return null;
    if (form.recurrencePreset === 'readonly') return form.recurrenceRuleRaw || null;
    if (form.recurrencePreset === 'daily') return 'FREQ=DAILY';
    if (form.recurrencePreset === 'weekly') {
        const d = form.startDate ? new Date(form.startDate) : new Date();
        const code = WEEKDAYS[(d.getDay() + 6) % 7].code;
        return `FREQ=WEEKLY;BYDAY=${code}`;
    }
    // custom
    const parts: string[] = [`FREQ=${form.customFreq}`];
    if (form.customInterval > 1) parts.push(`INTERVAL=${form.customInterval}`);
    if (form.customFreq === 'WEEKLY' && form.customByDay.length > 0) {
        parts.push(`BYDAY=${form.customByDay.join(',')}`);
    }
    if (form.customEnds === 'count' && form.customCount > 0) {
        parts.push(`COUNT=${form.customCount}`);
    } else if (form.customEnds === 'until' && form.customUntil) {
        const until = form.customUntil.replace(/-/g, '') + 'T235959Z';
        parts.push(`UNTIL=${until}`);
    }
    return parts.join(';');
}

function parseRRule(rule: string): boolean {
    // Returns true if the rule was mapped to one of the editable modes.
    const map: Record<string, string> = {};
    for (const segment of rule.split(';')) {
        const [k, v] = segment.split('=');
        if (k && v !== undefined) map[k.trim()] = v.trim();
    }
    const freq = map.FREQ;
    if (!freq) return false;
    // Simple "daily" preset → FREQ=DAILY, nothing else.
    if (freq === 'DAILY' && !map.INTERVAL && !map.COUNT && !map.UNTIL && !map.BYHOUR) {
        form.recurrencePreset = 'daily';
        return true;
    }
    // Simple "weekly" preset → FREQ=WEEKLY;BYDAY=XX (single day).
    if (freq === 'WEEKLY' && map.BYDAY && !map.INTERVAL && !map.COUNT && !map.UNTIL && map.BYDAY.split(',').length === 1) {
        form.recurrencePreset = 'weekly';
        return true;
    }
    // Custom mappable: FREQ + optional INTERVAL/COUNT/UNTIL/BYDAY (weekly only).
    const supportedKeys = new Set(['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY']);
    const allowedFreqs = new Set(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);
    const otherKeys = Object.keys(map).filter((k) => !supportedKeys.has(k));
    if (otherKeys.length === 0 && allowedFreqs.has(freq)) {
        form.recurrencePreset = 'custom';
        form.customFreq = freq as any;
        form.customInterval = map.INTERVAL ? Number(map.INTERVAL) : 1;
        form.customByDay = map.BYDAY ? map.BYDAY.split(',') : [];
        if (map.COUNT) {
            form.customEnds = 'count';
            form.customCount = Number(map.COUNT);
        } else if (map.UNTIL) {
            form.customEnds = 'until';
            // UNTIL = YYYYMMDDTHHMMSSZ — extract date.
            form.customUntil = `${map.UNTIL.slice(0, 4)}-${map.UNTIL.slice(4, 6)}-${map.UNTIL.slice(6, 8)}`;
        } else {
            form.customEnds = 'never';
        }
        return true;
    }
    // Unmappable.
    form.recurrencePreset = 'readonly';
    form.recurrenceRuleRaw = rule;
    return false;
}

function applyAlarmFromDescriptor(a: AlarmDescriptor | null) {
    if (!a) {
        form.alarmPreset = 'none';
        return;
    }
    if (a.offsetMinutes === 0) form.alarmPreset = 'start';
    else if (a.offsetMinutes === -10) form.alarmPreset = '-10';
    else if (a.offsetMinutes === -60) form.alarmPreset = '-60';
    else {
        form.alarmPreset = 'custom';
        form.alarmCustomMinutes = Math.abs(a.offsetMinutes);
    }
}

function buildAlarm(): AlarmDescriptor | null {
    switch (form.alarmPreset) {
        case 'none': return null;
        case 'start': return { offsetMinutes: 0 };
        case '-10': return { offsetMinutes: -10 };
        case '-60': return { offsetMinutes: -60 };
        case 'custom': {
            const m = Math.max(0, Math.min(10080, form.alarmCustomMinutes | 0));
            return { offsetMinutes: -m };
        }
    }
}

const customPreview = computed(() => {
    if (form.recurrencePreset !== 'custom') return '';
    const f = form.customFreq.toLowerCase();
    const every = form.customInterval > 1 ? `every ${form.customInterval} ${f === 'daily' ? 'days' : f.replace(/ly$/, '') + 's'}` : `${f}`;
    let end = '';
    if (form.customEnds === 'count' && form.customCount > 0) end = `, ${form.customCount} times`;
    else if (form.customEnds === 'until' && form.customUntil) end = `, until ${form.customUntil}`;
    const days = form.customFreq === 'WEEKLY' && form.customByDay.length > 0 ? ` on ${form.customByDay.join(',')}` : '';
    return `${every}${days}${end}`;
});

watch(() => props.modelValue, (v) => {
    showModal.value = v;
    if (v) {
        if (props.event) {
            isEditing.value = true;
            form.title = props.event.title;
            form.description = props.event.description || '';
            form.startDate = formatDateForInput(new Date(props.event.startDate), props.event.allDay);
            form.endDate = props.event.endDate ? formatDateForInput(new Date(props.event.endDate), props.event.allDay) : '';
            form.color = props.event.color || '#3b82f6';
            form.allDay = props.event.allDay;
            form.projectId = props.event.project?.id || null;
            if (props.event.recurrenceRule) {
                parseRRule(props.event.recurrenceRule);
            } else {
                form.recurrencePreset = 'none';
                form.recurrenceRuleRaw = '';
            }
            applyAlarmFromDescriptor(props.event.alarm ?? null);
        } else {
            resetForm();
            if (props.defaultDate) {
                form.startDate = formatDateForInput(props.defaultDate, false);
            }
            if (props.defaultProjectId) {
                form.projectId = props.defaultProjectId;
            }
        }
    }
});

watch(showModal, (v) => { emit('update:modelValue', v); });

function handleSubmit() {
    if (!form.title.trim()) return;
    isSubmitting.value = true;

    const data: any = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        startDate: new Date(form.startDate).toISOString(),
        endDate: form.endDate ? new Date(form.endDate).toISOString() : null,
        color: form.color,
        allDay: form.allDay,
        recurrenceRule: buildRRule(),
        alarm: buildAlarm(),
    };

    if (form.projectId) {
        data.project = { id: form.projectId };
    } else {
        data.project = null;
    }

    if (isEditing.value && props.event) {
        data.id = props.event.id;
    }

    emit('submit', data);
    isSubmitting.value = false;
    closeModal();
}

function closeModal() {
    showModal.value = false;
    emit('update:modelValue', false);
}
</script>
