/// <reference types="vitest" />

import { describe, test, expect, vi } from 'vitest';
import { generateClassCode, countWords, cn, debounce, formatTimestamp } from '@/utils';

describe('Utility Functions', () => {
  test('generateClassCode produces 6-char uppercase codes', () => {
    const code = generateClassCode();
    expect(code).toHaveLength(6);
    expect(code).toMatch(/^[A-Z2-9]+$/);
  });

  test('generateClassCode excludes ambiguous characters', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateClassCode();
      expect(code).not.toMatch(/[0O1ILZS5B8]/);
    }
  });

  test('countWords counts correctly', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('hello world')).toBe(2);
    expect(countWords('  multiple   spaces  ')).toBe(2);
    expect(countWords('one')).toBe(1);
  });

  test('cn merges class names', () => {
    expect(cn('a', 'b')).toBe('a b');
    expect(cn('a', undefined, 'b', null, 'c')).toBe('a b c');
    expect(cn()).toBe('');
    expect(cn('single')).toBe('single');
  });

  test('debounce delays function call', async () => {
    let count = 0;
    const fn = debounce(() => count++, 50);
    fn();
    fn();
    expect(count).toBe(0);
    await new Promise(r => setTimeout(r, 100));
    expect(count).toBe(1);
  });

  test('formatTimestamp returns valid date string', () => {
    const ts = Date.now();
    const result = formatTimestamp(ts);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Class Code Generation', () => {
  test('codes are unique across 1000 generations', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      codes.add(generateClassCode());
    }
    expect(codes.size).toBeGreaterThan(900);
  });

  test('codes are uppercase only', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateClassCode();
      expect(code).toBe(code.toUpperCase());
    }
  });
});