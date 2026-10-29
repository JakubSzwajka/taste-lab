import { execFile } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createServer, type Server } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseCli, UsageError } from "../cli/args";
import { checkDataDir } from "../cli/check";
import { InitError, initDataDir } from "../cli/init";
import { run } from "../cli/main";
import { isPortFree, pickPort, RESERVED_PORTS } from "../cli/port";

const repo = resolve(import.meta.dirname, "..");
const demo = join(repo, "examples/demo/.taste-lab");
const bin = join(repo, "bin/taste-lab.mjs");

let tmp: string;
beforeEach(() => {
  tmp = mkdtempSync(join(tmpdir(), "taste-cli-"));
});
afterEach(() => rmSync(tmp, { recursive: true, force: true }));

function capture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    io: { out: (s: string) => out.push(s), err: (s: string) => err.push(s) },
  };
}

describe("parseCli", () => {
  it("parses the three commands and resolves --dir against cwd", () => {
    expect(parseCli(["serve", "--dir", "x/.taste-lab"], "/repo")).toEqual({
      command: "serve",
      dir: "/repo/x/.taste-lab",
    });
    expect(parseCli(["serve", "--dir", "/abs", "--port", "5400"])).toEqual({
      command: "serve",
      dir: "/abs",
      port: 5400,
    });
    expect(parseCli(["serve", "--dir=/abs", "--port=6000"])).toEqual({
      command: "serve",
      dir: "/abs",
      port: 6000,
    });
    expect(parseCli(["init", "--dir", "/a", "--name", "App"])).toEqual({
      command: "init",
      dir: "/a",
      name: "App",
    });
    expect(parseCli(["init", "--dir", "/a"])).toEqual({
      command: "init",
      dir: "/a",
    });
    expect(parseCli(["check", "--dir", "/a"])).toEqual({
      command: "check",
      dir: "/a",
    });
  });

  it("returns help for no args, help and -h", () => {
    for (const argv of [[], ["help"], ["--help"], ["-h"], ["check", "-h"]]) {
      expect(parseCli(argv).command).toBe("help");
    }
  });

  it.each([
    [["launch", "--dir", "/a"], 'unknown command "launch"'],
    [["serve"], '"serve" needs --dir'],
    [["check", "--dir", ""], '"check" needs --dir'],
    [["check", "--dir", "/a", "--port", "1"], "--port is not an option"],
    [["serve", "--dir", "/a", "--name", "x"], "--name is not an option"],
    [["serve", "--dir", "/a", "--port", "0"], "--port must be"],
    [["serve", "--dir", "/a", "--port", "65536"], "--port must be"],
    [["serve", "--dir", "/a", "--port", "12ab"], "--port must be"],
    [["serve", "--dir", "/a", "--port", "-1"], ""],
    [["serve", "--dir", "/a", "--verbose"], "Unknown option"],
    [["serve", "--dir", "/a", "extra"], "positional"],
    [["init", "--dir", "/a", "--name", " "], "--name must not be empty"],
  ])("rejects %j", (argv, message) => {
    expect(() => parseCli(argv)).toThrow(UsageError);
    expect(() => parseCli(argv)).toThrow(message);
  });

  it("run() prints usage and exits 2 on a usage error", async () => {
    const c = capture();
    expect(await run(["serve"], c.io)).toBe(2);
    expect(c.err.join()).toContain("Usage: taste-lab");
  });
});

describe("pickPort", () => {
  it("starts at 5300 and skips the reserved ports", async () => {
    const tried: number[] = [];
    const port = await pickPort({
      isFree: async (p) => {
        tried.push(p);
        return true;
      },
    });
    expect(port).toBe(5300);
    expect(tried).toEqual([5300]);
  });

  it("never returns a reserved port, even when it is free", async () => {
    expect(RESERVED_PORTS).toEqual([3000, 3326, 5173, 5310]);
    for (const start of [3000, 3326, 5173, 5310]) {
      const p = await pickPort({ start, isFree: async () => true });
      expect(p).toBe(start + 1);
    }
  });

  it("moves past busy ports", async () => {
    const busy = new Set([5300, 5301, 5302]);
    const p = await pickPort({ isFree: async (n) => !busy.has(n) });
    expect(p).toBe(5303);
    // 5309 busy, 5310 reserved, so 5311
    const q = await pickPort({
      start: 5309,
      isFree: async (n) => n !== 5309,
    });
    expect(q).toBe(5311);
  });

  it("throws a readable error when nothing is free", async () => {
    await expect(
      pickPort({ tries: 3, isFree: async () => false }),
    ).rejects.toThrow("Pass --port");
  });

  it("detects a real listener on 127.0.0.1", async () => {
    const srv: Server = createServer();
    await new Promise<void>((r) => srv.listen(0, "127.0.0.1", r));
    const port = (srv.address() as { port: number }).port;
    try {
      expect(await isPortFree(port)).toBe(false);
      expect(await pickPort({ start: port, skip: [] })).not.toBe(port);
    } finally {
      await new Promise<void>((r) => srv.close(() => r()));
    }
  });
});

