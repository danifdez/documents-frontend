<template>
    <Modal v-model="showModal" title="New Project">
        <form @submit.prevent="addProject" class="space-y-5">
            <FormField label="Project Name" v-model="newProjectName" placeholder="Enter project name" required />
            <FormField label="Description" v-model="projectDescription" type="textarea" placeholder="Enter project description" hint="Optional" />

            <div class="flex justify-end gap-2.5 pt-2">
                <Button type="button" variant="secondary" @click="closeModal">
                    Cancel
                </Button>
                <Button type="submit" variant="info" :disabled="isSubmitting">
                    {{ isSubmitting ? 'Creating...' : 'Create Project' }}
                </Button>
            </div>
        </form>
    </Modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectCreate } from '../../services/projects/useProjectCreate';
import { useProjectStore } from '../../store/projectStore';
import Modal from '../ui/Modal/Modal.vue';
import Button from '../ui/Button.vue';
import FormField from '../ui/FormField.vue';

const props = defineProps({
    modelValue: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['update:modelValue', 'project:created']);

const router = useRouter();
const { status, createProject } = useProjectCreate();
const newProjectName = ref('');
const projectDescription = ref('');
const isSubmitting = ref(false);

const showModal = ref(false);

showModal.value = props.modelValue;

watch(() => props.modelValue, (newVal) => {
    showModal.value = newVal;
});

watch(() => showModal.value, (newVal) => {
    emit('update:modelValue', newVal);
});

async function addProject() {
    if (!newProjectName.value.trim()) return;

    try {
        isSubmitting.value = true;
        const newProject = await createProject(newProjectName.value, projectDescription.value);

        if (status.value && newProject) {
            const projectId = newProject.id;
            newProjectName.value = '';
            projectDescription.value = '';
            closeModal();

            emit('project:created', projectId);
            const projectStore = useProjectStore();
            if (newProject && newProject.id) {
                projectStore.setCurrentProject(newProject);
            } else {
                console.error('Invalid project data, cannot set in store');
            }

            router.push(`/project/${projectId}`);
        }
    } catch (error) {
        console.error('Error adding project:', error);
    } finally {
        isSubmitting.value = false;
    }
}

function closeModal() {
    showModal.value = false;
    emit('update:modelValue', false);
}
</script>
