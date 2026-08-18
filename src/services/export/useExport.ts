import { ref } from 'vue';
import apiClient from '../api';

export interface ExportProject {
    id: number;
    name: string;
    description?: string;
}

export function useExport() {
    const availableProjects = ref<ExportProject[]>([]);
    const exporting = ref(false);
    const exportError = ref('');
    const exportSuccess = ref(false);

    const loadProjects = async () => {
        try {
            const { data } = await apiClient.get('/export/projects');
            availableProjects.value = data;
        } catch {
            availableProjects.value = [];
        }
    };

    // An empty projectIds array means "export all projects".
    const exportProjects = async (projectIds: number[]) => {
        exporting.value = true;
        exportError.value = '';
        exportSuccess.value = false;

        try {
            const response = await apiClient.post('/export', { projectIds }, {
                responseType: 'blob',
            });

            const contentDisposition = response.headers['content-disposition'];
            let filename = 'export.zip';
            if (contentDisposition) {
                const match = contentDisposition.match(/filename="?([^";\n]+)"?/);
                if (match) filename = match[1];
            }

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);

            exportSuccess.value = true;
        } catch (err: any) {
            exportError.value = err?.response?.data?.message || 'Failed to export. Please try again.';
        } finally {
            exporting.value = false;
        }
    };

    return {
        availableProjects,
        exporting,
        exportError,
        exportSuccess,
        loadProjects,
        exportProjects,
    };
}
