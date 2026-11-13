/// <reference types="vitest" />

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Security Rules Audit', () => {
  const rulesContent = readFileSync(
    resolve(__dirname, '../firestore.rules'),
    'utf-8'
  );

  test('firestore.rules exists and is non-empty', () => {
    expect(rulesContent.length).toBeGreaterThan(0);
  });

  test('uses rules_version 2', () => {
    expect(rulesContent).toContain("rules_version = '2'");
  });

  test('defines cloud.firestore service', () => {
    expect(rulesContent).toContain('service cloud.firestore');
  });

  test('enforces authentication', () => {
    expect(rulesContent).toContain('isAuthenticated()');
  });

  test('enforces teacher authorization', () => {
    expect(rulesContent).toContain('isClassTeacher');
  });

  test('enforces student group isolation', () => {
    expect(rulesContent).toContain('isStudentInGroup');
  });

  test('enforces locked document write-denial', () => {
    expect(rulesContent).toContain('resource.data.locked == false');
    expect(rulesContent).toContain('request.resource.data.locked == false');
  });

  test('restricts annotation writes to teachers only', () => {
    // Annotations write rule should only allow teachers
    const annotationSection = rulesContent.match(
      /match \/annotations\/\{annotationId\} \{[\s\S]*?(?=match \/|\s*$)/
    );
    expect(annotationSection).not.toBeNull();
    if (annotationSection) {
      expect(annotationSection[0]).toContain('allow write: if isClassTeacher');
    }
  });

  test('allows student to create own student record', () => {
    expect(rulesContent).toContain(
      'allow create: if isAuthenticated() && request.auth.uid == studentUid'
    );
  });

  test('RTDB rules enforce authentication', () => {
    const rtdbContent = readFileSync(
      resolve(__dirname, '../firebase.json'),
      'utf-8'
    );
    expect(rtdbContent).toContain('"auth != null"');
  });
});