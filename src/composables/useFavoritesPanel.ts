import { ref } from 'vue';

const showFavoritesPanel = ref(false);

export function useFavoritesPanel() {
    const toggle = () => {
        showFavoritesPanel.value = !showFavoritesPanel.value;
    };

    return { showFavoritesPanel, toggleFavoritesPanel: toggle };
}
