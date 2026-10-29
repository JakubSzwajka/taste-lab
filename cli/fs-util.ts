import { lstatSync, readFileSync, statSync } from "node:fs";

export type Kind = "dir" | "file" | "missing" | "dangling" | "error";

/** What `p` is, following symlinks. Never throws. */
export function kindOf(p: string): Kind {
  try {
    const st = statSync(p);
    return st.isDirectory() ? "dir" : st.isFile() ? "file" : "error";
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") return "error";
    try {
      lstatSync(p);
      return "dangling";
    } catch {
      return "missing";
    }
  }
}

export const errMsg = (e: unknown) => {
  const code = (e as NodeJS.ErrnoException)?.code;
  return code ?? (e instanceof Error ? e.message.split("\n")[0] : String(e));
};

/** Reads a text file. Returns a readable problem instead of throwing. */
export function readText(
  file: string,
  label: string,
): { text: string } | { error: string } {
  switch (kindOf(file)) {
    case "file":
      break;
    case "dir":
      return { error: `${label} is a directory, not a file` };
    case "dangling":
      return { error: `${label} is a dangling symlink` };
    case "missing":
      return { error: `${label} is missing` };
    default:
      return {
        error: `${label} cannot be read (not a regular file or a symlink loop)`,
      };
  }
  try {
    return { text: readFileSync(file, "utf8") };
  } catch (e) {
    return { error: `${label} cannot be read (${errMsg(e)})` };
  }
}
