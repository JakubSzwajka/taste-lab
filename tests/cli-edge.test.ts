// Edge cases found in review: fixtureKeys, paths with odd characters, broken filesystems.
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  rmdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { compile } from "tailwindcss";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkDataDir } from "../cli/check";
import { InitError, initDataDir } from "../cli/init";
import { run } from "../cli/main";
import {
  publicDirReason,
  tailwindSource,
  unsafeDirReason,
} from "../server/lab-dir";
import { freePort } from "./free-port";

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "taste-edge-"));
});
afterEach(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: { out: (s: string) => out.push(s), err: (s: string) => err.push(s) },
  };
}

const variant = `export default function A() {
  return <div className="grid gap-2" />;
}
`;
const round = {
  id: "round-001",
  level: "component",
  component: "card",
  question: "Which card?",
  fixture: "items",
  basedOn: null,
  variants: [
    { id: "a", file: "a.tsx", label: "A", changes: "plain" },
    { id: "b", file: "b.tsx", label: "B", changes: "plain too" },
  ],
};

function freshDir(name = "app") {
  const dir = join(tmp, name, ".taste-lab");
  initDataDir(dir);
  return dir;
}

function addRound(dir: string) {
  const r = join(dir, "rounds/round-001");
  mkdirSync(r, { recursive: true });
  writeFileSync(join(r, "round.json"), JSON.stringify(round));
  writeFileSync(join(r, "a.tsx"), variant);
  writeFileSync(join(r, "b.tsx"), variant);
  return r;
}

const setFixtures = (dir: string, body: string) =>
  writeFileSync(join(dir, "fixtures/index.ts"), body);

describe("check: fixtures and fixtureKeys", () => {
  it("requires a fixtureKeys export", async () => {
    const dir = freshDir();
    setFixtures(dir, "export const fixtures = { items: [] };\n");
    expect(await checkDataDir(dir)).toEqual([
      "fixtures/index.ts must export `fixtureKeys`, an array of strings",
    ]);
  });

  it("requires fixtureKeys to be an array of strings", async () => {
    const dir = freshDir();
    setFixtures(
      dir,
      'export const fixtures = { items: [] };\nexport const fixtureKeys = "items";\n',
    );
    expect(await checkDataDir(dir)).toEqual([
      "fixtures/index.ts must export `fixtureKeys`, an array of strings",
    ]);
    setFixtures(
      dir,
      "export const fixtures = { items: [] };\nexport const fixtureKeys = [1];\n",
    );
    expect(await checkDataDir(dir)).toHaveLength(1);
  });

  it("reports both exports when both are bad", async () => {
    const dir = freshDir();
    setFixtures(dir, "export const nope = 1;\n");
    expect(await checkDataDir(dir)).toEqual([
      "fixtures/index.ts must export a `fixtures` object",
      "fixtures/index.ts must export `fixtureKeys`, an array of strings",
    ]);
  });

  it("reports keys that are missing from fixtureKeys or not in fixtures", async () => {
    const dir = freshDir();
    setFixtures(
      dir,
      `export const fixtures = { items: [], rows: [] };
export const fixtureKeys = ["items", "ghost", "ghost"];
`,
    );
    expect(await checkDataDir(dir)).toEqual([
      "fixtureKeys lacks fixtures: rows",
      "fixtureKeys names keys that are not in fixtures: ghost",
      "fixtureKeys has duplicate entries",
    ]);
  });

  it("accepts the same keys in any order", async () => {
    const dir = freshDir();
    setFixtures(
      dir,
      `export const fixtures = { items: [], rows: [] };
export const fixtureKeys = ["rows", "items"];
`,
    );
    expect(await checkDataDir(dir)).toEqual([]);
  });
});

describe("tailwind @source paths", () => {
  const patternOf = async (dir: string) => {
    const css = tailwindSource(dir);
    const { sources } = await compile(css, { base: tmp });
    return sources.map((s) => s.pattern);
  };

  it("carries odd but legal paths literally", async () => {
    for (const dir of [
      "/tmp/tl app$&/.taste-lab",
      "/tmp/a$1$$b/.taste-lab",
      "/tmp/it's/.taste-lab",
      '/tmp/say "hi"/.taste-lab',
      "/tmp/a[1]b (x)!/.taste-lab",
      '/tmp/a";@source "/etc/.taste-lab',
    ]) {
      expect(unsafeDirReason(dir)).toBeNull();
      expect(await patternOf(dir)).toEqual([dir]);
    }
  });

  it("rejects paths Tailwind cannot carry", () => {
    for (const dir of [
      "/tmp/a\nb/.taste-lab",
      "/tmp/a\rb/.taste-lab",
      "/tmp/a\\b/.taste-lab",
      "/tmp/a*b/.taste-lab",
      "/tmp/a{x,y}/.taste-lab",
      `/tmp/both ' and "/.taste-lab`,
    ]) {
      expect(unsafeDirReason(dir)).toEqual(expect.any(String));
      expect(() => tailwindSource(dir)).toThrow("Tailwind cannot scan it");
    }
  });

  it("init, check and serve reject them with a clear message", async () => {
    const dir = join(tmp, "a\nb", ".taste-lab");
    expect(() => initDataDir(dir)).toThrow(InitError);
    expect(() => initDataDir(dir)).toThrow("line-break");
    mkdirSync(dir, { recursive: true });
    const c = capture();
    expect(await run(["check", "--dir", dir], c.io)).toBe(1);
    expect(c.err.join()).toContain("Tailwind cannot scan such a path");
    const { serve } = await import("../cli/serve");
    await expect(serve(dir, 5399)).rejects.toThrow("line-break");
    const i = capture();
    expect(await run(["init", "--dir", dir], i.io)).toBe(1);
    expect(i.err.join()).toContain("line-break");
  });
});

