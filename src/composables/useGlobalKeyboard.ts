import { ref, onMounted, onUnmounted } from 'vue';

export function useGlobalKeyboard() {
    const showSearch = ref(false);
    const showGlobalSearch = ref(false);

    const handleKeydown = (event: KeyboardEvent) => {
        if (event.ctrlKey) {
            if (event.shiftKey && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                showGlobalSearch.value = true;
            } else if (event.key === 'f') {
                event.preventDefault();
                showSearch.value = true;
            }
        }

        if (event.key === 'Escape') {
            showSearch.value = false;
            showGlobalSearch.value = false;
        }
    };

    onMounted(() => {
        document.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
        document.removeEventListener('keydown', handleKeydown);
    });

    return {
        showSearch,
        showGlobalSearch,
    };
}
