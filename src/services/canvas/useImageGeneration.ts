import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import apiClient from '../api';
import { getSocket } from '../notifications/notification';

export interface GeneratedImage {
    resourceId: number;
    url: string;
    prompt: string;
    width: number;
    height: number;
    createdAt: Date;
}

export interface ImageGenerateParams {
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    guidanceScale?: number;
    seed?: number;
    canvasId?: number;
    projectId?: number;
}

export interface ImageEditParams {
    resourceId: number;
    prompt: string;
    negativePrompt?: string;
    strength?: number;
    steps?: number;
    guidanceScale?: number;
    seed?: number;
    canvasId?: number;
    projectId?: number;
}

const TIMEOUT_MS = 120_000;

export function useImageGeneration() {
    const isGenerating = ref(false);
    const isEditing = ref(false);
    const error = ref<string | null>(null);
    const generationHistory = ref<GeneratedImage[]>([]);
    const lastGenerated = ref<GeneratedImage | null>(null);
    const lastEdited = ref<GeneratedImage | null>(null);

    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

    const loadHistory = (canvasId: number) => {
        try {
            const stored = localStorage.getItem(`ai-image-history-${canvasId}`);
            if (stored) {
                generationHistory.value = JSON.parse(stored).map((item: any) => ({
                    ...item,
                    createdAt: new Date(item.createdAt),
                }));
            }
        } catch {
            generationHistory.value = [];
        }
    };

    const saveHistory = (canvasId: number) => {
        try {
            const toStore = generationHistory.value.slice(0, 50);
            localStorage.setItem(`ai-image-history-${canvasId}`, JSON.stringify(toStore));
        } catch {
            // Ignore storage errors
        }
    };

    const generate = async (params: ImageGenerateParams): Promise<GeneratedImage | null> => {
        isGenerating.value = true;
        error.value = null;
        lastGenerated.value = null;
        const requestId = uuidv4();

        return new Promise<GeneratedImage | null>((resolve) => {
            const socket = getSocket();
            let timeoutId: ReturnType<typeof setTimeout>;

            const cleanup = () => {
                socket.off('imageGenerateResponse', onResponse);
                clearTimeout(timeoutId);
                isGenerating.value = false;
            };

            const onResponse = (data: any) => {
                if (data.requestId === requestId) {
                    cleanup();
                    const image: GeneratedImage = {
                        resourceId: data.resourceId,
                        url: `${apiBaseUrl}/resources/${data.resourceId}/view`,
                        prompt: data.prompt || params.prompt,
                        width: data.width,
                        height: data.height,
                        createdAt: new Date(),
                    };
                    lastGenerated.value = image;
                    generationHistory.value.unshift(image);
                    if (params.canvasId) saveHistory(params.canvasId);
                    resolve(image);
                }
            };

            timeoutId = setTimeout(() => {
                cleanup();
                error.value = 'Image generation timed out. The model may still be loading.';
                resolve(null);
            }, TIMEOUT_MS);

            socket.on('imageGenerateResponse', onResponse);

            apiClient.post('/model/image-generate', { ...params, requestId })
                .catch((err: any) => {
                    cleanup();
                    error.value = err.response?.data?.message || err.message || 'Failed to start image generation';
                    resolve(null);
                });
        });
    };

    const edit = async (params: ImageEditParams): Promise<GeneratedImage | null> => {
        isEditing.value = true;
        error.value = null;
        lastEdited.value = null;
        const requestId = uuidv4();

        return new Promise<GeneratedImage | null>((resolve) => {
            const socket = getSocket();
            let timeoutId: ReturnType<typeof setTimeout>;

            const cleanup = () => {
                socket.off('imageEditResponse', onResponse);
                clearTimeout(timeoutId);
                isEditing.value = false;
            };

            const onResponse = (data: any) => {
                if (data.requestId === requestId) {
                    cleanup();
                    const image: GeneratedImage = {
                        resourceId: data.resourceId,
                        url: `${apiBaseUrl}/resources/${data.resourceId}/view`,
                        prompt: data.prompt || params.prompt,
                        width: data.width,
                        height: data.height,
                        createdAt: new Date(),
                    };
                    lastEdited.value = image;
                    generationHistory.value.unshift(image);
                    if (params.canvasId) saveHistory(params.canvasId);
                    resolve(image);
                }
            };

            timeoutId = setTimeout(() => {
                cleanup();
                error.value = 'Image editing timed out. The model may still be loading.';
                resolve(null);
            }, TIMEOUT_MS);

            socket.on('imageEditResponse', onResponse);

            apiClient.post('/model/image-edit', { ...params, requestId })
                .catch((err: any) => {
                    cleanup();
                    error.value = err.response?.data?.message || err.message || 'Failed to start image editing';
                    resolve(null);
                });
        });
    };

    return {
        generate,
        edit,
        isGenerating,
        isEditing,
        error,
        generationHistory,
        lastGenerated,
        lastEdited,
        loadHistory,
    };
}