describe("data dir inside the lab's public/ folder", () => {
  const pub = join(import.meta.dirname, "..", "public");
  // The lab has no public/ folder today, and another test process may make one
  // at the same time. Own a unique child, and remove public/ only when empty.
  const own = join(pub, `x-${process.pid}`);
  beforeEach(() => {
    mkdirSync(own, { recursive: true });
  });
  afterEach(() => {
    rmSync(own, { recursive: true, force: true });
    try {
      rmdirSync(pub);
    } catch {
      // not empty: another process is using it
    }
  });

  it("init, check and serve reject it, symlinks followed", async () => {
    const { serve } = await import("../cli/serve");
    const direct = join(own, ".taste-lab");
    const link = join(tmp, "link");
    symlinkSync(pub, link);
    for (const dir of [direct, join(link, "y", ".taste-lab"), pub]) {
      expect(() => initDataDir(dir)).toThrow(InitError);
      expect(() => initDataDir(dir)).toThrow("public/ folder");
      await expect(serve(dir, 5398)).rejects.toThrow("public/ folder");
    }
    mkdirSync(join(tmp, "real"));
    expect(publicDirReason(join(tmp, "real"))).toBeNull();
    const c = capture();
    expect(await run(["check", "--dir", link], c.io)).toBe(1);
    expect(c.err.join()).toContain("public/ folder");
    const i = capture();
    expect(await run(["init", "--dir", direct], i.io)).toBe(1);
    expect(i.err.join()).toContain("public/ folder");
  });
});

describe("public serving is off", () => {
  const pub = join(import.meta.dirname, "..", "public");
  // The lab has no public/ folder today, and another test process may make one
  // at the same time. Own a unique child, and remove public/ only when empty.
  const own = join(pub, `..data-${process.pid}`);
  beforeEach(() => {
    mkdirSync(own, { recursive: true });
  });
  afterEach(() => {
    rmSync(own, { recursive: true, force: true });
    try {
      rmdirSync(pub);
    } catch {
      // not empty: another process is using it
    }
  });

  it("never serves taste.jsonl from a data dir under public/ or behind a symlink there", async () => {
    const { serve } = await import("../cli/serve");
    const secret = "PUBLIC-DIR-SECRET-LOG-LINE";
    // `..data` starts with two dots but is a child of public/. The link points elsewhere.
    const dotted = join(own, ".taste-lab");
    initDataDir(dotted);
    writeFileSync(join(dotted, "taste.jsonl"), `${secret}\n`);
    const target = join(tmp, "target", ".taste-lab");
    initDataDir(target);
    writeFileSync(join(target, "taste.jsonl"), `${secret}\n`);
    symlinkSync(target, join(own, "link"));

    const cases = [
      {
        dir: dotted,
        paths: [`/${basename(own)}/.taste-lab/taste.jsonl`],
      },
      {
        dir: join(own, "link"),
        paths: [`/${basename(own)}/link/taste.jsonl`],
      },
    ];
    for (const { dir, paths } of cases) {
      const port = await freePort();
      const { server, url } = await serve(dir, port);
      try {
        for (const p of paths) {
          for (const q of ["", "?raw&import", "?raw", "?import"]) {
            const res = await fetch(new URL(p + q, url));
            const body = await res.text();
            expect(body, `${p}${q}`).not.toContain(secret);
          }
        }
      } finally {
        await server.close();
      }
    }
  });
});

