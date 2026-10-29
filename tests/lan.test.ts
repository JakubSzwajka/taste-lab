import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, request, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import type { NetworkInterfaceInfo } from "node:os";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseCli, UsageError } from "../cli/args";
import { initDataDir } from "../cli/init";
import { run } from "../cli/main";
import { pickPort } from "../cli/port";
import {
  checkLanRequest,
  defaultRouteInterface,
  type Ifaces,
  isAllowedBindHost,
  isPrivateAddress,
  isVirtualInterface,
  type LanConfig,
  newToken,
  parseDefaultRoute,
  pickLanAddress,
  tokenMatches,
} from "../server/lan";
import { createTasteMiddleware } from "../server/taste-log";
import {
  captureToken,
  TOKEN_HEADER,
  TOKEN_KEY,
  tokenHeaders,
} from "../src/lib/token";

describe("isPrivateAddress", () => {
  it.each([
    "10.0.0.1",
    "10.255.255.255",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.23",
    "127.0.0.1",
    "127.9.9.9",
    "::1",
    "fc00::1",
    "fd12:3456::1",
    "fdff::",
    "::ffff:192.168.1.23",
    "::ffff:127.0.0.1",
    "::ffff:10.1.2.3",
    "::ffff:c0a8:0117", // 192.168.1.23 in hex form
    "0:0:0:0:0:ffff:ac10:1", // 172.16.0.1
  ])("accepts %s", (a) => expect(isPrivateAddress(a)).toBe(true));

  it.each([
    undefined,
    "",
    "8.8.8.8",
    "172.15.255.255",
    "172.32.0.1",
    "192.169.0.1",
    "11.0.0.1",
    "100.64.0.1", // tailscale CGNAT
    "169.254.1.1",
    "0.0.0.0",
    "::",
    "2001:4860:4860::8888",
    "fe80::1",
    "fb00::1",
    "fe00::1",
    "::ffff:8.8.8.8",
    "::ffff:0808:0808",
    "not an address",
    "192.168.1",
    "192.168.1.1.1",
  ])("rejects %s", (a) => expect(isPrivateAddress(a)).toBe(false));

  it("only takes literal private or loopback IPv4 for --host", () => {
    expect(isAllowedBindHost("192.168.1.23")).toBe(true);
    expect(isAllowedBindHost("127.0.0.2")).toBe(true);
    for (const h of ["0.0.0.0", "8.8.8.8", "::1", "localhost", "fd00::1", ""])
      expect(isAllowedBindHost(h)).toBe(false);
  });
});

const info = (
  address: string,
  extra: Partial<NetworkInterfaceInfo> = {},
): NetworkInterfaceInfo =>
  ({
    address,
    family: "IPv4",
    internal: false,
    netmask: "255.255.255.0",
    mac: "00:00:00:00:00:00",
    cidr: `${address}/24`,
    ...extra,
  }) as NetworkInterfaceInfo;

/** This machine: dozens of bridges listed before wlp10s0, plus tailscale. */
const machine: Ifaces = {
  lo: [info("127.0.0.1", { internal: true })],
  "br-0a1b2c3d4e5f": [info("172.18.0.1")],
  "br-1a1b2c3d4e5f": [info("172.19.0.1")],
  "br-2a1b2c3d4e5f": [info("172.20.0.1")],
  docker0: [info("172.17.0.1")],
  veth1234: [info("10.99.0.2")],
  wlp10s0: [
    info("192.168.1.23"),
    info("fe80::1", { family: "IPv6" }),
    info("fd00::23", { family: "IPv6" }),
  ],
  tailscale0: [info("100.101.102.103")],
};

