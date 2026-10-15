import 'server-only';
import { defineEnvironment, type ApiEnvironment } from '@web-boilerplate/sdk-core';

const DEFAULT_BASE_URL = 'http://127.0.0.1:4010';

/** Where the Next server calls the API. Read at request time, so one build runs in any environment. */
export function getServerEnvironment(): ApiEnvironment {
  return defineEnvironment(process.env.API_ENVIRONMENT ?? 'local', process.env.API_BASE_URL ?? DEFAULT_BASE_URL);
}

/** What the browser needs to call the API itself. Non-secret by construction: no keys, no tokens. */
export function getPublicApiConfig(): { environment: string; baseUrl: string } {
  const environment = getServerEnvironment().name;
  const { baseUrl } = defineEnvironment(environment, process.env.PUBLIC_API_BASE_URL ?? DEFAULT_BASE_URL);
  return { environment, baseUrl };
}
