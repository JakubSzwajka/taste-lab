import { createServer } from "node:net";
import { RESERVED_PORTS, START_PORT } from "../cli/port";

const handedOut = new Set<number>();
/** Ports tests must never get: the lab's default start and the reserved ones. */
const NEVER = new Set<number>([START_PORT, ...RESERVED_PORTS]);

/**
 * A port the OS chose, for tests that must know the port before they bind it.
 * Port 0 usually draws from the ephemeral range (32768 and up), but that range
 * is configurable, so a protected port is rejected and drawn again. The window
 * left is the gap between close and rebind. Where a test can bind its own
 * listener, use `listenOnFreePort` and keep the binding instead.
 */
export async function freePort(host = "127.0.0.1"): Promise<number> {
  for (;;) {
    const port = await new Promise<number>((resolve, reject) => {
      const srv = createServer();
      srv.once("error", reject);
      srv.listen({ port: 0, host, exclusive: true }, () => {
        const { port: p } = srv.address() as { port: number };
        srv.close(() => resolve(p));
      });
    });
    if (!NEVER.has(port) && !handedOut.has(port)) {
      handedOut.add(port);
      return port;
    }
  }
}

/** A listener bound to a port the OS chose, kept open. The caller closes it. */
export async function listenOnFreePort(
  host = "127.0.0.1",
): Promise<{ server: ReturnType<typeof createServer>; port: number }> {
  for (;;) {
    const server = createServer();
    const port = await new Promise<number>((resolve, reject) => {
      server.once("error", reject);
      server.listen({ port: 0, host, exclusive: true }, () =>
        resolve((server.address() as { port: number }).port),
      );
    });
    if (!NEVER.has(port)) return { server, port };
    await new Promise<void>((r) => server.close(() => r()));
  }
}
