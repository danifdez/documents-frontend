import { onMounted, onUnmounted } from 'vue';

export function useGlobalSearchModal(modalRef: any) {
    const handler = (e: KeyboardEvent) => {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            modalRef.value?.open();
        }
    };
    onMounted(() => {
        window.addEventListener('keydown', handler);
    });
    onUnmounted(() => {
        window.removeEventListener('keydown', handler);
    });
}
