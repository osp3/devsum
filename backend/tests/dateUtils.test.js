import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getYesterdayRange } from '../utils/DateUtils.js';

const cases = [
  ['America/Los_Angeles', '2026-09-30T02:00:00Z', '2026-09-28', '2026-09-28T07:00:00.000Z', '2026-09-29T06:59:59.999Z'],
  ['Asia/Tokyo', '2026-09-30T02:00:00Z', '2026-09-29', '2026-09-28T15:00:00.000Z', '2026-09-29T14:59:59.999Z'],
  ['America/New_York', '2026-03-09T12:00:00Z', '2026-03-08', '2026-03-08T05:00:00.000Z', '2026-03-09T03:59:59.999Z'],
  ['America/New_York', '2026-11-02T12:00:00Z', '2026-11-01', '2026-11-01T04:00:00.000Z', '2026-11-02T04:59:59.999Z'],
  ['Asia/Kolkata', '2026-03-01T00:00:00Z', '2026-02-28', '2026-02-27T18:30:00.000Z', '2026-02-28T18:29:59.999Z'],
  ['UTC', '2026-01-01T00:30:00Z', '2025-12-31', '2025-12-31T00:00:00.000Z', '2025-12-31T23:59:59.999Z'],
  ['Not/AZone', '2026-09-30T02:00:00Z', '2026-09-29', '2026-09-29T00:00:00.000Z', '2026-09-29T23:59:59.999Z'],
  [undefined, '2026-09-30T02:00:00Z', '2026-09-29', '2026-09-29T00:00:00.000Z', '2026-09-29T23:59:59.999Z']
];

for (const [timeZone, now, date, start, end] of cases) {
  test(`yesterday in ${timeZone} at ${now}`, () => {
    const range = getYesterdayRange(timeZone, new Date(now));
    assert.equal(range.date, date);
    assert.equal(range.start.toISOString(), start);
    assert.equal(range.end.toISOString(), end);
  });
}
