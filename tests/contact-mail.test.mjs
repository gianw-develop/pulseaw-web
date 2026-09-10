import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjectEmail } from '../app/contact-mail.ts';

test('encodes the brief without allowing special characters to become mail headers', () => {
  const message = 'A & B?\nIdea #1 + growth = yes\n&bcc=other@example.com';
  const url = new URL(buildProjectEmail({ name: 'Ana & José', email: 'ana+business@example.com', engagement: 'Founder Growth Launch', message }));
  assert.equal(url.pathname, 'info@pulseaw.com');
  assert.equal(url.searchParams.get('subject'), 'Project enquiry — Founder Growth Launch');
  assert.equal(url.searchParams.has('bcc'), false);
  assert.ok(url.searchParams.get('body').includes(message));
  assert.ok(url.searchParams.get('body').includes('ana+business@example.com'));
  assert.ok(url.searchParams.get('body').includes('Ana & José'));
});

test('a general enquiry does not silently select a paid engagement', () => {
  const url = new URL(buildProjectEmail({ name: 'Sam', email: 'sam@example.com', engagement: '', message: 'Please help me choose.' }));
  assert.equal(url.searchParams.get('subject'), 'Project enquiry — Help me choose an engagement');
  assert.ok(url.searchParams.get('body').includes('Engagement: To be discussed'));
});
