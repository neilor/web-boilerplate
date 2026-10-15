import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { catalogQueries, createQueryClient, viewerQueries } from '@web-boilerplate/sdk-react';
import { ANONYMOUS_IDENTITY } from '@web-boilerplate/sdk-core';
import type { Metadata } from 'next';
import { ItemsScreen } from '@/features/catalog/items-screen';
import { parseListQuery } from '@/features/catalog/list-query';
import { getServerApi } from '@/lib/server-api';

export const metadata: Metadata = { title: 'Items' };

/**
 * Server component: fetches the first render's data with a QueryClient that lives only for this
 * request, then hands it to the client screen through HydrationBoundary. The client reuses the
 * same query keys, so it does not fetch again on load.
 */
export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = parseListQuery(await searchParams);
  const api = await getServerApi();
  const queryClient = createQueryClient();

  await Promise.all([
    queryClient.prefetchQuery({ ...catalogQueries.itemList(api, query), retry: false }),
    queryClient.prefetchQuery({ ...catalogQueries.categories(api), retry: false }),
    api.scope.identity === ANONYMOUS_IDENTITY
      ? null
      : queryClient.prefetchQuery({ ...viewerQueries.current(api), retry: false }),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ItemsScreen />
    </HydrationBoundary>
  );
}
