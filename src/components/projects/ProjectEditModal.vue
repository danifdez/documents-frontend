<template>
    <Modal v-model="showModal" title="Edit Project">
        <form @submit.prevent="saveProject" class="space-y-4">
            <FormField label="Project Name" v-model="projectData.name" required placeholder="Enter project name" />

            <FormField label="Description (optional)" v-model="projectData.description" type="textarea" placeholder="Enter project description" />

            <div class="flex justify-end pt-2" slot="footer">
                <Button type="button" variant="secondary" @click="closeModal" class="mr-2">
                    Cancel
                </Button>
                <Button type="submit" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Saving...' : 'Save Changes' }}
                </Button>
            </div>
        </form>
    </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useProject } from '../../services/projects/useProject';
import Modal from '../ui/Modal/Modal.vue';
import Button from '../ui/Button.vue';
import FormField from '../ui/FormField.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    },
    projectId: {
        type: String,
        required: true
    }
});

const emit = defineEmits(['update:modelValue', 'project:updated']);

const { loadProject, updateProject } = useProject();
const projectData = ref({ name: '', description: '' });
const isSubmitting = ref(false);
const showModal = ref(false);

showModal.value = props.modelValue;

watch(() => props.modelValue, (newVal) => {
    showModal.value = newVal;
    if (newVal) {
        loadProjectData();
    }
});

watch(() => showModal.value, (newVal) => {
    emit('update:modelValue', newVal);
});

async function loadProjectData() {
    try {
        const project = await loadProject(props.projectId);
        projectData.value = {
            name: project.name || '',
            description: project.description || ''
        };
    } catch (error) {
        console.error('Failed to load project:', error);
    }
}

async function saveProject() {
    if (!projectData.value.name.trim()) return;

    try {
        isSubmitting.value = true;
        await updateProject(props.projectId, projectData.value);
        closeModal();
        emit('project:updated', props.projectId);
    } catch (error) {
        console.error('Error updating project:', error);
    } finally {
        isSubmitting.value = false;
    }
}

function closeModal() {
    showModal.value = false;
    emit('update:modelValue', false);
}
</script>