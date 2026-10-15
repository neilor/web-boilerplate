'use client';

import { ApiError } from '@web-boilerplate/sdk-core';
import { useCategories, useCreateItem } from '@web-boilerplate/sdk-react';
import { useRouter } from 'next/navigation';
import { ErrorState, LoadingState } from '@/components/async-state';
import { ItemForm } from './item-form';
import { fromApiFieldErrors } from './item-validation';

export function CreateItemScreen() {
  const router = useRouter();
  const categories = useCategories();
  const create = useCreateItem();
  const fieldErrors = create.error instanceof ApiError ? fromApiFieldErrors(create.error.fieldErrors) : {};
  const hasFieldErrors = Object.keys(fieldErrors).length > 0;

  if (categories.isPending) return <LoadingState />;
  if (categories.isError) return <ErrorState error={categories.error} onRetry={() => void categories.refetch()} />;

  return (
    <>
      {create.isError && !hasFieldErrors ? <ErrorState error={create.error} /> : null}
      <ItemForm
        initial={{ name: '', category: '', description: '', tags: '' }}
        categories={categories.data}
        submitLabel="Create item"
        submitting={create.isPending}
        serverErrors={fieldErrors}
        onSubmit={(input) =>
          create.mutate(input, { onSuccess: (item) => router.push(`/items/${encodeURIComponent(item.id)}`) })
        }
      />
    </>
  );
}
