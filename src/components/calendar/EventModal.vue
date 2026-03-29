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
import { ref, watch, reactive } from 'vue';
import type { CalendarEvent } from '../../types/CalendarEvent';
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

const form = reactive({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    color: '#3b82f6',
    allDay: false,
    projectId: null as number | null,
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
    isEditing.value = false;
}

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
