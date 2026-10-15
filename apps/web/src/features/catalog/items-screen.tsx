'use client';

import type { ListItemsQuery } from '@web-boilerplate/sdk-core';
import { useCategories, useItems, useViewer } from '@web-boilerplate/sdk-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EmptyState, ErrorState, LoadingState } from '@/components/async-state';
import { ItemFilters } from './item-filters';
import { ItemList } from './item-list';
import { parseListQuery, toSearchString } from './list-query';

/** Container: reads the URL, calls the hooks, picks a state. Rendering lives in the presentational components. */
export function ItemsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const query = parseListQuery(new URLSearchParams(useSearchParams().toString()));
  const items = useItems(query);
  const categories = useCategories();
  const viewer = useViewer();
  const isEditor = viewer.data?.roles.includes('editor') ?? false;

  const navigate = (next: ListItemsQuery) => router.replace(`${pathname}${toSearchString(next)}`, { scroll: false });
  const hasFilters = Boolean(query.q || query.category || query.status);

  return (
    <section aria-labelledby="items-heading">
      <div className="page-header">
        <h1 id="items-heading">Items</h1>
        {isEditor ? (
          <Link className="button" href="/items/new">
            New item
          </Link>
        ) : null}
      </div>

      <ItemFilters
        key={toSearchString({ ...query, cursor: undefined })}
        value={query}
        categories={categories.data ?? []}
        showStatus={isEditor}
        onChange={(next) => navigate({ ...next, cursor: undefined })}
      />

      {items.isFetching && items.data ? (
        <p className="muted" role="status">
          Updating…
        </p>
      ) : null}

      {items.isPending ? (
        <LoadingState label="Loading items…" />
      ) : items.isError && !items.data ? (
        <ErrorState error={items.error} onRetry={() => void items.refetch()} retrying={items.isFetching} />
      ) : items.data.items.length === 0 ? (
        <EmptyState title="No items match these filters.">
          {hasFilters ? (
            <button type="button" className="button button-secondary" onClick={() => navigate({})}>
              Clear filters
            </button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          {items.isError ? <ErrorState error={items.error} onRetry={() => void items.refetch()} /> : null}
          <ItemList items={items.data.items} categories={categories.data ?? []} />
          <nav className="pager" aria-label="Pages">
            {query.cursor ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => navigate({ ...query, cursor: undefined })}
              >
                First page
              </button>
            ) : null}
            {items.data.nextCursor ? (
              <button
                type="button"
                className="button button-secondary"
                onClick={() => navigate({ ...query, cursor: items.data.nextCursor ?? undefined })}
              >
                Next page
              </button>
            ) : null}
          </nav>
        </>
      )}
    </section>
  );
}
