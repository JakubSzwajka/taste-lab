import { createServer } from "node:net";

export const START_PORT = 5300;
/** Ports other local tools use. Never picked automatically. */
export const RESERVED_PORTS: readonly number[] = [3000, 3326, 5173, 5310];

/** True when nothing listens on `port` at `host`. */
export function isPortFree(port: number, host = "127.0.0.1"): Promise<boolean> {
  return new Promise((resolve) => {
    const srv = createServer();
    srv.once("error", () => resolve(false));
    srv.listen({ port, host, exclusive: true }, () => {
      srv.close(() => resolve(true));
    });
  });
}

/** First free port from `start`, skipping reserved ports. Tries `tries` ports. */
export async function pickPort(
  opts: {
    start?: number;
    skip?: readonly number[];
    isFree?: (port: number) => Promise<boolean>;
    tries?: number;
  } = {},
): Promise<number> {
  const {
    start = START_PORT,
    skip = RESERVED_PORTS,
    isFree = (p: number) => isPortFree(p),
    tries = 200,
  } = opts;
  for (let port = start; port < start + tries && port <= 65535; port++) {
    if (skip.includes(port)) continue;
    if (await isFree(port)) return port;
  }
  throw new Error(
    `no free port in ${start}-${start + tries - 1}. Pass --port to choose one.`,
  );
}
