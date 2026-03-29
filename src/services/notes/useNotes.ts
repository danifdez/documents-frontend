import { ref } from 'vue';
import apiClient from '../api';
import type { Note } from '../../types/Note';

export function useNotes() {
    const notes = ref<Note[]>([]);
    const note = ref<Note | null>(null);
    const error = ref(null);
    const isLoading = ref(false);

    const loadNotes = async () => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get('/notes');
            notes.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            notes.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadNotesByProject = async (projectId: string | number) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/notes/project/${projectId}`);
            notes.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            notes.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadNotesByThread = async (threadId: string | number) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/notes/thread/${threadId}`);
            notes.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            notes.value = [];
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const loadNote = async (id: string | number) => {
        isLoading.value = true;
        error.value = null;
        try {
            const response = await apiClient.get(`/notes/${id}`);
            note.value = response.data;
            return response.data;
        } catch (err) {
            error.value = err;
            note.value = null;
            throw err;
        } finally {
            isLoading.value = false;
        }
    };

    const createNote = async (data: Partial<Note>) => {
        try {
            const response = await apiClient.post('/notes', data);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const updateNote = async (id: string | number, data: Partial<Note>) => {
        try {
            const response = await apiClient.patch(`/notes/${id}`, data);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    const deleteNote = async (id: string | number) => {
        try {
            const response = await apiClient.delete(`/notes/${id}`);
            return response.data;
        } catch (err) {
            error.value = err;
            throw err;
        }
    };

    return {
        notes,
        note,
        error,
        isLoading,
        loadNotes,
        loadNotesByProject,
        loadNotesByThread,
        loadNote,
        createNote,
        updateNote,
        deleteNote,
    };
}