describe("pickLanAddress", () => {
  it("prefers the default-route interface", () => {
    const p = pickLanAddress(machine, "wlp10s0");
    expect(p?.chosen).toEqual({ iface: "wlp10s0", address: "192.168.1.23" });
  });

  it("without a default route skips bridges, tunnels and loopback", () => {
    const p = pickLanAddress(machine);
    expect(p?.chosen).toEqual({ iface: "wlp10s0", address: "192.168.1.23" });
    expect(p?.others).toEqual([]);
    expect(p?.skippedVirtual).toBe(5);
  });

  it("an unknown default-route name falls back to the first real interface", () => {
    expect(pickLanAddress(machine, "nope0")?.chosen.address).toBe(
      "192.168.1.23",
    );
  });

  it("lists other real candidates", () => {
    const p = pickLanAddress({
      eth0: [info("10.0.0.5")],
      wlan0: [info("192.168.1.9")],
    });
    expect(p?.chosen.address).toBe("10.0.0.5");
    expect(p?.others).toEqual([{ iface: "wlan0", address: "192.168.1.9" }]);
  });

  it("takes the default route even on a virtual-looking interface", () => {
    const p = pickLanAddress({ "br-x": [info("172.18.0.1")] }, "br-x");
    expect(p?.chosen.address).toBe("172.18.0.1");
    expect(p?.skippedVirtual).toBe(0);
  });

  it("returns undefined with only virtual, loopback or public addresses", () => {
    expect(
      pickLanAddress({
        lo: [info("127.0.0.1", { internal: true })],
        docker0: [info("172.17.0.1")],
        ppp0: [info("8.8.4.4")],
        tailscale0: [info("100.64.0.9")],
      }),
    ).toBeUndefined();
  });

  it("accepts the numeric family of older Node versions", () => {
    const p = pickLanAddress({
      eth0: [info("10.0.0.5", { family: 4 as unknown as "IPv4" })],
    });
    expect(p?.chosen.address).toBe("10.0.0.5");
  });

  it("names virtual interfaces", () => {
    for (const n of [
      "lo",
      "docker0",
      "br-abc",
      "veth0",
      "virbr0",
      "tailscale0",
    ])
      expect(isVirtualInterface(n)).toBe(true);
    for (const n of ["wlp10s0", "eth0", "enp3s0", "en0", "wlan0", "bridge0"])
      expect(isVirtualInterface(n)).toBe(false);
  });
});

describe("parseDefaultRoute", () => {
  const header =
    "Iface\tDestination\tGateway\tFlags\tRefCnt\tUse\tMetric\tMask\tMTU\tWindow\tIRTT";
  it("reads the interface of the default route, lowest metric first", () => {
    const text = [
      header,
      "eth0\t00000000\t0101A8C0\t0003\t0\t0\t700\t00000000\t0\t0\t0",
      "wlp10s0\t00000000\t0101A8C0\t0003\t0\t0\t600\t00000000\t0\t0\t0",
      "wlp10s0\t0001A8C0\t00000000\t0001\t0\t0\t600\t00FFFFFF\t0\t0\t0",
      "br-1\t000012AC\t00000000\t0001\t0\t0\t0\t0000FFFF\t0\t0\t0",
    ].join("\n");
    expect(parseDefaultRoute(text)).toBe("wlp10s0");
  });
  it("returns undefined without a default route, or for a down route", () => {
    expect(parseDefaultRoute(header)).toBeUndefined();
    expect(parseDefaultRoute("")).toBeUndefined();
    expect(
      parseDefaultRoute(
        `${header}\neth0\t00000000\t0101A8C0\t0002\t0\t0\t1\t00000000\t0\t0\t0`,
      ),
    ).toBeUndefined();
  });
  it("never throws on this machine", () => {
    const r = defaultRouteInterface();
    expect(r === undefined || typeof r === "string").toBe(true);
  });
});

describe("token", () => {
  it("is 128 bits of base64url and new each time", () => {
    const a = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(newToken()).not.toBe(a);
  });
  it("compares exactly", () => {
    const t = newToken();
    expect(tokenMatches(t, t)).toBe(true);
    expect(tokenMatches(`${t}x`, t)).toBe(false);
    expect(tokenMatches(t.slice(1), t)).toBe(false);
    expect(tokenMatches("", t)).toBe(false);
    expect(tokenMatches(undefined, t)).toBe(false);
    expect(tokenMatches([t, t], t)).toBe(false);
  });
});

