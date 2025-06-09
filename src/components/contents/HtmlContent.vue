<template>
    <div ref="extractedContent" class="w-full min-h-[600px] resource-detail" v-html="content">
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const extractedContent = ref<HTMLDivElement | null>(null);
const matches = ref([]);

defineProps({
    content: {
        type: String,
    },
});

const escapeRegExp = (text: string) => {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const search = (text: string) => {
    clearHighlights();
    const regex = new RegExp(escapeRegExp(text), 'gi');
    const walker = document.createTreeWalker(extractedContent.value, NodeFilter.SHOW_TEXT, null);
    const ranges = [];

    while (walker.nextNode()) {
        const node = walker.currentNode;
        let match;
        while ((match = regex.exec(node.textContent)) !== null) {
            const range = document.createRange();
            range.setStart(node, match.index);
            range.setEnd(node, match.index + match[0].length);
            ranges.push(range);
        }
    }

    matches.value = ranges.map(range => {
        const highlight = document.createElement('mark');
        highlight.className = 'search-highlight';
        range.surroundContents(highlight);
        return highlight;
    });

    return matches.value.length;
}

const scrollTo = (index: number) => {
    matches.value.forEach((el, idx) =>
        el.classList.toggle('active-highlight', idx === index)
    );
    if (matches.value[index]) {
        matches.value[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
};

const clearHighlights = () => {
    const highlights = extractedContent.value.querySelectorAll('mark.search-highlight');
    highlights.forEach(mark => {
        const parent = mark.parentNode;
        while (mark.firstChild) {
            parent.insertBefore(mark.firstChild, mark);
        }
        parent.removeChild(mark);
        parent.normalize();
    });
}

defineExpose({
    search,
    matches,
    scrollTo,
    clearHighlights,
});
</script>