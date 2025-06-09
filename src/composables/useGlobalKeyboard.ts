import { ref, onMounted, onUnmounted } from 'vue';

export function useGlobalKeyboard() {
    const showFloatingSearch = ref(false);

    const handleKeydown = (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
            event.preventDefault();
            showFloatingSearch.value = true;
        }

        if (event.key === 'Escape' && showFloatingSearch.value) {
            showFloatingSearch.value = false;
        }
    };

    onMounted(() => {
        document.addEventListener('keydown', handleKeydown);
    });

    onUnmounted(() => {
        document.removeEventListener('keydown', handleKeydown);
    });

    return {
        showFloatingSearch
    };
}
