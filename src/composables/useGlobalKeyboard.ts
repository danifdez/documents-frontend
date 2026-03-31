import { ref } from 'vue';
import { useTaskPanel } from './useTaskPanel';

const showSearch = ref(false);
const showGlobalSearch = ref(false);
const showNotesPanel = ref(false);
const quickNoteRequested = ref(0);

let initialized = false;

export function useGlobalKeyboard() {
    const { toggleTaskPanel } = useTaskPanel();

    if (!initialized) {
        initialized = true;

        window.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.ctrlKey) {
                if (event.shiftKey && event.key.toLowerCase() === 'f') {
                    event.preventDefault();
                    showGlobalSearch.value = true;
                } else if (event.key === 'f') {
                    event.preventDefault();
                    showSearch.value = true;
                }
            }

            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 't') {
                event.preventDefault();
                toggleTaskPanel();
            }

            // Ctrl+Shift+N: Toggle notes panel
            if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                showNotesPanel.value = !showNotesPanel.value;
            }

            // Ctrl+Alt+N: Quick create note
            if (event.ctrlKey && event.altKey && event.key.toLowerCase() === 'n') {
                event.preventDefault();
                showNotesPanel.value = true;
                quickNoteRequested.value++;
            }

            if (event.key === 'Escape') {
                showSearch.value = false;
                showGlobalSearch.value = false;
                if (showNotesPanel.value) {
                    showNotesPanel.value = false;
                }
            }
        }, true);
    }

    return {
        showSearch,
        showGlobalSearch,
        showNotesPanel,
        quickNoteRequested,
    };
}
