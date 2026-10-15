/**
 * Demo identities for the local mock. The tokens are fixed, public strings that only the mock
 * accepts; they stand in for whatever a real identity provider would issue.
 * A real app replaces this file with an adapter around its identity provider.
 */
export const DEMO_IDENTITIES = {
  anonymous: { label: 'Anonymous', subject: 'anonymous', token: null },
  viewer: { label: 'Demo viewer', subject: 'user-viewer', token: 'demo-viewer' },
  editor: { label: 'Demo editor', subject: 'user-editor', token: 'demo-editor' },
} as const;

export type DemoIdentity = keyof typeof DEMO_IDENTITIES;

export const DEMO_IDENTITY_COOKIE = 'demo_identity';

export function parseDemoIdentity(value: string | undefined): DemoIdentity {
  return value === 'viewer' || value === 'editor' ? value : 'anonymous';
}
