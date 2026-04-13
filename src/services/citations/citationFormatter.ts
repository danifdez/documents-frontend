import type { BibliographyEntry, ZoteroCreator } from '../../types/Bibliography';

export type CitationStyle = 'apa' | 'chicago' | 'ieee' | 'mla' | 'vancouver';

// ── Inline citation (short label for in-text use) ────────────────────

export function formatInlineCitation(
    entry: BibliographyEntry,
    style: CitationStyle,
    index?: number,
): string {
    const authors = (entry.creators ?? []).filter(c => c.creatorType === 'author');
    const surname = firstSurname(authors);
    const year = entry.year ?? 'n.d.';

    switch (style) {
        case 'apa':
            return `(${authorShort(authors)}, ${year})`;
        case 'chicago':
            return `${authorShort(authors)} (${year})`;
        case 'ieee':
            return `[${index ?? '?'}]`;
        case 'mla':
            return `(${surname})`;
        case 'vancouver':
            return `(${index ?? '?'})`;
        default:
            return `(${authorShort(authors)}, ${year})`;
    }
}

// ── Full citation (reference list entry) ─────────────────────────────

export function formatFullCitation(
    entry: BibliographyEntry,
    style: CitationStyle,
    index?: number,
): string {
    switch (style) {
        case 'apa':
            return formatAPA(entry);
        case 'chicago':
            return formatChicago(entry);
        case 'ieee':
            return formatIEEE(entry, index);
        case 'mla':
            return formatMLA(entry);
        case 'vancouver':
            return formatVancouver(entry, index);
        default:
            return formatAPA(entry);
    }
}

// ── APA 7th ──────────────────────────────────────────────────────────

function formatAPA(e: BibliographyEntry): string {
    const parts: string[] = [];
    const authors = (e.creators ?? []).filter(c => c.creatorType === 'author');
    parts.push(authorListAPA(authors));
    if (e.year) parts.push(`(${e.year}).`);
    else parts.push('(n.d.).');
    if (e.title) parts.push(italicise(e.title) + '.');
    if (e.journal) {
        let journalPart = italicise(e.journal);
        if (e.volume) journalPart += `, ${e.volume}`;
        if (e.number) journalPart += `(${e.number})`;
        if (e.pages) journalPart += `, ${e.pages}`;
        parts.push(journalPart + '.');
    } else if (e.publisher) {
        parts.push(e.publisher + '.');
    }
    if (e.doi) parts.push(`https://doi.org/${e.doi}`);
    else if (e.url) parts.push(e.url);
    return parts.join(' ');
}

function authorListAPA(authors: ZoteroCreator[]): string {
    if (authors.length === 0) return 'Anon.';
    const names = authors.map(a => {
        const last = a.lastName ?? a.name ?? '';
        const initials = a.firstName ? a.firstName.split(/[\s-]+/).map(n => n[0] + '.').join(' ') : '';
        return initials ? `${last}, ${initials}` : last;
    });
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    if (names.length <= 20) return names.slice(0, -1).join(', ') + ', & ' + names[names.length - 1];
    return names.slice(0, 19).join(', ') + ', ... ' + names[names.length - 1];
}

// ── Chicago (Author-Date) ────────────────────────────────────────────

function formatChicago(e: BibliographyEntry): string {
    const parts: string[] = [];
    const authors = (e.creators ?? []).filter(c => c.creatorType === 'author');
    parts.push(authorListChicago(authors));
    if (e.year) parts.push(`${e.year}.`);
    if (e.title) parts.push(`"${e.title}."`);
    if (e.journal) {
        let j = italicise(e.journal);
        if (e.volume) j += ` ${e.volume}`;
        if (e.number) j += `, no. ${e.number}`;
        if (e.year) j += ` (${e.year})`;
        if (e.pages) j += `: ${e.pages}`;
        parts.push(j + '.');
    } else if (e.publisher) {
        let p = '';
        if (e.place) p += `${e.place}: `;
        p += e.publisher;
        parts.push(p + '.');
    }
    if (e.doi) parts.push(`https://doi.org/${e.doi}.`);
    return parts.join(' ');
}

function authorListChicago(authors: ZoteroCreator[]): string {
    if (authors.length === 0) return 'Anon.';
    const fmt = (a: ZoteroCreator, invert: boolean) => {
        const last = a.lastName ?? a.name ?? '';
        if (!a.firstName) return last;
        return invert ? `${last}, ${a.firstName}` : `${a.firstName} ${last}`;
    };
    if (authors.length === 1) return fmt(authors[0], true) + '.';
    if (authors.length <= 3) {
        return fmt(authors[0], true) + ', ' +
            authors.slice(1).map(a => fmt(a, false)).join(', ') + '.';
    }
    return fmt(authors[0], true) + ' et al.';
}

