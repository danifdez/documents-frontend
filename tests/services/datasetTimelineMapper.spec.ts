import { describe, expect, it } from 'vitest';
import {
  analyzeDatasetRecords,
  buildTimelineEvents,
} from '../../src/services/timelines/datasetTimelineMapper';
import type { TimelineDatasetMapping } from '../../src/types/timeline';

const mapping: TimelineDatasetMapping = {
  titleField: 'name',
  dateField: 'startedAt',
  endDateField: 'endedAt',
  descriptionField: 'details',
  color: '#3b82f6',
};

describe('datasetTimelineMapper', () => {
  it('analyzes records with the same values used by preview and import', () => {
    const analyzed = analyzeDatasetRecords([
      {
        data: {
          name: 42,
          startedAt: '2026-09-11T10:30:00Z',
          endedAt: '2026-09-12T12:00:00Z',
          details: 'Details',
        },
      },
      { data: { name: 'Missing date', startedAt: 'September 11' } },
      { data: { name: '', startedAt: '2026-09-13' } },
    ], mapping);

    expect(analyzed).toEqual([
      {
        valid: true,
        event: {
          title: '42',
          description: 'Details',
          date: '2026-09-11',
          endDate: '2026-09-12',
          color: '#3b82f6',
        },
      },
      {
        valid: false,
        event: {
          title: 'Missing date',
          description: undefined,
          date: '',
          endDate: undefined,
          color: '#3b82f6',
        },
      },
      {
        valid: false,
        event: {
          title: '',
          description: undefined,
          date: '2026-09-13',
          endDate: undefined,
          color: '#3b82f6',
        },
      },
    ]);
  });

  it('returns no analyzed records until required fields are mapped', () => {
    expect(analyzeDatasetRecords([{ data: { name: 'Event' } }], {
      ...mapping,
      dateField: '',
    })).toEqual([]);
  });

  it('builds events from valid records in source order with fresh ids', () => {
    const events = buildTimelineEvents([
      { data: { name: 'First', startedAt: '2026-01-01' } },
      { data: { name: 'Skipped', startedAt: 'invalid' } },
      { data: { name: 'Second', startedAt: '2026-02-02' } },
    ], mapping);

    expect(events.map(({ title, date }) => ({ title, date }))).toEqual([
      { title: 'First', date: '2026-01-01' },
      { title: 'Second', date: '2026-02-02' },
    ]);
    expect(events[0].id).toEqual(expect.any(String));
    expect(events[1].id).toEqual(expect.any(String));
    expect(events[0].id).not.toBe(events[1].id);
  });
});
