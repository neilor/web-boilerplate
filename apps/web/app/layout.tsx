import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { IdentitySwitcher } from '@/components/identity-switcher';
import { getPublicApiConfig } from '@/lib/config';
import { getDemoSession } from '@/lib/demo-session';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Catalog', template: '%s · Catalog' },
  description: 'Reference app: OpenAPI contract → typed SDK → React Query → pages, on synthetic data.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const identity = await getDemoSession();
  const { environment, baseUrl } = getPublicApiConfig();

  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <header className="site-header">
          <Link href="/items" className="brand">
            Catalog
          </Link>
          <span className="env" title="API environment">
            {environment}
          </span>
          <IdentitySwitcher current={identity} />
        </header>
        <Providers environment={environment} baseUrl={baseUrl} identity={identity}>
          <main id="main" className="container">
            {children}
          </main>
        </Providers>
        <footer className="site-footer container">
          Synthetic data from a local mock. Reference code, not a product.
        </footer>
      </body>
    </html>
  );
}
