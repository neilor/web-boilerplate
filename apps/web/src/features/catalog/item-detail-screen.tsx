'use client';

import { ApiError, type ItemStatus } from '@web-boilerplate/sdk-core';
import { useCategories, useItem, useRealtimeValue, useUpdateItem, useViewer } from '@web-boilerplate/sdk-react';
import Link from 'next/link';
import { useState } from 'react';
import { ErrorState, LoadingState } from '@/components/async-state';
import { ItemDetail } from './item-detail';
import { ItemForm } from './item-form';
import { fromApiFieldErrors } from './item-validation';
import { createSimulatedPresenceSource } from './presence-source';

const presence = createSimulatedPresenceSource();

export function ItemDetailScreen({ itemId }: { itemId: string }) {
  const item = useItem(itemId);
  const categories = useCategories();
  const viewer = useViewer();
  const watching = useRealtimeValue<number>(presence, item.data ? `presence/${itemId}` : null);
  const isEditor = viewer.data?.roles.includes('editor') ?? false;

  if (item.isPending) return <LoadingState label="Loading item…" />;
  if (item.isError) {
    return (
      <>
        <ErrorState error={item.error} onRetry={() => void item.refetch()} retrying={item.isFetching} />
        <p>
          <Link href="/items">Back to items</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <p>
        <Link href="/items">← Back to items</Link>
      </p>
      <ItemDetail item={item.data} categories={categories.data ?? []} />
      <p className="muted" aria-live="polite">
        {watching.value === undefined ? 'Connecting to live presence…' : `${watching.value} viewing now (simulated)`}
      </p>
      {isEditor ? <EditItem itemId={itemId} /> : null}
    </>
  );
}

function EditItem({ itemId }: { itemId: string }) {
  const item = useItem(itemId);
  const categories = useCategories();
  const update = useUpdateItem(itemId);
  const [status, setStatus] = useState<ItemStatus | null>(null);
  const fieldErrors = update.error instanceof ApiError ? fromApiFieldErrors(update.error.fieldErrors) : {};
  if (!item.data) return null;
  const current = item.data;

  return (
    <section className="panel" aria-labelledby="edit-heading">
      <h2 id="edit-heading">Edit</h2>
      {update.isError && Object.keys(fieldErrors).length === 0 ? <ErrorState error={update.error} /> : null}
      {update.isSuccess ? <p role="status">Saved.</p> : null}
      <div className="field">
        <label htmlFor="edit-status">Status</label>
        <select
          id="edit-status"
          value={status ?? current.status}
          onChange={(event) => setStatus(event.target.value as ItemStatus)}
        >
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>
      <ItemForm
        key={current.updatedAt}
        initial={{
          name: current.name,
          category: current.category,
          description: current.description,
          tags: current.tags.join(', '),
        }}
        categories={categories.data ?? []}
        submitLabel="Save changes"
        submitting={update.isPending}
        lockCategory
        serverErrors={fieldErrors}
        onSubmit={(input) =>
          update.mutate({
            name: input.name,
            description: input.description ?? '',
            tags: input.tags ?? [],
            ...(status && status !== current.status ? { status } : {}),
          })
        }
      />
    </section>
  );
}