describe("serve args", () => {
  const dir = "/tmp/x/.taste-lab";
  const parse = (...a: string[]) =>
    parseCli(["serve", "--dir", dir, ...a], "/");
  it("accepts --lan, with or without --host and --port", () => {
    expect(parse("--lan")).toEqual({ command: "serve", dir, lan: true });
    expect(parse("--lan", "--host", "192.168.1.23", "--port", "5400")).toEqual({
      command: "serve",
      dir,
      lan: true,
      host: "192.168.1.23",
      port: 5400,
    });
  });
  it("leaves plain serve unchanged", () => {
    expect(parse()).toEqual({ command: "serve", dir });
    expect(parse("--port", "5400")).toEqual({
      command: "serve",
      dir,
      port: 5400,
    });
  });
  it("rejects --host without --lan", () => {
    expect(() => parse("--host", "192.168.1.23")).toThrow(UsageError);
    expect(() => parse("--host", "192.168.1.23")).toThrow("--host needs --lan");
  });
  it.each(["0.0.0.0", "8.8.8.8", "::1", "localhost", "fd00::1"])(
    "rejects --host %s",
    (h) => {
      expect(() => parse("--lan", "--host", h)).toThrow(UsageError);
    },
  );
  it("rejects --lan and --host on other commands", () => {
    expect(() => parseCli(["check", "--dir", dir, "--lan"], "/")).toThrow(
      '"check"',
    );
    expect(() =>
      parseCli(["init", "--dir", dir, "--host", "10.0.0.1"], "/"),
    ).toThrow('"init"');
  });
  it("exits 2 for --host without --lan", async () => {
    const err: string[] = [];
    const code = await run(["serve", "--dir", dir, "--host", "192.168.1.23"], {
      out: () => {},
      err: (s) => err.push(s),
    });
    expect(code).toBe(2);
    expect(err.join("")).toContain("--host needs --lan");
  });
});

const lan: LanConfig = { address: "192.168.1.23", port: 5301, token: "tok-ok" };
const good = {
  remoteAddress: "192.168.1.50",
  host: "192.168.1.23:5301",
  origin: undefined as string | undefined,
  token: "tok-ok" as string | string[] | undefined,
};

describe("checkLanRequest matrix", () => {
  it("allows a good request, with or without a matching Origin", () => {
    expect(checkLanRequest(good, lan)).toBeNull();
    expect(
      checkLanRequest({ ...good, origin: "http://192.168.1.23:5301" }, lan),
    ).toBeNull();
    expect(
      checkLanRequest({ ...good, remoteAddress: "::ffff:192.168.1.50" }, lan),
    ).toBeNull();
  });
  it("401 for a missing or wrong token", () => {
    expect(checkLanRequest({ ...good, token: undefined }, lan)?.status).toBe(
      401,
    );
    expect(checkLanRequest({ ...good, token: "nope" }, lan)?.status).toBe(401);
    expect(checkLanRequest({ ...good, token: ["tok-ok"] }, lan)?.status).toBe(
      401,
    );
  });
  it("403 for a public address, even with the token", () => {
    for (const remoteAddress of [
      "8.8.8.8",
      "::ffff:8.8.8.8",
      "2001:db8::1",
      undefined,
    ])
      expect(checkLanRequest({ ...good, remoteAddress }, lan)?.status).toBe(
        403,
      );
  });
  it("403 for a wrong Host", () => {
    for (const host of [
      undefined,
      "192.168.1.23",
      "192.168.1.23:5302",
      "127.0.0.1:5301",
      "localhost:5301",
      "evil.example:5301",
    ])
      expect(checkLanRequest({ ...good, host }, lan)?.status).toBe(403);
  });
  it("403 for a wrong Origin", () => {
    for (const origin of [
      "http://evil.example",
      "http://192.168.1.23:5302",
      "https://192.168.1.23:5301",
      "http://127.0.0.1:5301",
      "null",
    ])
      expect(checkLanRequest({ ...good, origin }, lan)?.status).toBe(403);
  });
  it("403 wins over 401 when both fail", () => {
    expect(
      checkLanRequest({ ...good, token: undefined, host: "x:1" }, lan)?.status,
    ).toBe(403);
  });
});

