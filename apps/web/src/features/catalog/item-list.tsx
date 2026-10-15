import type { Category, ItemSummary } from '@web-boilerplate/sdk-core';
import Link from 'next/link';
import { StatusBadge } from '@/components/status-badge';

export function ItemList({ items, categories }: { items: readonly ItemSummary[]; categories: readonly Category[] }) {
  const categoryName = (id: string) => categories.find((category) => category.id === id)?.name ?? id;
  return (
    <ul className="item-grid" aria-label="Items">
      {items.map((item) => (
        <li key={item.id} className="card">
          <Link href={`/items/${encodeURIComponent(item.id)}`} className="card-link">
            {item.name}
          </Link>
          <div className="card-meta">
            <span>{categoryName(item.category)}</span>
            <StatusBadge status={item.status} />
          </div>
          <time className="muted" dateTime={item.updatedAt}>
            Updated {new Date(item.updatedAt).toISOString().slice(0, 10)}
          </time>
        </li>
      ))}
    </ul>
  );
}
