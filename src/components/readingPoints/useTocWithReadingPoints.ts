import { computed, type Ref } from 'vue';
import type { ReadingPoint } from '../services/readingPoints/useReadingPoints';
import type { useReadingPointsController } from '../components/readingPoints/useReadingPointsController';

export interface TocHeadingLike {
  id: string;
  text: string;
  level: number;
  position?: number;
}

export type TocEntryKind = 'heading' | 'reading' | 'section';

// Una entrada del índice: o un encabezado del documento o un punto de lectura.
export interface TocEntry {
  key: string;
  kind: TocEntryKind;
  label: string;
  level: number;
  heading?: TocHeadingLike;
  point?: ReadingPoint;
  // Posición conocida en el texto. Sirve para intercalar por orden real.
  position: number | null;
  // Avance de scroll [0,1]; respaldo cuando no hay posición en el texto.
  ratio: number | null;
}

// Ordena encabezados y puntos por su posición real en el contenido. Los puntos
// sin posición conocida (solo ratio o nada) van al final, en orden de creación,
// para no romper la lectura del índice.
function compare(a: TocEntry, b: TocEntry): number {
  if (a.position !== null && b.position !== null) {
    return a.position - b.position;
  }
  if (a.position !== null) return -1;
  if (b.position !== null) return 1;
  if (a.ratio !== null && b.ratio !== null) {
    return a.ratio - b.ratio;
  }
  return 0;
}

function pointLevel(point: ReadingPoint): number {
  return point.kind === 'reading' ? 0 : 1;
}

function pointLabel(point: ReadingPoint): string {
  if (point.kind === 'reading') return 'Marca de lectura';
  return point.label?.trim() || 'Punto de libro';
}

export function useTocWithReadingPoints(
  headings: Ref<TocHeadingLike[]>,
  controller: ReturnType<typeof useReadingPointsController>,
  enabled: Ref<boolean>,
) {
  const entries = computed<TocEntry[]>(() => {
    const headingEntries: TocEntry[] = headings.value.map((heading, index) => ({
      key: `heading:${heading.id}:${index}`,
      kind: 'heading',
      label: heading.text,
      level: heading.level,
      heading,
      position: typeof heading.position === 'number' ? heading.position : null,
      ratio: null,
    }));

    const pointEntries: TocEntry[] = [];
    if (enabled.value) {
      for (const point of controller.points.value) {
        pointEntries.push({
          key: `point:${point.id}`,
          kind: point.kind === 'reading' ? 'reading' : 'section',
          label: pointLabel(point),
          level: pointLevel(point),
          point,
          position: typeof point.position === 'number' && point.exact ? point.position : null,
          ratio: typeof point.ratio === 'number' ? point.ratio : null,
        });
      }
    }

    return [...headingEntries, ...pointEntries].sort(compare);
  });

  const hasContent = computed(() => entries.value.length > 0);

  return { entries, hasContent };
}
