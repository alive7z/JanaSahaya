import { describe, it, expect } from 'vitest';
import { clsx, initials, plural, timeAgo, distanceLabel } from '../utils/formatters';
import { statusTone, priorityTone } from '../components/common/tones';

describe('clsx', () => {
  it('joins truthy args and skips falsy ones', () => {
    expect(clsx('a', 0 && 'b', null, 'c', undefined, false)).toBe('a c');
  });
});

describe('initials', () => {
  it('takes first letters of up to two words, uppercased', () => {
    expect(initials('John Quincy Adams')).toBe('JQ');
    expect(initials('rita')).toBe('R');
    expect(initials('')).toBe('');
  });
});

describe('plural', () => {
  it('pluralizes correctly by count', () => {
    expect(plural(1, 'report')).toBe('1 report');
    expect(plural(3, 'report')).toBe('3 reports');
  });
});

describe('timeAgo', () => {
  it('returns a relative label for recent timestamps', () => {
    expect(timeAgo(new Date(Date.now() - 30_000).toISOString())).toMatch(/just now|m ago/);
    expect(timeAgo(new Date(Date.now() - 3_600_000).toISOString())).toContain('h ago');
  });
  it('returns empty for missing input', () => {
    expect(timeAgo(null)).toBe('');
  });
});

describe('distanceLabel', () => {
  it('formats metres and kilometres', () => {
    expect(distanceLabel(50)).toBe('50 m');
    expect(distanceLabel(1500)).toBe('1.5 km');
    expect(distanceLabel(null)).toBe('');
  });
});

describe('statusTone / priorityTone', () => {
  it('maps known statuses and falls back to a default', () => {
    expect(statusTone('RESOLVED')).toContain('emerald');
    expect(statusTone('NOPE')).toContain('slate');
    expect(priorityTone('CRITICAL')).toContain('rose');
    expect(priorityTone('NOPE')).toContain('slate');
  });
});