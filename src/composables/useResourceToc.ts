import { ref, type Ref } from 'vue';

export interface TocItem {
    id: string;
    text: string;
    level: number;
}

// contentRef is a template ref to HtmlContent, which exposes `toc` and `scrollToHeading`
export function useResourceToc(contentRef: Ref<any>) {
    const tocItems = ref<TocItem[]>([]);

    const refreshToc = () => {
        try {
            if (contentRef.value && contentRef.value.toc) {
                tocItems.value = contentRef.value.toc;
            } else {
                tocItems.value = [];
            }
        } catch (e) {
            tocItems.value = [];
        }
    };

    const scrollToHeading = (id: string) => {
        try {
            if (contentRef.value && typeof contentRef.value.scrollToHeading === 'function') {
                contentRef.value.scrollToHeading(id);
            }
        } catch (e) {
            console.error('Failed to scroll to heading', e);
        }
    };

    return {
        tocItems,
        refreshToc,
        scrollToHeading,
    };
}
