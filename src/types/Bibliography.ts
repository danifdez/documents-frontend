export interface ZoteroCreator {
  creatorType: string; // 'author' | 'editor' | 'translator' | 'seriesEditor' | etc.
  firstName?: string;
  lastName?: string;
  name?: string; // for institutional authors
}

export interface BibliographyEntry {
  id: number;
  entryType: string;
  citeKey: string | null;

  // Core
  title: string | null;
  shortTitle: string | null;
  creators: ZoteroCreator[] | null;
  year: string | null;
  abstract: string | null;

  // Publication
  journal: string | null;
  journalAbbreviation: string | null;
  booktitle: string | null;
  conferenceName: string | null;
  volume: string | null;
  number: string | null;
  pages: string | null;
  publisher: string | null;
  place: string | null;
  edition: string | null;
  series: string | null;
  seriesNumber: string | null;
  numberOfVolumes: string | null;
  numberOfPages: string | null;

  // Identifiers
  doi: string | null;
  isbn: string | null;
  issn: string | null;

  // Web / access
  url: string | null;
  accessDate: string | null;
  websiteTitle: string | null;
  websiteType: string | null;

  // Institution / thesis / report
  institution: string | null;
  university: string | null;
  thesisType: string | null;
  reportNumber: string | null;
  reportType: string | null;

  // Archive / library
  archive: string | null;
  archiveLocation: string | null;
  callNumber: string | null;

  // Other
  language: string | null;
  rights: string | null;
  note: string | null;
  extra: string | null;
  extraFields: Record<string, string> | null;

  project?: { id: number; name: string } | null;
  sourceResource?: { id: number; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

// Helper: get display name for a creator
export function creatorDisplayName(c: ZoteroCreator): string {
  if (c.name) return c.name;
  if (c.lastName && c.firstName) return `${c.lastName}, ${c.firstName}`;
  return c.lastName ?? c.firstName ?? '';
}

// Helper: build APA-style author label from creators
export function buildApaLabel(entry: BibliographyEntry): string {
  const authors = (entry.creators ?? []).filter((c) => c.creatorType === 'author');
  if (authors.length === 0) return entry.title ?? '';

  const surnames = authors.map((c) => c.lastName ?? c.name ?? '');
  let authorPart: string;
  if (surnames.length === 1) authorPart = surnames[0];
  else if (surnames.length === 2) authorPart = `${surnames[0]} & ${surnames[1]}`;
  else authorPart = `${surnames[0]} et al.`;

  return entry.year ? `${authorPart}, ${entry.year}` : authorPart;
}