describe("serve with $ in the path", () => {
  it("resolves @/fixtures and the rounds glob for a dir named with $& and a space", async () => {
    const { serve } = await import("../cli/serve");
    const dir = join(tmp, "tl app$&", ".taste-lab");
    initDataDir(dir);
    addRound(dir);
    const port = await freePort();
    const before = process.env.TASTE_LAB_DIR;
    const { server, url } = await serve(dir, port);
    try {
      const variants = await (await fetch(`${url}src/lib/variants.ts`)).text();
      // The glob found the round, so `@lab/` resolved without expanding `$&`.
      expect(variants).toContain("round-001/a.tsx");
      expect(variants).toContain("tl app$&");
      // `@/fixtures` points at the real file, not at a `$&`-mangled path.
      const m = variants.match(/from "(\/@fs[^"]*fixtures\/index\.ts[^"]*)"/);
      expect(m).not.toBeNull();
      const res = await fetch(`${url}${(m as RegExpMatchArray)[1]?.slice(1)}`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain("fixtureKeys");
    } finally {
      await server.close();
      if (before === undefined) delete process.env.TASTE_LAB_DIR;
      else process.env.TASTE_LAB_DIR = before;
    }
  }, 30_000);
});

describe("check: filesystem problems", () => {
  const isRoot = process.getuid?.() === 0;

  it("round.json that is a directory", async () => {
    const dir = freshDir();
    mkdirSync(join(dir, "rounds/round-001/round.json"), { recursive: true });
    expect(await checkDataDir(dir)).toEqual([
      "rounds/round-001/round.json is a directory, not a file",
    ]);
  });

  it("dangling round.json symlink", async () => {
    const dir = freshDir();
    mkdirSync(join(dir, "rounds/round-001"), { recursive: true });
    symlinkSync(join(tmp, "nowhere"), join(dir, "rounds/round-001/round.json"));
    expect(await checkDataDir(dir)).toEqual([
      "rounds/round-001/round.json is a dangling symlink",
    ]);
  });

  it("looping round.json symlink", async () => {
    const dir = freshDir();
    mkdirSync(join(dir, "rounds/round-001"), { recursive: true });
    const loop = join(dir, "rounds/round-001/round.json");
    symlinkSync(loop, loop);
    const [p] = await checkDataDir(dir);
    expect(p).toMatch(/round-001\/round\.json cannot be read/);
  });

  it("dangling round dir symlink", async () => {
    const dir = freshDir();
    symlinkSync(join(tmp, "nowhere"), join(dir, "rounds/round-001"));
    expect(await checkDataDir(dir)).toEqual([
      "rounds/round-001: dangling symlink",
    ]);
  });

  it("dangling variant symlink and a symlink cycle in a round", async () => {
    const dir = freshDir();
    const r = addRound(dir);
    symlinkSync(join(tmp, "nowhere"), join(r, "c.tsx"));
    symlinkSync(r, join(r, "again"));
    const problems = await checkDataDir(dir);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toMatch(/^rounds\/round-001\/again: symlink cycle/);
    expect(problems[1]).toMatch(
      /^rounds\/round-001\/c\.tsx: cannot read entry.*ENOENT/,
    );
  });

  it("a self-looping symlink in rounds/", async () => {
    const dir = freshDir();
    const r = addRound(dir);
    symlinkSync(join(r, "loop"), join(r, "loop"));
    const problems = await checkDataDir(dir);
    expect(
      problems.some((p) => p.includes("loop") && p.includes("ELOOP")),
    ).toBe(true);
  });

  it("config.json that is a directory, and a fixtures dir named index.ts", async () => {
    const dir = freshDir();
    rmSync(join(dir, "config.json"));
    mkdirSync(join(dir, "config.json"));
    rmSync(join(dir, "fixtures/index.ts"));
    mkdirSync(join(dir, "fixtures/index.ts"));
    expect(await checkDataDir(dir)).toEqual([
      "config.json is a directory, not a file",
      "fixtures/index.ts is a directory, not a file",
    ]);
  });

  it.skipIf(isRoot)("unreadable files and dirs", async () => {
    const dir = freshDir();
    const r = addRound(dir);
    chmodSync(join(r, "b.tsx"), 0o000);
    chmodSync(join(dir, "rounds/round-001/round.json"), 0o000);
    mkdirSync(join(dir, "rounds/round-002"));
    writeFileSync(join(dir, "rounds/round-002/round.json"), "{}");
    mkdirSync(join(dir, "rounds/round-002/sub"));
    chmodSync(join(dir, "rounds/round-002/sub"), 0o000);
    try {
      const c = capture();
      expect(await run(["check", "--dir", dir], c.io)).toBe(1);
      const text = c.err.join("\n");
      expect(text).toContain("round-001/round.json cannot be read (EACCES)");
      expect(text).toContain("round-002/sub: cannot read directory (EACCES)");
      expect(text).not.toContain("    at ");
    } finally {
      chmodSync(join(dir, "rounds/round-002/sub"), 0o755);
    }
  });

  it.skipIf(isRoot)("an unreadable variant file", async () => {
    const dir = freshDir();
    const r = addRound(dir);
    chmodSync(join(r, "b.tsx"), 0o000);
    const problems = await checkDataDir(dir);
    expect(problems).toEqual([
      "rounds/round-001/b.tsx: cannot read file (EACCES)",
    ]);
  });
});
