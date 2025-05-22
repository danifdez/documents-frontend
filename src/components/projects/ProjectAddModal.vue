<template>
    <Modal v-model="showModal" title="Create New Project">
        <form @submit.prevent="addProject" class="space-y-4">
            <div>
                <label for="projectName" class="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                <input id="projectName" v-model="newProjectName" type="text" placeholder="Enter project name"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required />
            </div>

            <div>
                <label for="projectDescription" class="block text-sm font-medium text-gray-700 mb-1">Description
                    (optional)</label>
                <textarea id="projectDescription" v-model="projectDescription" placeholder="Enter project description"
                    rows="3"
                    class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"></textarea>
            </div>

            <div class="flex justify-end pt-2" slot="footer">
                <Button type="button" variant="secondary" @click="closeModal" class="mr-2">
                    Cancel
                </Button>
                <Button type="submit" :disabled="isSubmitting">
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
            const projectId = newProject._id;
            newProjectName.value = '';
            projectDescription.value = '';
            closeModal();

            emit('project:created', projectId);
            const projectStore = useProjectStore();
            if (newProject && newProject._id) {
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