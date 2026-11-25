/// <reference types="vitest" />

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

describe('Phase 1 Peer Review Foundation', () => {
  const rulesContent = readFileSync(
    resolve(__dirname, '../firestore.rules'),
    'utf-8'
  );
  const typesContent = readFileSync(
    resolve(__dirname, '../src/types/index.ts'),
    'utf-8'
  );
  const servicesContent = readFileSync(
    resolve(__dirname, '../src/services/index.ts'),
    'utf-8'
  );

  test('defines deterministic group review pair identity', () => {
    expect(servicesContent).toContain('getPeerReviewPairId');
    expect(servicesContent).toContain('reviewerGroupId}__${targetGroupId');
  });

  test('defines immutable checklist version types', () => {
    expect(typesContent).toContain('ChecklistCriterion');
    expect(typesContent).toContain('ChecklistVersion');
    expect(typesContent).toContain('criterionIds');
  });

  test('defines private draft and published review types', () => {
    expect(typesContent).toContain('PeerReviewDraft');
    expect(typesContent).toContain('PeerReviewPublished');
    expect(typesContent).toContain("status: 'draft' | 'submitted'");
  });

  test('enforces private draft and published review collections', () => {
    expect(rulesContent).toContain('/peerReviewDrafts/{pairId}');
    expect(rulesContent).toContain('/peerReviews/{pairId}');
  });

  test('validates Boolean checklist response subdocuments', () => {
    expect(rulesContent).toContain('request.resource.data.checked is bool');
    expect(rulesContent).toContain('criterionId in');
  });

  test('includes current member and review eligibility helpers', () => {
    expect(rulesContent).toContain('isCurrentMember');
    expect(rulesContent).toContain('isPeerReviewEligible');
  });

  test('replaces comment immutability with lifecycle protections', () => {
    expect(rulesContent).toContain("request.resource.data.status in ['open', 'resolved']");
    expect(rulesContent).toContain('isDeleted');
    expect(rulesContent).toContain('deletedBy');
  });

  test('preserves individual vote rules', () => {
    expect(rulesContent).toContain('voteId == (request.auth.uid +');
    expect(rulesContent).toContain('voterUid == request.auth.uid');
  });

  test('draft updates cannot change private review state', () => {
    const draftUpdate = rulesContent.match(
      /match \/classes\/\{classId\}\/peerReviewDrafts\/\{pairId\}[\s\S]*?allow update: if[\s\S]*?allow delete/
    );
    expect(draftUpdate).not.toBeNull();
    expect(draftUpdate?.[0]).toContain("request.resource.data.status == 'draft'");
    expect(draftUpdate?.[0]).not.toContain("'status',");
  });

  test('published review requires matching private draft', () => {
    expect(rulesContent).toContain('peerReviewDrafts/$(pairId)');
    expect(rulesContent).toContain(".data.status == 'draft'");
  });
});