describe("LAN middleware over HTTP", () => {
  let dir: string;
  let file: string;
  let server: Server;
  let cfg: LanConfig;
  const valid = {
    round: "round-001",
    component: "card",
    level: "component",
    shown: ["a", "b"],
    pick: "a",
    tags: [],
    reason: "ok",
    theme: "light",
  };

  beforeEach(async () => {
    dir = mkdtempSync(join(tmpdir(), "taste-lan-"));
    file = join(dir, "taste.jsonl");
    server = createServer((req, res) => {
      createTasteMiddleware(file, () => cfg)(req, res, () => {
        res.statusCode = 404;
        res.end();
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    // The socket is loopback, so the address check passes. Host is sent by hand.
    cfg = {
      address: "192.168.1.23",
      port: (server.address() as AddressInfo).port,
      token: newToken(),
    };
  });
  afterEach(async () => {
    await new Promise<void>((r) => server.close(() => r()));
    rmSync(dir, { recursive: true, force: true });
  });

  function call(
    method: string,
    headers: Record<string, string>,
    body?: string,
  ): Promise<number> {
    return new Promise((resolve, reject) => {
      const req = request(
        {
          host: "127.0.0.1",
          port: cfg.port,
          path: "/api/taste",
          method,
          headers,
        },
        (res) => {
          res.resume();
          res.on("end", () => resolve(res.statusCode ?? 0));
        },
      );
      req.on("error", reject);
      req.end(body);
    });
  }
  const host = () => `${cfg.address}:${cfg.port}`;
  const json = { "content-type": "application/json" };

  it("GET: 401 without or with a wrong token, 200 with the token", async () => {
    expect(await call("GET", { host: host() })).toBe(401);
    expect(await call("GET", { host: host(), [TOKEN_HEADER]: "wrong" })).toBe(
      401,
    );
    expect(
      await call("GET", { host: host(), "x-taste-token": cfg.token }),
    ).toBe(200);
  });

  it("GET: 403 for a wrong Host or Origin even with the token", async () => {
    const t = { "x-taste-token": cfg.token };
    expect(await call("GET", { host: "127.0.0.1:1", ...t })).toBe(403);
    expect(
      await call("GET", { host: host(), origin: "http://evil.example", ...t }),
    ).toBe(403);
  });

  it("POST: 201 with the token and a matching Origin, nothing stored otherwise", async () => {
    const t = { "x-taste-token": cfg.token };
    expect(
      await call("POST", { host: host(), ...json }, JSON.stringify(valid)),
    ).toBe(401);
    expect(
      await call(
        "POST",
        { host: "evil.example", ...json, ...t },
        JSON.stringify(valid),
      ),
    ).toBe(403);
    expect(
      await call(
        "POST",
        { host: host(), origin: "http://evil.example", ...json, ...t },
        JSON.stringify(valid),
      ),
    ).toBe(403);
    expect(
      await call(
        "POST",
        { host: host(), origin: `http://${host()}`, ...json, ...t },
        JSON.stringify(valid),
      ),
    ).toBe(201);
    expect(readFileSync(file, "utf8").trim().split("\n")).toHaveLength(1);
  });

  it("POST: content type, size and validation rules still apply", async () => {
    const h = { host: host(), "x-taste-token": cfg.token };
    expect(
      await call(
        "POST",
        { ...h, "content-type": "text/plain" },
        JSON.stringify(valid),
      ),
    ).toBe(403);
    expect(
      await call(
        "POST",
        { ...h, ...json },
        JSON.stringify({ ...valid, pick: "zzz" }),
      ),
    ).toBe(400);
    expect(
      await call(
        "POST",
        { ...h, ...json },
        JSON.stringify({ ...valid, reason: "x".repeat(40_000) }),
      ),
    ).toBe(413);
  });

  it("loopback mode is unchanged: no token needed, and a token changes nothing", async () => {
    const loop = createServer((req, res) => {
      createTasteMiddleware(file, () => undefined)(req, res, () => res.end());
    });
    await new Promise<void>((r) => loop.listen(0, "127.0.0.1", r));
    const p = (loop.address() as AddressInfo).port;
    const get = (h: Record<string, string>) =>
      new Promise<number>((resolve, reject) => {
        const req = request(
          { host: "127.0.0.1", port: p, path: "/api/taste", headers: h },
          (res) => {
            res.resume();
            res.on("end", () => resolve(res.statusCode ?? 0));
          },
        );
        req.on("error", reject);
        req.end();
      });
    try {
      expect(await get({})).toBe(200);
      expect(await get({ "x-taste-token": "anything" })).toBe(200);
      expect(await get({ host: "192.168.1.23" })).toBe(403);
    } finally {
      await new Promise<void>((r) => loop.close(() => r()));
    }
  });
});

describe("serve --lan", () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "taste-lan-serve-"));
  });
  afterEach(() => rmSync(tmp, { recursive: true, force: true }));

  it("binds the chosen address, prints the token only in the URL, guards the API", async () => {
    const { serve } = await import("../cli/serve");
    const { getLan } = await import("../server/lan");
    const dir = join(tmp, ".taste-lab");
    initDataDir(dir);
    const port = await pickPort({ start: 5450 });
    const before = process.env.TASTE_LAB_DIR;
    const {
      server,
      url,
      lan: info,
    } = await serve(dir, port, {
      host: "127.0.0.2",
    });
    try {
      const token = new URL(url).searchParams.get("k") as string;
      expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
      expect(url).toBe(`http://127.0.0.2:${port}/?k=${token}`);
      expect(info?.address).toBe("127.0.0.2");
      // Static assets work without the token. The API does not.
      const base = `http://127.0.0.2:${port}`;
      expect((await fetch(`${base}/`)).status).toBe(200);
      expect((await fetch(`${base}/api/taste`)).status).toBe(401);
      const ok = await fetch(`${base}/api/taste`, {
        headers: { "x-taste-token": token },
      });
      expect(ok.status).toBe(200);
      // Not bound to loopback 127.0.0.1.
      await expect(fetch(`http://127.0.0.1:${port}/`)).rejects.toThrow();
      // The token is in memory only: not in the data dir.
      expect(JSON.stringify(getLan())).toContain(token);
      expect(readFileSync(join(dir, "config.json"), "utf8")).not.toContain(
        token,
      );
    } finally {
      await server.close();
      const { setLan } = await import("../server/lan");
      setLan(undefined);
      if (before === undefined) delete process.env.TASTE_LAB_DIR;
      else process.env.TASTE_LAB_DIR = before;
    }
  });

  it("fails clearly when no private address exists", async () => {
    const { serve } = await import("../cli/serve");
    const dir = join(tmp, ".taste-lab");
    initDataDir(dir);
    await expect(
      serve(dir, 5499, { ifaces: { lo: [] }, defaultIface: undefined }),
    ).rejects.toThrow("--host");
  });
});