describe("init", () => {
  it("creates the skeleton with the parent folder as the name", () => {
    const dir = join(tmp, "my-app", ".taste-lab");
    const files = initDataDir(dir);
    expect(files).toEqual([
      "config.json",
      "fixtures/index.ts",
      "fixtures/items.ts",
      "rounds/.gitkeep",
      "library/.gitkeep",
      "taste.jsonl",
      "DESIGN.md",
    ]);
    for (const f of files) expect(existsSync(join(dir, f))).toBe(true);
    expect(JSON.parse(readFileSync(join(dir, "config.json"), "utf8"))).toEqual({
      version: 1,
      name: "my-app",
    });
    expect(readFileSync(join(dir, "taste.jsonl"), "utf8")).toBe("");
    expect(readFileSync(join(dir, "DESIGN.md"), "utf8")).toContain("my-app");
  });

  it("uses --name when given", async () => {
    const dir = join(tmp, "x", ".taste-lab");
    const c = capture();
    expect(await run(["init", "--dir", dir, "--name", "Shop"], c.io)).toBe(0);
    expect(
      JSON.parse(readFileSync(join(dir, "config.json"), "utf8")).name,
    ).toBe("Shop");
  });

  it("refuses to overwrite an existing directory and leaves it alone", async () => {
    const dir = join(tmp, ".taste-lab");
    mkdirSync(dir);
    writeFileSync(join(dir, "taste.jsonl"), "keep\n");
    expect(() => initDataDir(dir)).toThrow(InitError);
    const c = capture();
    expect(await run(["init", "--dir", dir], c.io)).toBe(1);
    expect(c.err.join()).toContain("already exists");
    expect(readdirSync(dir)).toEqual(["taste.jsonl"]);
    expect(readFileSync(join(dir, "taste.jsonl"), "utf8")).toBe("keep\n");
  });
});

const goodVariant = `import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { items } from "@/fixtures";

export default function A() {
  return (
    <div className="grid gap-2">
      {items.map((i) => (
        <Card key={i.id}>
          <CardHeader>
            <CardTitle>{i.title}</CardTitle>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
`;

function addRound(dir: string, id: string, round: unknown, files: string[]) {
  const r = join(dir, "rounds", id);
  mkdirSync(r, { recursive: true });
  writeFileSync(join(r, "round.json"), JSON.stringify(round, null, 2));
  for (const f of files) writeFileSync(join(r, f), goodVariant);
}

const roundJson = (id: string) => ({
  id,
  level: "component",
  component: "card",
  question: "Which card?",
  fixture: "items",
  basedOn: null,
  variants: [
    { id: "a", file: "a.tsx", label: "A", changes: "plain" },
    { id: "b", file: "b.tsx", label: "B", changes: "plain too" },
  ],
});

