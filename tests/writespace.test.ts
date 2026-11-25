import { describe, test, expect } from 'vitest';
import {
  normalizeClassCode,
  normalizeName,
  sanitizeRichHtml,
  clampVotesPerStudent,
  clampMaxMembers,
  calculateWinners,
} from '@/utils';

describe('WriteSpace Utilities & Business Logic', () => {
  test('normalizeClassCode trims, uppercases, and limits to 6 alphanumeric chars', () => {
    expect(normalizeClassCode('  ab12cd  ')).toBe('AB12CD');
    expect(normalizeClassCode('xy-99!zz11')).toBe('XY99ZZ');
  });

  test('normalizeName collapses whitespace and lowercases', () => {
    expect(normalizeName('  Nguyen   Van   A  ')).toBe('nguyen van a');
  });

  test('sanitizeRichHtml strips scripts, event handlers, and javascript: URLs', () => {
    const dirty = '<p onclick="alert(1)">Hello</p><script>evil()</script><a href="javascript:alert(2)">x</a>';
    const clean = sanitizeRichHtml(dirty);
    expect(clean).not.toContain('<script>');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('javascript:');
    expect(clean).toContain('<p>Hello</p>');
  });

  test('clampVotesPerStudent enforces 1..20 range', () => {
    expect(clampVotesPerStudent(0)).toBe(1);
    expect(clampVotesPerStudent(-5)).toBe(1);
    expect(clampVotesPerStudent(25)).toBe(20);
    expect(clampVotesPerStudent(5.8)).toBe(5);
  });

  test('clampMaxMembers enforces 1..20 range with default 4', () => {
    expect(clampMaxMembers(NaN)).toBe(4);
    expect(clampMaxMembers(0)).toBe(1);
    expect(clampMaxMembers(30)).toBe(20);
    expect(clampMaxMembers(8)).toBe(8);
  });

  test('calculateWinners handles zero votes, single winner, tied winners, and excludes drafts', () => {
    const groups = [
      { id: 'g1', status: 'SUBMITTED' },
      { id: 'g2', status: 'SUBMITTED' },
      { id: 'g3', status: 'WRITING' },
    ];

    // Zero votes -> no winners
    const zeroResult = calculateWinners(groups, {});
    expect(zeroResult.maxVotes).toBe(0);
    expect(zeroResult.winnerIds.size).toBe(0);

    // Tied winners among submitted, ignoring draft even if it had votes
    const tiedResult = calculateWinners(groups, { g1: 3, g2: 3, g3: 10 });
    expect(tiedResult.maxVotes).toBe(3);
    expect(tiedResult.winnerIds.has('g1')).toBe(true);
    expect(tiedResult.winnerIds.has('g2')).toBe(true);
    expect(tiedResult.winnerIds.has('g3')).toBe(false);
  });
});
