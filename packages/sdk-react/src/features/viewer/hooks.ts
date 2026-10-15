'use client';

import { useQuery } from '@tanstack/react-query';
import { ANONYMOUS_IDENTITY } from '@web-boilerplate/sdk-core';
import { useApi } from '../../provider';
import { viewerQueries } from './queries';

/** The signed-in viewer. Disabled while anonymous, so nothing is requested without an identity. */
export function useViewer() {
  const api = useApi();
  return useQuery({ ...viewerQueries.current(api), enabled: api.scope.identity !== ANONYMOUS_IDENTITY });
}
