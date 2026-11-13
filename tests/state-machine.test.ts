/// <reference types="vitest" />

import { describe, test, expect } from 'vitest';
import {
  canTransition,
  STATUS_TRANSITIONS,
} from '@/services';

describe('Document Lifecycle State Machine', () => {
  test('canTransition allows valid transitions', () => {
    expect(canTransition('WRITING', 'SUBMITTED')).toBe(true);
    expect(canTransition('WRITING', 'LOCKED')).toBe(true);
    expect(canTransition('SUBMITTED', 'REVIEWING')).toBe(true);
    expect(canTransition('SUBMITTED', 'LOCKED')).toBe(true);
    expect(canTransition('SUBMITTED', 'WRITING')).toBe(true);
    expect(canTransition('LOCKED', 'REVIEWING')).toBe(true);
    expect(canTransition('LOCKED', 'WRITING')).toBe(true);
    expect(canTransition('REVIEWING', 'REVIEWED')).toBe(true);
    expect(canTransition('REVIEWING', 'LOCKED')).toBe(true);
    expect(canTransition('REVIEWING', 'WRITING')).toBe(true);
    expect(canTransition('REVIEWED', 'LOCKED')).toBe(true);
    expect(canTransition('REVIEWED', 'WRITING')).toBe(true);
  });

  test('canTransition rejects invalid transitions', () => {
    expect(canTransition('WRITING', 'REVIEWING')).toBe(false);
    expect(canTransition('WRITING', 'REVIEWED')).toBe(false);
    expect(canTransition('SUBMITTED', 'REVIEWED')).toBe(false);
    expect(canTransition('REVIEWED', 'SUBMITTED')).toBe(false);
    expect(canTransition('REVIEWED', 'REVIEWING')).toBe(false);
    expect(canTransition('LOCKED', 'SUBMITTED')).toBe(false);
  });

  test('STATUS_TRANSITIONS has all states', () => {
    const states = Object.keys(STATUS_TRANSITIONS);
    expect(states).toContain('WRITING');
    expect(states).toContain('SUBMITTED');
    expect(states).toContain('LOCKED');
    expect(states).toContain('REVIEWING');
    expect(states).toContain('REVIEWED');
  });

  test('each state has at least one valid transition', () => {
    for (const [state, transitions] of Object.entries(STATUS_TRANSITIONS)) {
      expect(transitions.length).toBeGreaterThan(0);
    }
  });
});
