import { computed, ref } from 'vue';
import { useReadingPoints, type ReadingPoint, type ReadingPointAnchor } from '../../services/readingPoints/useReadingPoints';
import { useReadingPointCreate } from '../../services/readingPoints/useReadingPointCreate';
import { useReadingPointUpdate } from '../../services/readingPoints/useReadingPointUpdate';
import { useReadingPointDelete } from '../../services/readingPoints/useReadingPointDelete';

export type ReadingPointEntityType = 'doc' | 'resource';

// Estado compartido de los puntos de una página (documento o recurso): lo usan
// el overlay que los dibuja y el panel que los gestiona.
export function useReadingPointsController(
  entityId: () => string,
  entityType: ReadingPointEntityType,
) {
  const points = ref<ReadingPoint[]>([]);
  const isLoading = ref(false);
  const { loadReadingPoints } = useReadingPoints();
  const { createReadingPoint } = useReadingPointCreate();
  const { updateReadingPoint } = useReadingPointUpdate();
  const { deleteReadingPoint } = useReadingPointDelete();

  const readingPoint = computed(() => points.value.find((p) => p.kind === 'reading') || null);
  const sections = computed(() => points.value.filter((p) => p.kind === 'section'));

  async function load(): Promise<void> {
    const id = entityId();
    if (!id || id === 'new') {
      points.value = [];
      return;
    }
    isLoading.value = true;
    try {
      points.value = await loadReadingPoints(id, entityType);
    } catch (error) {
      console.error('Error loading reading points:', error);
    } finally {
      isLoading.value = false;
    }
  }

  async function saveReading(anchor: ReadingPointAnchor): Promise<ReadingPoint | null> {
    const id = entityId();
    if (!id || id === 'new') return null;
    const created = await createReadingPoint(id, 'reading', '', entityType, anchor);
    await load();
    return created;
  }

  async function addSection(label: string, anchor: ReadingPointAnchor): Promise<ReadingPoint | null> {
    const id = entityId();
    if (!id || id === 'new') return null;
    const created = await createReadingPoint(id, 'section', label, entityType, anchor);
    await load();
    return created;
  }

  async function rename(id: number | string, label: string): Promise<void> {
    await updateReadingPoint(id, { label });
    await load();
  }

  async function remove(id: number | string): Promise<void> {
    await deleteReadingPoint(id);
    await load();
  }

  return {
    points,
    readingPoint,
    sections,
    isLoading,
    load,
    saveReading,
    addSection,
    rename,
    remove,
  };
}
