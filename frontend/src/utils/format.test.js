import { describe, it, expect } from 'vitest';
import { clsx, initials, plural, timeAgo, distanceLabel, greetingForHour, formatLabel } from '../utils/formatters';
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

describe('greetingForHour', () => {
  it('uses morning from 5:00 AM through 11:59 AM', () => {
    expect(greetingForHour(5)).toBe('Good morning');
    expect(greetingForHour(11)).toBe('Good morning');
  });

  it('uses afternoon from noon through 3:59 PM', () => {
    expect(greetingForHour(12)).toBe('Good afternoon');
    expect(greetingForHour(15)).toBe('Good afternoon');
  });

  it('uses evening from 4:00 PM through 8:59 PM', () => {
    expect(greetingForHour(16)).toBe('Good evening');
    expect(greetingForHour(20)).toBe('Good evening');
  });

  it('uses night from 9:00 PM through 4:59 AM', () => {
    expect(greetingForHour(21)).toBe('Good night');
    expect(greetingForHour(4)).toBe('Good night');
  });
});

describe('distanceLabel', () => {
  it('formats metres and kilometres', () => {
    expect(distanceLabel(50)).toBe('50 m');
    expect(distanceLabel(1500)).toBe('1.5 km');
    expect(distanceLabel(null)).toBe('');
  });
});

describe('formatLabel', () => {
  it('turns enum and snake_case values into readable labels', () => {
    expect(formatLabel('UNDER_REVIEW')).toBe('Under Review');
    expect(formatLabel('IN_PROGRESS')).toBe('In Progress');
    expect(formatLabel('location_source')).toBe('Location Source');
    expect(formatLabel('ISSUE_STATUS_OVERRIDE')).toBe('Issue Status Override');
  });

  it('preserves known acronyms', () => {
    expect(formatLabel('SLA_RULE_UPDATE')).toBe('SLA Rule Update');
    expect(formatLabel('sla_rule')).toBe('SLA Rule');
    expect(formatLabel('USER_ID')).toBe('User ID');
  });

  it('returns an empty string for missing values', () => {
    expect(formatLabel(null)).toBe('');
    expect(formatLabel(undefined)).toBe('');
    expect(formatLabel('')).toBe('');
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
