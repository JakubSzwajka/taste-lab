import { mkdirSync, mkdtempSync, rmdirSync, rmSync } from "node:fs";
import { join } from "node:path";

export const PUBLIC_DIR = join(import.meta.dirname, "..", "public");

/**
 * A child of the lab's public/ folder that only this call made. mkdtemp creates
 * it exclusively, so a PID or name clash cannot hand back someone else's
 * files. public/ is removed on release only when this call made it too, and
 * then only if it is empty. A public/ that already existed is never removed.
 */
export function makePublicChild(prefix: string): {
  own: string;
  release: () => void;
} {
  for (let attempt = 0; ; attempt++) {
    let madePublic = false;
    try {
      mkdirSync(PUBLIC_DIR); // not recursive: EEXIST means it is not ours
      madePublic = true;
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    }
    try {
      const own = mkdtempSync(join(PUBLIC_DIR, prefix));
      return {
        own,
        release() {
          rmSync(own, { recursive: true, force: true });
          if (!madePublic) return;
          try {
            rmdirSync(PUBLIC_DIR); // ENOTEMPTY: a parallel run still uses it
          } catch {
            // left for the run that is still using it
          }
        },
      };
    } catch (e) {
      // A parallel run removed an empty public/ between our mkdir and mkdtemp.
      if ((e as NodeJS.ErrnoException).code !== "ENOENT" || attempt >= 20) {
        if (madePublic) {
          try {
            rmdirSync(PUBLIC_DIR);
          } catch {}
        }
        throw e;
      }
    }
  }
}
