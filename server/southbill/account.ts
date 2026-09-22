import { assertAccount, requireCondition } from './domain.ts';
import type { Account } from './domain.ts';

/** PulseAW's private namespace is not a SouthBill merchant/account identifier. */
export function pulseawAccount(env: Readonly<Record<string, string | undefined>>): Account {
  requireCondition(env.SOUTHBILL_MODE === 'live', 'LIVE_ACCOUNT_CONFIGURATION_REQUIRED');
  const merchantId = env.SOUTHBILL_MERCHANT_ID?.trim();
  const account: Account = {
    accountKey: 'pulseaw', livemode: true,
    ...(merchantId ? { merchantId } : {}),
  };
  assertAccount(account);
  return Object.freeze(account);
}
