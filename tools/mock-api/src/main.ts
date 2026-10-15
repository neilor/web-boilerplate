import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import { createMockApi } from './handler';

const port = Number(process.env.MOCK_PORT ?? 4010);
const latencyMs = Number(process.env.MOCK_LATENCY_MS ?? 250);
const api = createMockApi({ latencyMs });

const server = createServer(async (req, res) => {
  try {
    // Test hook: restore the fixtures between end-to-end runs.
    if (req.method === 'POST' && req.url === '/__reset') {
      api.reset();
      res.writeHead(204).end();
      return;
    }
    const hasBody = req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS';
    const request = new Request(new URL(req.url ?? '/', `http://localhost:${port}`), {
      method: req.method,
      headers: Object.entries(req.headers).flatMap(([name, value]) =>
        value === undefined
          ? []
          : Array.isArray(value)
            ? value.map((v) => [name, v] as [string, string])
            : [[name, value] as [string, string]],
      ),
      body: hasBody ? (Readable.toWeb(req) as ReadableStream<Uint8Array>) : undefined,
      duplex: 'half',
    } as RequestInit);
    const response = await api.handle(request);
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error(error);
    res.writeHead(500, { 'Content-Type': 'application/json' }).end('{"code":"mock_crash","message":"Mock crashed."}');
  }
});

server.listen(port, '127.0.0.1', () => {
  console.log(`mock API on http://localhost:${port} (synthetic data, ${latencyMs} ms latency)`);
});
