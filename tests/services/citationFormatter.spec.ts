import { describe, expect, it } from 'vitest';
import { formatFullCitation, formatInlineCitation } from '@/services/citations/citationFormatter';
import type { BibliographyEntry, ZoteroCreator } from '@/types/Bibliography';

const author = (lastName: string, firstName?: string): ZoteroCreator => ({
  creatorType: 'author', firstName, lastName,
});
const authors = [author('Lovelace', 'Ada-Marie'), author('Hopper', 'Grace')];
const entry = (fields: Partial<BibliographyEntry>) => ({
  id: 1,
  entryType: 'journalArticle',
  creators: null,
  year: null,
  ...fields,
}) as BibliographyEntry;

describe('citation formatting', () => {
  const article = entry({
    title: 'Computing Notes', creators: [...authors, { creatorType: 'editor', lastName: 'Editor' }],
    year: '1843', journal: 'Scientific Memoirs', volume: '3', number: '1', pages: '10–20',
    doi: '10.1234/notes', url: 'https://example.com/article',
  });

  it.each([
    ['apa', '(Lovelace & Hopper, 1843)', 'Lovelace, A. M. & Hopper, G. (1843). Computing Notes. Scientific Memoirs, 3(1), 10–20. https://doi.org/10.1234/notes'],
    ['chicago', 'Lovelace & Hopper (1843)', 'Lovelace, Ada-Marie, Grace Hopper. 1843. "Computing Notes." Scientific Memoirs 3, no. 1 (1843): 10–20. https://doi.org/10.1234/notes.'],
    ['ieee', '[4]', '[4] A. M. Lovelace, G. Hopper, "Computing Notes," Scientific Memoirs, vol. 3, no. 1, pp. 10–20, 1843. doi: 10.1234/notes.'],
    ['mla', '(Lovelace)', 'Lovelace, Ada-Marie, and Grace Hopper. "Computing Notes." Scientific Memoirs, vol. 3, no. 1, 1843, pp. 10–20. https://doi.org/10.1234/notes.'],
    ['vancouver', '(4)', '4. Lovelace AM, Hopper G. Computing Notes. Scientific Memoirs. 1843;3(1):10–20. doi:10.1234/notes'],
  ] as const)('formats an article in %s style', (style, inline, full) => {
    expect(formatInlineCitation(article, style, 4)).toBe(inline);
    expect(formatFullCitation(article, style, 4)).toBe(full);
  });

  it.each([
    ['apa', 'Anon. (n.d.). Reference Book. University Press. https://example.com/book'],
    ['chicago', 'Anon. "Reference Book." London: University Press.'],
    ['ieee', ', "Reference Book," University Press,'],
    ['mla', 'Anon. "Reference Book." University Press,'],
    ['vancouver', '. Reference Book. London: University Press;'],
  ] as const)('formats an anonymous, undated book in %s style', (style, full) => {
    const book = entry({
      entryType: 'book', title: 'Reference Book', publisher: 'University Press',
      place: 'London', url: 'https://example.com/book',
    });
    expect(formatFullCitation(book, style)).toBe(full);
  });

  it('uses an anonymous, undated locator or an unknown sequence number for missing metadata', () => {
    const untitled = entry({});
    expect(formatInlineCitation(untitled, 'apa')).toBe('(Anon, n.d.)');
    expect(formatInlineCitation(untitled, 'mla')).toBe('(Anon)');
    expect(formatInlineCitation(untitled, 'ieee')).toBe('[?]');
    expect(formatInlineCitation(untitled, 'vancouver')).toBe('(?)');
  });

  it('handles institutional and named authors in single-author works', () => {
    const report = entry({ creators: [{ creatorType: 'author', name: 'Open Archive' }], year: '2025' });
    const book = entry({ creators: [author('Hopper', 'Grace')], year: '1952', publisher: 'Proceedings' });
    expect(formatInlineCitation(report, 'apa')).toBe('(Open Archive, 2025)');
    expect(formatFullCitation(report, 'apa')).toBe('Open Archive (2025).');
    expect(formatFullCitation(book, 'chicago')).toBe('Hopper, Grace. 1952. Proceedings.');
    expect(formatFullCitation(book, 'mla')).toBe('Hopper, Grace. Proceedings, 1952.');
    expect(formatFullCitation(book, 'ieee', 2)).toBe('[2] G. Hopper, Proceedings, 1952.');
    expect(formatFullCitation(book, 'vancouver', 2)).toBe('2. Hopper G. Proceedings; 1952.');
  });

  it('uses the author limits for short citations and long bibliographies', () => {
    const contributors = Array.from({ length: 21 }, (_, index) => author(`Author ${index + 1}`, 'Jane'));
    const collaborative = entry({ creators: contributors });
    expect(formatInlineCitation(collaborative, 'apa')).toBe('(Author 1 et al., n.d.)');
    expect(formatFullCitation(collaborative, 'chicago')).toBe('Author 1, Jane et al.');
    expect(formatFullCitation(collaborative, 'mla')).toBe('Author 1, Jane, et al.');
    expect(formatFullCitation(collaborative, 'apa')).toContain('Author 19, J., ... Author 21, J.');
    expect(formatFullCitation(collaborative, 'apa')).not.toContain('Author 20');
    expect(formatFullCitation(collaborative, 'vancouver')).toBe('Author 1 J, Author 2 J, Author 3 J, Author 4 J, Author 5 J, Author 6 J, et al.');
    expect(formatFullCitation(entry({ creators: contributors.slice(0, 3) }), 'apa'))
      .toBe('Author 1, J., Author 2, J., & Author 3, J. (n.d.).');
    expect(formatFullCitation(entry({ creators: contributors.slice(0, 2) }), 'mla'))
      .toBe('Author 1, Jane, and Jane Author 2.');
  });
});
