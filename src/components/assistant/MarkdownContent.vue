<template>
    <div class="markdown-content" v-html="rendered"></div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const props = defineProps<{
    text: string;
}>();

// LLM output can contain anything — we parse with marked (no JS execution by
// design) and then run the result through DOMPurify to be safe against any
// HTML the model may have echoed inside the markdown.
marked.setOptions({
    gfm: true,        // GitHub-flavoured (tables, strikethrough, autolinks)
    breaks: true,     // single newline → <br> — matches how chat models write
});

const rendered = computed(() => {
    if (!props.text) return '';
    const html = marked.parse(props.text, { async: false }) as string;
    return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
});
</script>

<style scoped>
.markdown-content {
    font-size: 0.875rem;
    line-height: 1.55;
    color: inherit;
    word-break: break-word;
}

.markdown-content :deep(p) {
    margin: 0;
}
.markdown-content :deep(p + p),
.markdown-content :deep(p + ul),
.markdown-content :deep(p + ol),
.markdown-content :deep(p + pre),
.markdown-content :deep(p + blockquote),
.markdown-content :deep(ul + p),
.markdown-content :deep(ol + p),
.markdown-content :deep(pre + p) {
    margin-top: 0.5rem;
}

.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3),
.markdown-content :deep(h4) {
    font-weight: 600;
    margin: 0.6rem 0 0.3rem;
    line-height: 1.3;
}
.markdown-content :deep(h1) { font-size: 1.05rem; }
.markdown-content :deep(h2) { font-size: 1rem; }
.markdown-content :deep(h3) { font-size: 0.95rem; }
.markdown-content :deep(h4) { font-size: 0.9rem; }

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
    margin: 0.25rem 0;
    padding-left: 1.25rem;
}
.markdown-content :deep(ul) { list-style: disc; }
.markdown-content :deep(ol) { list-style: decimal; }
.markdown-content :deep(li) { margin: 0.1rem 0; }
.markdown-content :deep(li > p) { margin: 0; }

.markdown-content :deep(code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.85em;
    padding: 0.1em 0.35em;
    border-radius: 0.25rem;
    background-color: color-mix(in srgb, var(--color-text-primary) 8%, transparent);
}

.markdown-content :deep(pre) {
    margin: 0.5rem 0;
    padding: 0.6rem 0.8rem;
    border-radius: 0.5rem;
    background-color: color-mix(in srgb, var(--color-text-primary) 6%, transparent);
    overflow-x: auto;
    font-size: 0.825rem;
}
.markdown-content :deep(pre code) {
    background: transparent;
    padding: 0;
    font-size: inherit;
}

.markdown-content :deep(blockquote) {
    margin: 0.4rem 0;
    padding: 0.1rem 0 0.1rem 0.75rem;
    border-left: 3px solid color-mix(in srgb, var(--color-text-primary) 25%, transparent);
    color: var(--color-text-secondary);
}

.markdown-content :deep(a) {
    color: var(--color-accent);
    text-decoration: underline;
    text-underline-offset: 2px;
}

.markdown-content :deep(table) {
    border-collapse: collapse;
    margin: 0.4rem 0;
    font-size: 0.85em;
}
.markdown-content :deep(th),
.markdown-content :deep(td) {
    border: 1px solid var(--color-border);
    padding: 0.25rem 0.5rem;
    text-align: left;
}
.markdown-content :deep(th) {
    background-color: color-mix(in srgb, var(--color-text-primary) 5%, transparent);
    font-weight: 600;
}

.markdown-content :deep(hr) {
    margin: 0.6rem 0;
    border: 0;
    border-top: 1px solid var(--color-border);
}

.markdown-content :deep(strong) { font-weight: 600; }
.markdown-content :deep(em) { font-style: italic; }
</style>
