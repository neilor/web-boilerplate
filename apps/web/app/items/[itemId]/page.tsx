import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { ApiError, catalogKeys, getItem, type Item } from '@web-boilerplate/sdk-core';
import { catalogQueries, createQueryClient } from '@web-boilerplate/sdk-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ItemDetailScreen } from '@/features/catalog/item-detail-screen';
import { getServerApi } from '@/lib/server-api';

type Params = Promise<{ itemId: string }>;

/** One fetch per request, shared by the metadata and the page. `null` means "not found". */
const loadItem = cache(async (itemId: string): Promise<Item | null> => {
  try {
    return await getItem((await getServerApi()).client, itemId);
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { itemId } = await params;
  const item = await loadItem(itemId).catch(() => undefined);
  return { title: item?.name ?? 'Item' };
}

export default async function ItemPage({ params }: { params: Params }) {
  const { itemId } = await params;
  const api = await getServerApi();
  const queryClient = createQueryClient();

  let item: Item | null | undefined;
  try {
    item = await loadItem(itemId);
  } catch {
    // Server-side failure: render the page anyway and let the client show the error with a retry.
    item = undefined;
  }
  if (item === null) notFound();
  if (item) queryClient.setQueryData(catalogKeys.itemDetail(api.scope, itemId), item);
  await queryClient.prefetchQuery({ ...catalogQueries.categories(api), retry: false });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ItemDetailScreen itemId={itemId} />
    </HydrationBoundary>
  );
}