// ── IEEE ─────────────────────────────────────────────────────────────

function formatIEEE(e: BibliographyEntry, index?: number): string {
    const parts: string[] = [];
    const prefix = index != null ? `[${index}]` : '';
    const authors = (e.creators ?? []).filter(c => c.creatorType === 'author');
    const authorStr = authors.map(a => {
        const initials = a.firstName ? a.firstName.split(/[\s-]+/).map(n => n[0] + '.').join(' ') : '';
        const last = a.lastName ?? a.name ?? '';
        return initials ? `${initials} ${last}` : last;
    }).join(', ');
    parts.push(`${prefix} ${authorStr},`);
    if (e.title) parts.push(`"${e.title},"`);
    if (e.journal) {
        let j = italicise(e.journal);
        if (e.volume) j += `, vol. ${e.volume}`;
        if (e.number) j += `, no. ${e.number}`;
        if (e.pages) j += `, pp. ${e.pages}`;
        if (e.year) j += `, ${e.year}`;
        parts.push(j + '.');
    } else {
        if (e.publisher) parts.push(e.publisher + ',');
        if (e.year) parts.push(`${e.year}.`);
    }
    if (e.doi) parts.push(`doi: ${e.doi}.`);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ── MLA 9th ──────────────────────────────────────────────────────────

function formatMLA(e: BibliographyEntry): string {
    const parts: string[] = [];
    const authors = (e.creators ?? []).filter(c => c.creatorType === 'author');
    parts.push(authorListMLA(authors));
    if (e.title) parts.push(`"${e.title}."`);
    if (e.journal) {
        let j = italicise(e.journal);
        if (e.volume) j += `, vol. ${e.volume}`;
        if (e.number) j += `, no. ${e.number}`;
        if (e.year) j += `, ${e.year}`;
        if (e.pages) j += `, pp. ${e.pages}`;
        parts.push(j + '.');
    } else if (e.publisher) {
        parts.push(e.publisher + ',');
        if (e.year) parts.push(`${e.year}.`);
    }
    if (e.doi) parts.push(`https://doi.org/${e.doi}.`);
    return parts.join(' ');
}

function authorListMLA(authors: ZoteroCreator[]): string {
    if (authors.length === 0) return 'Anon.';
    const fmt = (a: ZoteroCreator) => {
        const last = a.lastName ?? a.name ?? '';
        if (!a.firstName) return last;
        return `${last}, ${a.firstName}`;
    };
    if (authors.length === 1) return fmt(authors[0]) + '.';
    if (authors.length === 2) return `${fmt(authors[0])}, and ${authors[1].firstName ? authors[1].firstName + ' ' : ''}${authors[1].lastName ?? ''}.`;
    return fmt(authors[0]) + ', et al.';
}

// ── Vancouver ────────────────────────────────────────────────────────

function formatVancouver(e: BibliographyEntry, index?: number): string {
    const parts: string[] = [];
    const prefix = index != null ? `${index}.` : '';
    const authors = (e.creators ?? []).filter(c => c.creatorType === 'author');
    const authorStr = authors.slice(0, 6).map(a => {
        const last = a.lastName ?? a.name ?? '';
        const initials = a.firstName ? a.firstName.split(/[\s-]+/).map(n => n[0]).join('') : '';
        return `${last} ${initials}`;
    }).join(', ') + (authors.length > 6 ? ', et al' : '');
    parts.push(`${prefix} ${authorStr}.`);
    if (e.title) parts.push(`${e.title}.`);
    if (e.journal) {
        let j = e.journal;
        if (e.year) j += `. ${e.year}`;
        if (e.volume) j += `;${e.volume}`;
        if (e.number) j += `(${e.number})`;
        if (e.pages) j += `:${e.pages}`;
        parts.push(j + '.');
    } else {
        if (e.publisher) parts.push(`${e.place ? e.place + ': ' : ''}${e.publisher};`);
        if (e.year) parts.push(`${e.year}.`);
    }
    if (e.doi) parts.push(`doi:${e.doi}`);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ── Helpers ──────────────────────────────────────────────────────────

function firstSurname(authors: ZoteroCreator[]): string {
    if (authors.length === 0) return 'Anon';
    return authors[0].lastName ?? authors[0].name ?? 'Anon';
}

function authorShort(authors: ZoteroCreator[]): string {
    if (authors.length === 0) return 'Anon';
    const s = firstSurname(authors);
    if (authors.length === 1) return s;
    if (authors.length === 2) return `${s} & ${authors[1].lastName ?? authors[1].name ?? ''}`;
    return `${s} et al.`;
}

function italicise(text: string): string {
    // For plain-text output, we just return the text as-is.
    // In HTML rendering contexts, the caller can wrap in <em>.
    return text;
}
