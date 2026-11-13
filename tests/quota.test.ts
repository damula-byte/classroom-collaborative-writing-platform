/// <reference types="vitest" />

import { describe, test, expect } from 'vitest';

const FREE_TIER_LIMITS = {
  firestoreDocs: 50000,
  firestoreReads: 50000,
  firestoreWrites: 50000,
  rtdbBytes: 1024 * 1024 * 1024,
  rtdbOps: 100000,
};

function getUsagePercent(current: number, limit: number): number {
  return Math.min((current / limit) * 100, 100);
}

function isNearLimit(current: number, limit: number): boolean {
  return (current / limit) * 100 > 80;
}

describe('Quota Monitoring', () => {
  test('FREE_TIER_LIMITS has expected values', () => {
    expect(FREE_TIER_LIMITS.firestoreDocs).toBe(50000);
    expect(FREE_TIER_LIMITS.firestoreReads).toBe(50000);
    expect(FREE_TIER_LIMITS.firestoreWrites).toBe(50000);
    expect(FREE_TIER_LIMITS.rtdbOps).toBe(100000);
  });

  test('getUsagePercent calculates correctly', () => {
    expect(getUsagePercent(10000, 50000)).toBe(20);
    expect(getUsagePercent(25000, 50000)).toBe(50);
    expect(getUsagePercent(50000, 50000)).toBe(100);
    expect(getUsagePercent(60000, 50000)).toBe(100);
  });

  test('isNearLimit returns true above 80%', () => {
    expect(isNearLimit(40001, 50000)).toBe(true);
    expect(isNearLimit(45000, 50000)).toBe(true);
    expect(isNearLimit(50000, 50000)).toBe(true);
  });

  test('isNearLimit returns false at or below 80%', () => {
    expect(isNearLimit(40000, 50000)).toBe(false);
    expect(isNearLimit(30000, 50000)).toBe(false);
    expect(isNearLimit(10000, 50000)).toBe(false);
    expect(isNearLimit(0, 50000)).toBe(false);
  });
});