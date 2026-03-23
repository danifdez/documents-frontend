import { ref } from 'vue';

const showTaskPanel = ref(false);

export function useTaskPanel() {
    const toggle = () => {
        showTaskPanel.value = !showTaskPanel.value;
    };

    return { showTaskPanel, toggleTaskPanel: toggle };
}
