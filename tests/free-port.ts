import { createServer } from "node:net";

const handedOut = new Set<number>();

/**
 * A port the OS chose, for tests that must know the port before they bind it.
 * Binding port 0 draws from the kernel's ephemeral range (32768 and up), far
 * from the lab's 5300+ range and from the reserved ports. Parallel test files
 * no longer scan the same fixed range, which made two of them pick one port
 * (check, then bind). The window left is the few ms between close and rebind.
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
    if (!handedOut.has(port)) {
      handedOut.add(port);
      return port;
    }
  }
}
