/// <reference types="vitest" />

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, test } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const shouldRun = process.env.RUN_RULES_EMULATOR === '1';
const describeRules = shouldRun ? describe : describe.skip;

describeRules('Firestore Peer Review Rules', () => {
  let env: RulesTestEnvironment;
  const projectId = 'demo-writespace';

  beforeAll(async () => {
    env = await initializeTestEnvironment({
      projectId,
      firestore: {
        rules: readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8'),
        host: '127.0.0.1',
        port: 8080,
      },
    });

    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'classes', 'class-1'), {
        id: 'class-1',
        teacherId: 'teacher-1',
        votesPerStudent: 3,
      });
      await setDoc(doc(db, 'classes/class-1/groups/reviewer-1'), {
        classId: 'class-1',
        memberIds: ['student-a', 'student-b'],
        members: [
          { uid: 'student-a', name: 'Student A', joinedAt: 1 },
          { uid: 'student-b', name: 'Student B', joinedAt: 1 },
        ],
        status: 'SUBMITTED',
        locked: true,
      });
      await setDoc(doc(db, 'classes/class-1/groups/target-1'), {
        classId: 'class-1',
        memberIds: ['student-c'],
        members: [{ uid: 'student-c', name: 'Student C', joinedAt: 1 }],
        status: 'SUBMITTED',
        locked: true,
      });
      await setDoc(doc(db, 'classes/class-1/students/student-a'), {
        uid: 'student-a',
        classId: 'class-1',
        groupId: 'reviewer-1',
      });
      await setDoc(doc(db, 'classes/class-1/students/student-b'), {
        uid: 'student-b',
        classId: 'class-1',
        groupId: 'reviewer-1',
      });
      await setDoc(doc(db, 'classes/class-1/students/student-c'), {
        uid: 'student-c',
        classId: 'class-1',
        groupId: 'target-1',
      });
      await setDoc(doc(db, 'classes/class-1/checklistVersions/version-1'), {
        id: 'version-1',
        classId: 'class-1',
        versionNumber: 1,
        criteria: [{ criterionId: 'criterion-1', text: 'Clear introduction', order: 0 }],
        criterionIds: ['criterion-1'],
        createdBy: 'teacher-1',
      });
      await setDoc(doc(db, 'classes/class-1/peerReviewChecklist/active'), {
        classId: 'class-1',
        activeVersionId: 'version-1',
        versionNumber: 1,
        updatedBy: 'teacher-1',
      });
      await setDoc(doc(db, 'classes/class-1/peerReviewDrafts/reviewer-1__target-1'), {
        id: 'reviewer-1__target-1',
        classId: 'class-1',
        reviewerGroupId: 'reviewer-1',
        targetGroupId: 'target-1',
        checklistVersionId: 'version-1',
        overallFeedback: '',
        status: 'draft',
        createdBy: 'student-a',
        createdAt: 1,
        updatedBy: 'student-a',
        updatedAt: 1,
        submittedBy: null,
        submittedAt: null,
        revision: 1,
      });
      await setDoc(doc(db, 'classes/class-1/peerReviews/reviewer-1__target-1'), {
        id: 'reviewer-1__target-1',
        classId: 'class-1',
        reviewerGroupId: 'reviewer-1',
        targetGroupId: 'target-1',
        checklistVersionId: 'version-1',
        overallFeedback: 'Clear writing',
        status: 'submitted',
        createdBy: 'student-a',
        createdAt: 1,
        updatedBy: 'student-a',
        updatedAt: 2,
        submittedBy: 'student-a',
        submittedAt: 2,
        revision: 2,
      });
    });
  });

  afterAll(async () => {
    await env.cleanup();
  });

  test('reviewer member can read private draft', async () => {
    const db = env.authenticatedContext('student-b').firestore();
    await assertSucceeds(
      getDoc(doc(db, 'classes/class-1/peerReviewDrafts/reviewer-1__target-1'))
    );
  });

  test('target member cannot read private draft', async () => {
    const db = env.authenticatedContext('student-c').firestore();
    await assertFails(
      getDoc(doc(db, 'classes/class-1/peerReviewDrafts/reviewer-1__target-1'))
    );
  });

  test('outsider cannot read private draft', async () => {
    const db = env.authenticatedContext('student-x').firestore();
    await assertFails(
      getDoc(doc(db, 'classes/class-1/peerReviewDrafts/reviewer-1__target-1'))
    );
  });

  test('target member can read published result', async () => {
    const db = env.authenticatedContext('student-c').firestore();
    await assertSucceeds(
      getDoc(doc(db, 'classes/class-1/peerReviews/reviewer-1__target-1'))
    );
  });

  test('valid Boolean criterion response is allowed for reviewer', async () => {
    const db = env.authenticatedContext('student-b').firestore();
    await assertSucceeds(setDoc(
      doc(db, 'classes/class-1/peerReviewDrafts/reviewer-1__target-1/responses/criterion-1'),
      {
        criterionId: 'criterion-1',
        checked: true,
        updatedBy: 'student-b',
      }
    ));
  });

  test('invalid criterion ID is denied', async () => {
    const db = env.authenticatedContext('student-b').firestore();
    await assertFails(setDoc(
      doc(db, 'classes/class-1/peerReviewDrafts/reviewer-1__target-1/responses/invalid'),
      {
        criterionId: 'invalid',
        checked: true,
        updatedBy: 'student-b',
      }
    ));
  });

  test('non-Boolean criterion response is denied', async () => {
    const db = env.authenticatedContext('student-b').firestore();
    await assertFails(setDoc(
      doc(db, 'classes/class-1/peerReviewDrafts/reviewer-1__target-1/responses/criterion-1'),
      {
        criterionId: 'criterion-1',
        checked: 'yes',
        updatedBy: 'student-b',
      }
    ));
  });

  test('removed reviewer member cannot write draft', async () => {
    const db = env.authenticatedContext('student-x').firestore();
    await assertFails(setDoc(
      doc(db, 'classes/class-1/peerReviewDrafts/reviewer-1__target-1/responses/criterion-1'),
      {
        criterionId: 'criterion-1',
        checked: true,
        updatedBy: 'student-x',
      }
    ));
  });
});
