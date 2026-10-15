// The SDK core without React: list published items from the local mock.
//   npm run mock                              (another terminal)
//   npm run example:cli -w @web-boilerplate/sdk-core -- lamp
import { createApiClient, defineEnvironment, isAbortError, listItems } from '../src/index';

const api = createApiClient({
  environment: defineEnvironment('local', process.env.API_BASE_URL ?? 'http://127.0.0.1:4010'),
});

const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 5_000);

try {
  const page = await listItems(api, { q: process.argv[2], limit: 5 }, { signal: controller.signal });
  for (const item of page.items) console.log(`${item.id}\t${item.status}\t${item.name}`);
  console.log(page.nextCursor ? `more: --cursor ${page.nextCursor}` : 'end of list');
} catch (error) {
  console.error(isAbortError(error) ? 'timed out' : error);
  process.exitCode = 1;
} finally {
  clearTimeout(timeout);
}
