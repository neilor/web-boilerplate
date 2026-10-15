import type { Metadata } from 'next';
import Link from 'next/link';
import { CreateItemScreen } from '@/features/catalog/create-item-screen';
import { getDemoSession } from '@/lib/demo-session';

export const metadata: Metadata = { title: 'New item' };

export default async function NewItemPage() {
  const identity = await getDemoSession();
  return (
    <section aria-labelledby="new-heading">
      <p>
        <Link href="/items">← Back to items</Link>
      </p>
      <h1 id="new-heading">New item</h1>
      {identity === 'editor' ? (
        <CreateItemScreen />
      ) : (
        <p role="status">Only editors can create items. Switch the demo identity to “Demo editor” in the header.</p>
      )}
    </section>
  );
}
