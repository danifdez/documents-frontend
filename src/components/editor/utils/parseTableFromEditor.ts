import type { Editor } from '@tiptap/vue-3';

export interface ParsedTable {
    headers: string[];
    rows: string[][];
    tablePos: { from: number; to: number };
}

export function parseTableFromEditor(editor: Editor): ParsedTable | null {
    const { state } = editor;
    const { $from } = state.selection;

    // Walk up from cursor to find the table node
    let tableNode = null;
    let tableStart = 0;

    for (let depth = $from.depth; depth > 0; depth--) {
        const node = $from.node(depth);
        if (node.type.name === 'table') {
            tableNode = node;
            tableStart = $from.before(depth);
            break;
        }
    }

    if (!tableNode) return null;

    const tableEnd = tableStart + tableNode.nodeSize;
    const headers: string[] = [];
    const rows: string[][] = [];
    let maxCols = 0;

    tableNode.forEach((row, _offset, rowIndex) => {
        if (row.type.name !== 'tableRow') return;

        const cells: string[] = [];
        row.forEach((cell) => {
            cells.push(cell.textContent.trim());
        });

        if (cells.length > maxCols) maxCols = cells.length;

        if (rowIndex === 0) {
            // First row is headers — use th content or first row content
            cells.forEach((text, i) => {
                headers.push(text || `Column ${i + 1}`);
            });
        } else {
            rows.push(cells);
        }
    });

    // Pad short rows with empty strings
    for (const row of rows) {
        while (row.length < maxCols) {
            row.push('');
        }
    }

    // Ensure headers match maxCols
    while (headers.length < maxCols) {
        headers.push(`Column ${headers.length + 1}`);
    }

    if (headers.length === 0) return null;

    return {
        headers,
        rows,
        tablePos: { from: tableStart, to: tableEnd },
    };
}
