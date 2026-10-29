import { readdirSync } from "node:fs";
import { join } from "node:path";
import { parseAst } from "vite";
import { folderNameProblem, validateMeta } from "../src/lib/library.ts";
import { errMsg, kindOf, readText } from "./fs-util.ts";
import { scanVariants } from "./scan-variants.ts";

type Node = { type: string; [k: string]: unknown };
const isNode = (v: unknown): v is Node =>
  typeof v === "object" && v !== null && typeof (v as Node).type === "string";

/**
 * Value exports of a module, read from the syntax. Null when the file does not
 * parse (the scanner reports that) or has `export *` (names cannot be known).
 * Type exports are left out: a type is not a component.
 */
export function valueExports(source: string): string[] | null {
  let body: unknown[];
  try {
    body = (parseAst(source, { lang: "tsx" }) as unknown as { body: unknown[] })
      .body;
  } catch {
    return null;
  }
  const names: string[] = [];
  for (const n of body) {
    if (!isNode(n)) continue;
    if (n.type === "ExportAllDeclaration") return null;
    if (n.type !== "ExportNamedDeclaration" || n.exportKind === "type") {
      continue;
    }
    const d = n.declaration;
    if (isNode(d)) {
      if (d.type === "VariableDeclaration") {
        for (const decl of d.declarations as Node[]) {
          const id = decl.id;
          if (isNode(id) && id.type === "Identifier")
            names.push(id.name as string);
          else return null; // destructuring: leave the file unchecked
        }
      } else if (isNode(d.id) && d.id.type === "Identifier") {
        if (!d.type.startsWith("TS") && d.declare !== true) {
          names.push(d.id.name as string);
        }
      }
    }
    for (const sp of (n.specifiers as Node[] | undefined) ?? []) {
      const ex = sp.exported;
      if (sp.exportKind === "type" || !isNode(ex)) continue;
      names.push((ex.name ?? ex.value) as string);
    }
  }
  return names;
}

/**
 * Validates `<dir>/library/*`: folder names, required files, meta.json, example
 * exports, provenance rounds, and the scanner with the library rules.
 * A missing `library/` is fine. `rounds` are the round ids that exist.
 */
export function checkLibrary(dir: string, rounds: string[]): string[] {
  const root = join(dir, "library");
  const kind = kindOf(root);
  if (kind === "missing") return [];
  if (kind !== "dir") return ["library/ is not a readable directory"];
  const problems: string[] = [];
  let names: string[] = [];
  try {
    names = readdirSync(root).sort();
  } catch (e) {
    return [`library/ cannot be read (${errMsg(e)})`];
  }
  for (const name of names) {
    if (name.startsWith(".")) continue; // .gitkeep and friends
    const folder = join(root, name);
    const at = `library/${name}`;
    const k = kindOf(folder);
    if (k === "dangling") {
      problems.push(`${at}: dangling symlink`);
      continue;
    }
    if (k !== "dir") continue; // a stray file is not an entry
    const out: string[] = [];
    const metaFile = readText(join(folder, "meta.json"), `${at}/meta.json`);
    let data: unknown;
    if ("error" in metaFile) {
      out.push(
        metaFile.error.endsWith("is missing")
          ? "meta.json is missing"
          : metaFile.error.replace(`${at}/`, ""),
      );
    } else {
      try {
        data = JSON.parse(metaFile.text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        out.push(`meta.json is not valid JSON: ${msg}`);
      }
    }
    let files: string[] = [];
    try {
      files = readdirSync(folder).filter((f) => f.endsWith(".tsx"));
    } catch (e) {
      out.push(`cannot list files (${errMsg(e)})`);
    }
    const exports: Record<string, string[]> = {};
    for (const f of files) {
      const src = readText(join(folder, f), `${at}/${f}`);
      if ("text" in src) {
        const names = valueExports(src.text);
        if (names) exports[f] = names;
      }
    }
    if (out.length === 0) {
      out.push(
        ...validateMeta(data, { dir: name, files, exports, rounds }).errors,
      );
    } else {
      const bad = folderNameProblem(name);
      if (bad) out.push(bad);
    }
    for (const m of out) problems.push(`${at}: ${m}`);
  }
  for (const v of scanVariants(root, { library: true })) {
    const where = `library/${v.file}`;
    if (v.line === 0) {
      const seen = problems.some(
        (p) => p.startsWith(`${where}:`) || p.startsWith(`${where} `),
      );
      if (!seen) problems.push(`${where}: ${v.message}`);
    } else problems.push(`${where}:${v.line}: ${v.message}`);
  }
  return problems;
}
