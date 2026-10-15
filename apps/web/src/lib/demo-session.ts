import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { DEMO_IDENTITY_COOKIE, parseDemoIdentity, type DemoIdentity } from './demo-identity';

/** The demo identity of the current request, read once per render pass. */
export const getDemoSession = cache(async (): Promise<DemoIdentity> => {
  return parseDemoIdentity((await cookies()).get(DEMO_IDENTITY_COOKIE)?.value);
});
