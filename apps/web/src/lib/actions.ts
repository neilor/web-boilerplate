'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { DEMO_IDENTITY_COOKIE, parseDemoIdentity } from './demo-identity';

/** Switches the demo identity. Stands in for a real sign-in/sign-out flow. */
export async function switchDemoIdentity(formData: FormData) {
  const identity = parseDemoIdentity(String(formData.get('identity') ?? ''));
  const store = await cookies();
  if (identity === 'anonymous') store.delete(DEMO_IDENTITY_COOKIE);
  else store.set(DEMO_IDENTITY_COOKIE, identity, { httpOnly: true, sameSite: 'lax', path: '/' });
  const back = String(formData.get('returnTo') ?? '/items');
  redirect(back.startsWith('/') && !back.startsWith('//') ? back : '/items');
}
