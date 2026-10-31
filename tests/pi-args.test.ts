import { homedir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { completeTasteArgs, parseTasteArgs, splitWords } from "../pi/lib/args";

const cwd = "/repo";

describe("/taste arguments", () => {
  it("defaults to <cwd>/.taste-lab with LAN", () => {
    expect(parseTasteArgs("", cwd)).toEqual({
      action: "start",
      lan: true,
      dir: "/repo/.taste-lab",
    });
    expect(parseTasteArgs("   ", cwd)).toEqual({
      action: "start",
      lan: true,
      dir: "/repo/.taste-lab",
    });
  });

  it("local skips the LAN", () => {
    expect(parseTasteArgs("local", cwd)).toEqual({
      action: "start",
      lan: false,
      dir: "/repo/.taste-lab",
    });
  });

  it("--dir resolves against cwd, in either order and form", () => {
    expect(parseTasteArgs("--dir app/.taste-lab", cwd)).toEqual({
      action: "start",
      lan: true,
      dir: "/repo/app/.taste-lab",
    });
    expect(parseTasteArgs("--dir=/abs/x local", cwd)).toEqual({
      action: "start",
      lan: false,
      dir: "/abs/x",
    });
    expect(parseTasteArgs('local --dir "my app/.taste-lab"', cwd)).toEqual({
      action: "start",
      lan: false,
      dir: "/repo/my app/.taste-lab",
    });
    expect(parseTasteArgs("--dir ~/lab", cwd)).toMatchObject({
      dir: join(homedir(), "lab"),
    });
  });

  it("status, qr and stop stand alone", () => {
    expect(parseTasteArgs("qr", cwd)).toEqual({ action: "qr" });
    expect(parseTasteArgs("qr local", cwd)).toMatchObject({ action: "error" });
    expect(parseTasteArgs("status", cwd)).toEqual({ action: "status" });
    expect(parseTasteArgs(" stop ", cwd)).toEqual({ action: "stop" });
    expect(parseTasteArgs("stop now", cwd)).toMatchObject({ action: "error" });
  });

  it("rejects bad input with a message", () => {
    for (const bad of [
      "--dir",
      "--dir=",
      "lan",
      "local local",
      "--port 5",
      "--dir a --dir b",
      '--dir "x',
    ]) {
      const r = parseTasteArgs(bad, cwd);
      expect(r.action, bad).toBe("error");
    }
  });

  it("splits words with quotes", () => {
    expect(splitWords(`a 'b c' "d e"f`)).toEqual(["a", "b c", "d ef"]);
    expect(splitWords('""')).toEqual([""]);
    expect(splitWords("'open")).toBeNull();
  });

  it("completes subcommands", () => {
    expect(completeTasteArgs("st")?.map((i) => i.value)).toEqual([
      "status",
      "stop",
    ]);
    expect(completeTasteArgs("q")?.map((i) => i.value)).toEqual(["qr"]);
    expect(completeTasteArgs("zzz")).toBeNull();
  });
});
