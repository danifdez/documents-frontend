import { ref } from 'vue';
import { useTaskPanel } from './useTaskPanel';

const showSearch = ref(false);
const showGlobalSearch = ref(false);

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

            if (event.key === 'Escape') {
                showSearch.value = false;
                showGlobalSearch.value = false;
            }
        }, true);
    }

    return {
        showSearch,
        showGlobalSearch,
    };
}
