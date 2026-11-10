import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAppLink } from './app-links.ts';

const SITE = 'https://bcsseattle.org';
const parse = (href: string) => parseAppLink(href, SITE);

test('email links verify the token, then open the right screen', () => {
  assert.deepEqual(parse('https://bcsseattle.org/m/auth/confirm?token_hash=abc&type=magiclink'), {
    to: '/home/',
    verify: { tokenHash: 'abc', type: 'magiclink' }
  });
  assert.equal(parse('org.bcsseattle.app://auth/confirm?token_hash=abc&type=recovery')?.to, '/signin/new-password/');
  assert.equal(parse('org.bcsseattle.app://auth/confirm/?token_hash=abc&type=email_change')?.to, '/more/account/');
});

test('email links without a token or with an unknown type are ignored', () => {
  assert.equal(parse('org.bcsseattle.app://auth/confirm?type=email'), null);
  assert.equal(parse('org.bcsseattle.app://auth/confirm?token_hash=abc&type=sms'), null);
});

test('Stripe returns open the screen that shows the result', () => {
  assert.deepEqual(parse('org.bcsseattle.app://return/checkout?kind=donation&id=d1'), {
    to: '/give/result/?kind=donation&id=d1'
  });
  assert.deepEqual(parse('org.bcsseattle.app://return/checkout?kind=fundraiser&id=d1&canceled=1'), {
    to: '/give/result/?kind=fundraiser&id=d1&canceled=1'
  });
  assert.deepEqual(parse('https://bcsseattle.org/m/return/checkout?kind=membership'), { to: '/more/account/' });
  assert.deepEqual(parse('org.bcsseattle.app://return/checkout?kind=contribution&canceled=1'), { to: '/more/account/' });
  assert.deepEqual(parse('org.bcsseattle.app://return/portal'), { to: '/more/account/' });
});

test('other sites, other paths and junk are ignored', () => {
  assert.equal(parse('https://evil.example/m/auth/confirm?token_hash=abc&type=email'), null);
  assert.equal(parse('https://bcsseattle.org/auth/callback?code=x'), null);
  assert.equal(parse('https://bcsseattle.org/m/elsewhere'), null);
  assert.equal(parse('other.app://return/portal'), null);
  assert.equal(parse('not a url'), null);
});
