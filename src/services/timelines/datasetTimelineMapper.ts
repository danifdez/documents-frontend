import { v4 as uuidv4 } from 'uuid';
import type { DatasetRecord } from '../datasets/useDatasets';
import { formatDatasetText } from '../datasets/datasetFormatter';
import type { TimelineDatasetMapping, TimelineEvent } from '../../types/timeline';

type DatasetRecordData = Pick<DatasetRecord, 'data'>;
type TimelineEventDraft = Omit<TimelineEvent, 'id'>;

export interface AnalyzedTimelineRecord {
  valid: boolean;
  event: TimelineEventDraft;
}

const normalizeDate = (value: unknown): string => {
  if (!value) return '';
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(formatDatasetText(value));
  return match ? match[1] : '';
};

export function analyzeDatasetRecords(
  records: readonly DatasetRecordData[],
  mapping: TimelineDatasetMapping,
): AnalyzedTimelineRecord[] {
  if (!mapping.titleField || !mapping.dateField) return [];

  return records.map((record) => {
    const titleValue = record.data?.[mapping.titleField];
    const title = titleValue ? formatDatasetText(titleValue) : '';
    const date = normalizeDate(record.data?.[mapping.dateField]);
    const description = mapping.descriptionField ? record.data?.[mapping.descriptionField] : undefined;

    return {
      valid: Boolean(title && date),
      event: {
        title,
        description: description ? formatDatasetText(description) : undefined,
        date,
        endDate: mapping.endDateField
          ? normalizeDate(record.data?.[mapping.endDateField]) || undefined
          : undefined,
        color: mapping.color,
      },
    };
  });
}

export function buildTimelineEvents(
  records: readonly DatasetRecordData[],
  mapping: TimelineDatasetMapping,
): TimelineEvent[] {
  return analyzeDatasetRecords(records, mapping)
    .filter(({ valid }) => valid)
    .map(({ event }) => ({ id: uuidv4(), ...event }));
}
