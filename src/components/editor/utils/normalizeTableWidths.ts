const WIDTH_STYLE_PATTERN = /(?:^|;)\s*(?:min-|max-)?width\s*:[^;]*;?/gi;

/**
 * Removes the explicit `width` declarations a table carries when copied from a
 * web page, Word or PDF. Tiptap parses cell/column widths into its `colwidth`
 * attribute; when every cell has one, the table node view pins an inline
 * `width: <n>px` on the `<table>`, which beats the editor's `width: 100%` and
 * leaves the pasted table narrower than the document. Dropping those widths
 * lets the table fill the editor width by default while the user can still
 * resize columns afterwards.
 */
export function normalizeTableWidths(html: string): string {
    if (!html || !/<table[\s>]/i.test(html)) return html;

    const doc = new DOMParser().parseFromString(html, 'text/html');

    const stripStyleWidth = (element: Element) => {
        const style = element.getAttribute('style');
        if (!style) return;
        const cleaned = style
            .replace(WIDTH_STYLE_PATTERN, '')
            .replace(/^\s*;+/, '')
            .replace(/;+\s*$/, '')
            .trim();
        if (cleaned) element.setAttribute('style', cleaned);
        else element.removeAttribute('style');
    };

    doc.querySelectorAll('colgroup, col').forEach((element) => {
        element.removeAttribute('width');
        stripStyleWidth(element);
    });

    doc.querySelectorAll('th, td').forEach((element) => {
        element.removeAttribute('width');
        element.removeAttribute('colwidth');
        stripStyleWidth(element);
    });

    doc.querySelectorAll('table').forEach(stripStyleWidth);

    return doc.body.innerHTML;
}