describe("app token helpers", () => {
  const memory = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
    };
  };

  it("stores k and returns the address without it", () => {
    const s = memory();
    const r = captureToken(
      "http://192.168.1.23:5301/?k=abc_-123#/round/round-002",
      s,
    );
    expect(r).toEqual({ token: "abc_-123", cleanUrl: "/#/round/round-002" });
    expect(s.getItem(TOKEN_KEY)).toBe("abc_-123");
  });

  it("keeps other query parameters", () => {
    const r = captureToken("http://h:1/?a=1&k=t&b=2", memory());
    expect(r?.cleanUrl).toBe("/?a=1&b=2");
  });

  it("does nothing without k, so a stored token survives a reload", () => {
    const s = memory();
    s.setItem(TOKEN_KEY, "old");
    expect(captureToken("http://h:1/", s)).toBeNull();
    expect(captureToken("http://h:1/?k=", s)).toBeNull();
    expect(s.getItem(TOKEN_KEY)).toBe("old");
  });

  it("sends the header only when a token is stored", () => {
    const s = memory();
    expect(tokenHeaders(s)).toEqual({});
    s.setItem(TOKEN_KEY, "t0k");
    expect(tokenHeaders(s)).toEqual({ "X-Taste-Token": "t0k" });
  });

  it("survives blocked storage", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(captureToken("http://h:1/?k=t", broken)?.token).toBe("t");
    expect(tokenHeaders(broken)).toEqual({});
  });
});