describe("check", () => {
  it("passes the demo data dir", async () => {
    expect(await checkDataDir(demo)).toEqual([]);
  });

  it("passes a fresh init and an init plus one valid round", async () => {
    const dir = join(tmp, "app", ".taste-lab");
    initDataDir(dir);
    expect(await checkDataDir(dir)).toEqual([]);
    addRound(dir, "round-001", roundJson("round-001"), ["a.tsx", "b.tsx"]);
    const c = capture();
    expect(await run(["check", "--dir", dir], c.io)).toBe(0);
    expect(c.out.join()).toContain("is clean");
  });

  it("reports round, fixture and scanner problems and exits 1", async () => {
    const dir = join(tmp, "app", ".taste-lab");
    initDataDir(dir);
    addRound(
      dir,
      "round-001",
      { ...roundJson("round-001"), fixture: "tasks" },
      ["a.tsx", "b.tsx"],
    );
    writeFileSync(
      join(dir, "rounds/round-001/b.tsx"),
      `import x from "node:fs";\nexport default () => <div className="bg-blue-500">{String(x)}</div>;\n`,
    );
    mkdirSync(join(dir, "rounds/round-002"));
    writeFileSync(join(dir, "config.json"), `{"version": 2}`);
    const problems = await checkDataDir(dir);
    expect(problems).toEqual([
      "config.json: version must be 1",
      "rounds/round-002: round.json is missing",
      'rounds/round-001: fixture "tasks" is unknown. Known: items',
      'rounds/round-001/b.tsx:1: import "node:fs" is not allowed',
      "rounds/round-001/b.tsx:2: palette color class (use semantic tokens like bg-card)",
    ]);
    const c = capture();
    expect(await run(["check", "--dir", dir], c.io)).toBe(1);
    expect(c.err.join("\n")).toContain("5 problem(s)");
  });

  it("reports a fixtures module that does not load", async () => {
    const dir = join(tmp, "app", ".taste-lab");
    initDataDir(dir);
    writeFileSync(join(dir, "fixtures/index.ts"), "export const nope = 1;\n");
    expect(await checkDataDir(dir)).toEqual([
      "fixtures/index.ts must export a `fixtures` object",
      "fixtures/index.ts must export `fixtureKeys`, an array of strings",
    ]);
    writeFileSync(join(dir, "fixtures/index.ts"), 'import "./missing";\n');
    const [p] = await checkDataDir(dir);
    expect(p).toMatch(/^fixtures\/index\.ts could not be loaded/);
  });

  it("reports a missing dir", async () => {
    expect(await checkDataDir(join(tmp, "nope"))).toEqual([
      `${join(tmp, "nope")} is not a directory`,
    ]);
  });
});

describe("bin/taste-lab.mjs", () => {
  const exec = (args: string[]) =>
    new Promise<{ code: number; stdout: string; stderr: string }>((res) => {
      execFile(
        process.execPath,
        [bin, ...args],
        { cwd: tmp },
        (error, stdout, stderr) =>
          res({ code: error ? Number(error.code) : 0, stdout, stderr }),
      );
    });

  it("check exits 0 for a good dir and 1 for a bad one", async () => {
    const good = join(tmp, "good");
    cpSync(demo, good, { recursive: true });
    expect((await exec(["check", "--dir", "good"])).code).toBe(0);
    const bad = join(tmp, "bad");
    initDataDir(bad);
    addRound(bad, "round-001", { ...roundJson("round-001"), variants: [] }, []);
    const r = await exec(["check", "--dir", "bad"]);
    expect(r.code).toBe(1);
    expect(r.stderr).toContain("variants must have 2 to 4 entries");
  }, 30_000);
});

describe("serve", () => {
  it("serves a data dir outside the repo and appends to its taste.jsonl", async () => {
    const { serve } = await import("../cli/serve");
    const dir = join(tmp, "outside", ".taste-lab");
    initDataDir(dir);
    addRound(dir, "round-001", roundJson("round-001"), ["a.tsx", "b.tsx"]);
    const port = await pickPort({ start: 5350 });
    const before = process.env.TASTE_LAB_DIR;
    const { server, url } = await serve(dir, port);
    try {
      expect(url).toBe(`http://127.0.0.1:${port}/`);
      expect((await fetch(url)).status).toBe(200);
      const variants = await (await fetch(`${url}src/lib/variants.ts`)).text();
      expect(variants).toContain("round-001/a.tsx");
      const res = await fetch(`${url}api/taste`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          round: "round-001",
          component: "card",
          level: "component",
          shown: ["a", "b"],
          pick: "a",
          tags: [],
          reason: "serve test",
          theme: "dark",
        }),
      });
      expect(res.status).toBe(201);
      const log = readFileSync(join(dir, "taste.jsonl"), "utf8");
      expect(JSON.parse(log).reason).toBe("serve test");
    } finally {
      await server.close();
      if (before === undefined) delete process.env.TASTE_LAB_DIR;
      else process.env.TASTE_LAB_DIR = before;
    }
  }, 30_000);

  it("refuses a dir without fixtures/index.ts", async () => {
    const { serve } = await import("../cli/serve");
    await expect(serve(join(tmp, "empty"), 5399)).rejects.toThrow(
      "taste-lab init",
    );
  });
});
