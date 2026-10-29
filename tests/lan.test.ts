import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import {
  createServer,
  type IncomingHttpHeaders,
  request,
  type Server,
} from "node:http";
import type { AddressInfo } from "node:net";
import type { NetworkInterfaceInfo } from "node:os";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inspect } from "node:util";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { parseCli, UsageError } from "../cli/args";
import { initDataDir } from "../cli/init";
import { run } from "../cli/main";
import { pickPort } from "../cli/port";
import {
  checkLanRequest,
  cookieName,
  cookieValues,
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
import {
  gateDecision,
  installLanGate,
  LAN_PLUGIN,
  lanGate,
  lanSettingsOf,
} from "../server/lan-gate";
import { createTasteMiddleware } from "../server/taste-log";

type Reply = { status: number; headers: IncomingHttpHeaders; body: string };

/** One raw HTTP request, so Host, Origin and Cookie can be set by hand. */
function http(
  port: number,
  path: string,
  headers: Record<string, string> = {},
  opts: { method?: string; body?: string; address?: string } = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const req = request(
      {
        host: opts.address ?? "127.0.0.1",
        port,
        path,
        method: opts.method ?? "GET",
        headers,
      },
      (res) => {
        let body = "";
        res.setEncoding("utf8");
        res.on("data", (c) => {
          body += c;
        });
        res.on("end", () =>
          resolve({ status: res.statusCode ?? 0, headers: res.headers, body }),
        );
      },
    );
    req.on("error", reject);
    req.end(opts.body);
  });
}

/** A WebSocket handshake. Resolves with 101 on upgrade, else the HTTP status. */
function upgrade(
  port: number,
  path: string,
  headers: Record<string, string>,
  address = "127.0.0.1",
): Promise<number> {
  return new Promise((resolve, reject) => {
    const req = request({
      host: address,
      port,
      path,
      headers: {
        connection: "Upgrade",
        upgrade: "websocket",
        "sec-websocket-version": "13",
        "sec-websocket-key": "dGhlIHNhbXBsZSBub25jZQ==",
        ...headers,
      },
    });
    req.on("upgrade", (_res, socket) => {
      socket.destroy();
      resolve(101);
    });
    req.on("response", (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    });
    req.on("error", reject);
    req.end();
  });
}

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
  it("needs mask 0 too: a 0.0.0.0/8 route is not the default", () => {
    const text = [
      header,
      "virbr9\t00000000\t00000000\t0001\t0\t0\t0\t000000FF\t0\t0\t0",
      "wlp10s0\t00000000\t0101A8C0\t0003\t0\t0\t600\t00000000\t0\t0\t0",
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
const cookie = `${cookieName(5301)}=tok-ok`;
const good = {
  remoteAddress: "192.168.1.50",
  host: "192.168.1.23:5301",
  origin: undefined as string | undefined,
  cookie: cookie as string | undefined,
};

describe("cookieValues", () => {
  it("finds every value of one name", () => {
    expect(
      cookieValues("a=1; taste_lab_5301=x; b=2", "taste_lab_5301"),
    ).toEqual(["x"]);
    expect(
      cookieValues("taste_lab_5301=x;taste_lab_5301=y", "taste_lab_5301"),
    ).toEqual(["x", "y"]);
    expect(cookieValues("taste_lab_53010=x", "taste_lab_5301")).toEqual([]);
    expect(cookieValues(undefined, "taste_lab_5301")).toEqual([]);
    expect(cookieValues("junk", "taste_lab_5301")).toEqual([]);
  });
});

describe("checkLanRequest matrix", () => {
  it("allows a good request, with or without a matching Origin", () => {
    expect(checkLanRequest(good, lan)).toBeNull();
    expect(
      checkLanRequest({ ...good, origin: "http://192.168.1.23:5301" }, lan),
    ).toBeNull();
    expect(
      checkLanRequest({ ...good, remoteAddress: "::ffff:192.168.1.50" }, lan),
    ).toBeNull();
    expect(
      checkLanRequest({ ...good, cookie: `x=1; ${cookie}; y=2` }, lan),
    ).toBeNull();
    // A stale cookie next to the right one still passes.
    expect(
      checkLanRequest(
        { ...good, cookie: `${cookieName(5301)}=old; ${cookie}` },
        lan,
      ),
    ).toBeNull();
  });
  it("401 for a missing or wrong cookie", () => {
    for (const c of [
      undefined,
      "",
      `${cookieName(5301)}=nope`,
      `${cookieName(5302)}=tok-ok`, // another server's cookie
      "tok-ok",
    ])
      expect(checkLanRequest({ ...good, cookie: c }, lan)?.status).toBe(401);
  });
  it("403 for a public address, even with the cookie", () => {
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
      checkLanRequest({ ...good, cookie: undefined, host: "x:1" }, lan)?.status,
    ).toBe(403);
  });
});

describe("gateDecision", () => {
  const req = (url: string, extra: Partial<typeof good> = {}) => ({
    ...good,
    cookie: undefined,
    url,
    ...extra,
  });

  it("swaps ?k= for a cookie and a redirect without k", () => {
    expect(gateDecision(req("/?k=tok-ok"), lan)).toEqual({
      action: "redirect",
      location: "/",
      setCookie: `${cookieName(5301)}=tok-ok; HttpOnly; SameSite=Strict; Path=/`,
    });
    const d = gateDecision(req("/a/b?raw&k=tok-ok&import#x"), lan);
    expect(d).toMatchObject({
      action: "redirect",
      location: "/a/b?raw&import#x",
    });
    expect(gateDecision(req("/?k=tok%2Dok"), lan)).toMatchObject({
      action: "redirect",
    });
  });

  it("never redirects off the server", () => {
    expect(gateDecision(req("//evil.example/?k=tok-ok"), lan)).toMatchObject({
      action: "redirect",
      location: "/",
    });
  });

  it("falls back to / for a redirect target that could leave the origin", () => {
    for (const url of [
      "/\\evil.example/?k=tok-ok",
      "/\\/evil.example/?k=tok-ok",
      "//evil.example/?k=tok-ok",
      "/a\\b?k=tok-ok",
      "/a\tb?k=tok-ok",
      "/a\nb?k=tok-ok",
      "/a\u007fb?k=tok-ok",
      "/?x=\\&k=tok-ok",
      "http://evil.example/?k=tok-ok",
      "evil.example/?k=tok-ok",
      "?k=tok-ok",
    ]) {
      expect(gateDecision(req(url), lan), JSON.stringify(url)).toMatchObject({
        action: "redirect",
        location: "/",
      });
    }
    // Every redirect target stays on the server's own origin.
    for (const url of [
      "/a/b?k=tok-ok",
      "/%5Cx?k=tok-ok",
      "/a?q=//x&k=tok-ok",
    ]) {
      const d = gateDecision(req(url), lan);
      if (d.action !== "redirect") throw new Error("expected redirect");
      expect(new URL(d.location, "http://h.test").origin).toBe("http://h.test");
    }
  });

  it("401 for a wrong or doubled k, even with a good cookie", () => {
    for (const url of ["/?k=nope", "/?k=", "/?k=tok-ok&k=tok-ok", "/?k"])
      expect(gateDecision(req(url, { cookie }), lan)).toMatchObject({
        action: "deny",
        status: 401,
      });
  });

  it("403 before the token: bad Host with a good k", () => {
    expect(
      gateDecision(req("/?k=tok-ok", { host: "evil.example" }), lan),
    ).toMatchObject({ action: "deny", status: 403 });
  });

  it("passes with the cookie, 401 without, for every path", () => {
    for (const url of [
      "/",
      "/src/main.tsx",
      "/@fs/tmp/x/.taste-lab/taste.jsonl",
      "/api/taste",
      "/?token=vite-ws",
    ]) {
      expect(gateDecision(req(url, { cookie }), lan)).toEqual({
        action: "pass",
      });
      expect(gateDecision(req(url), lan)).toMatchObject({
        action: "deny",
        status: 401,
      });
    }
  });
});

describe("lanGate plugin", () => {
  it("freezes its own copy of the settings, found by name", () => {
    const cfg = { ...lan };
    const plugin = lanGate(cfg);
    cfg.token = "changed";
    const found = lanSettingsOf([{ name: "other" }, plugin]);
    expect(found).toEqual(lan);
    expect(Object.isFrozen(found)).toBe(true);
    expect(plugin.name).toBe(LAN_PLUGIN);
    expect(lanSettingsOf([{ name: "other" }])).toBeUndefined();
    // Vite's config debug log prints plugin objects with util.inspect.
    expect(inspect(plugin, { depth: 10 })).not.toContain("tok-ok");
  });
});

describe("LAN gate over HTTP", () => {
  let server: Server;
  let cfg: LanConfig;
  let seen: string[];
  let upgrades: string[];

  beforeEach(async () => {
    seen = [];
    upgrades = [];
    // Stands in for Vite: a request handler and an HMR upgrade listener.
    server = createServer((req, res) => {
      seen.push(req.url ?? "");
      res.end("inner");
    });
    server.on("upgrade", (req, socket) => {
      upgrades.push(req.url ?? "");
      socket.end(
        "HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n",
      );
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    // The socket is loopback, so the address check passes. Host is sent by hand.
    cfg = {
      address: "127.0.0.1",
      port: (server.address() as AddressInfo).port,
      token: newToken(),
    };
    installLanGate(server, cfg);
  });
  afterEach(async () => {
    await new Promise<void>((r) => server.close(() => r()));
  });

  const host = () => ({ host: `127.0.0.1:${cfg.port}` });
  const jar = () => ({ cookie: `${cookieName(cfg.port)}=${cfg.token}` });

  it("401 page without the cookie, and the inner handler never runs", async () => {
    const r = await http(cfg.port, "/", host());
    expect(r.status).toBe(401);
    expect(r.headers["content-type"]).toContain("text/html");
    expect(r.body).toContain("Open the link printed by");
    const api = await http(cfg.port, "/api/taste", host());
    expect(api.status).toBe(401);
    expect(JSON.parse(api.body).error).toContain("taste-lab serve --lan");
    expect(seen).toEqual([]);
  });

  it("?k= sets the cookie and redirects. The inner handler never sees k", async () => {
    const r = await http(cfg.port, `/x?a=1&k=${cfg.token}`, host());
    expect(r.status).toBe(302);
    expect(r.headers.location).toBe("/x?a=1");
    expect(r.headers["set-cookie"]).toEqual([
      `${cookieName(cfg.port)}=${cfg.token}; HttpOnly; SameSite=Strict; Path=/`,
    ]);
    const ok = await http(cfg.port, "/x?a=1", { ...host(), ...jar() });
    expect(ok.status).toBe(200);
    expect(ok.body).toBe("inner");
    expect(await http(cfg.port, "/?k=wrong", host())).toMatchObject({
      status: 401,
    });
    expect(seen).toEqual(["/x?a=1"]);
    expect(seen.join("")).not.toContain(cfg.token);
  });

  it("403 for a wrong Host or Origin, even with the cookie", async () => {
    expect(
      (await http(cfg.port, "/", { host: "evil.example", ...jar() })).status,
    ).toBe(403);
    expect(
      (
        await http(cfg.port, "/", {
          ...host(),
          origin: "http://evil.example",
          ...jar(),
        })
      ).status,
    ).toBe(403);
    expect(seen).toEqual([]);
  });

  it("gates the WebSocket upgrade by Host and cookie", async () => {
    expect(await upgrade(cfg.port, "/?token=v", host())).toBe(401);
    expect(
      await upgrade(cfg.port, "/?token=v", { host: "evil.example", ...jar() }),
    ).toBe(403);
    expect(
      await upgrade(cfg.port, `/?k=${cfg.token}`, { ...host(), ...jar() }),
    ).toBe(401);
    expect(upgrades).toEqual([]);
    expect(await upgrade(cfg.port, "/?token=v", { ...host(), ...jar() })).toBe(
      101,
    );
    expect(upgrades).toEqual(["/?token=v"]);
  });
});

describe("LAN taste API over HTTP", () => {
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
      createTasteMiddleware(file, cfg)(req, res, () => {
        res.statusCode = 404;
        res.end();
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
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

  const call = async (
    method: string,
    headers: Record<string, string>,
    body?: string,
  ) => (await http(cfg.port, "/api/taste", headers, { method, body })).status;
  const host = () => `${cfg.address}:${cfg.port}`;
  const jar = () => ({ cookie: `${cookieName(cfg.port)}=${cfg.token}` });
  const json = { "content-type": "application/json" };

  it("checks the cookie itself, not only behind the gate", async () => {
    expect(await call("GET", { host: host() })).toBe(401);
    expect(
      await call("GET", { host: host(), "x-taste-token": cfg.token }),
    ).toBe(401);
    expect(await call("GET", { host: host(), ...jar() })).toBe(200);
    expect(await call("GET", { host: "127.0.0.1:1", ...jar() })).toBe(403);
  });

  it("POST: 201 with the cookie and a matching Origin, rules still apply", async () => {
    const body = JSON.stringify(valid);
    expect(await call("POST", { host: host(), ...json }, body)).toBe(401);
    expect(
      await call(
        "POST",
        { host: host(), origin: "http://evil.example", ...json, ...jar() },
        body,
      ),
    ).toBe(403);
    expect(
      await call(
        "POST",
        { host: host(), origin: `http://${host()}`, ...json, ...jar() },
        body,
      ),
    ).toBe(201);
    const h = { host: host(), ...jar() };
    expect(
      await call("POST", { ...h, "content-type": "text/plain" }, body),
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
    expect(readFileSync(file, "utf8").trim().split("\n")).toHaveLength(1);
  });

  it("loopback mode is unchanged: no token needed, a cookie changes nothing", async () => {
    const loop = createServer((req, res) => {
      createTasteMiddleware(file)(req, res, () => res.end());
    });
    await new Promise<void>((r) => loop.listen(0, "127.0.0.1", r));
    const p = (loop.address() as AddressInfo).port;
    try {
      expect((await http(p, "/api/taste")).status).toBe(200);
      expect((await http(p, "/api/taste", jar())).status).toBe(200);
      expect(
        (await http(p, "/api/taste", { host: "192.168.1.23" })).status,
      ).toBe(403);
    } finally {
      await new Promise<void>((r) => loop.close(() => r()));
    }
  });
});

describe("serve --lan", () => {
  let tmp: string;
  let before: string | undefined;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "taste-lan-serve-"));
    before = process.env.TASTE_LAB_DIR;
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
    if (before === undefined) delete process.env.TASTE_LAB_DIR;
    else process.env.TASTE_LAB_DIR = before;
  });

  it("gates every path with the cookie, denies the log file, keeps loopback servers apart", async () => {
    const { serve } = await import("../cli/serve");
    const dir = join(tmp, ".taste-lab");
    initDataDir(dir);
    writeFileSync(join(dir, "taste.jsonl"), '{"secret":"log"}\n');
    // A loopback server first. Starting a LAN server must not change it.
    const loopPort = await pickPort({ start: 5440 });
    const loop = await serve(dir, loopPort);
    const port = await pickPort({ start: loopPort + 1 });
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

      const at = { address: "127.0.0.2" };
      const host = { host: `127.0.0.2:${port}` };
      const jar = { ...host, cookie: `${cookieName(port)}=${token}` };
      const get = async (path: string, h: Record<string, string>) =>
        (await http(port, path, h, at)).status;
      const fsLog = `/@fs${dir}/taste.jsonl`;

      const link = await http(port, `/?k=${token}`, host, at);
      expect(link.status).toBe(302);
      expect(link.headers.location).toBe("/");
      expect(String(link.headers["set-cookie"])).toContain("HttpOnly");

      for (const path of ["/", "/src/main.tsx", "/api/taste", fsLog])
        expect([path, await get(path, host)]).toEqual([path, 401]);
      expect(await get("/", jar)).toBe(200);
      expect(await get("/src/main.tsx", jar)).toBe(200);
      expect(await get("/api/taste", jar)).toBe(200);
      // fs.deny: the log is not a file Vite serves, not even with the cookie.
      for (const path of [fsLog, `${fsLog}?raw&import`, `${fsLog}?import`]) {
        const r = await http(port, path, jar, at);
        expect([path, r.status]).toEqual([path, 403]);
        expect(r.body).not.toContain("secret");
      }
      // HMR: Vite's own listener runs only behind the gate.
      const hmr = { "sec-websocket-protocol": "vite-hmr" };
      expect(await upgrade(port, "/", { ...host, ...hmr }, "127.0.0.2")).toBe(
        401,
      );
      expect(await upgrade(port, "/", { ...jar, ...hmr }, "127.0.0.2")).toBe(
        101,
      );
      // Not bound to loopback 127.0.0.1.
      await expect(http(port, "/")).rejects.toThrow();

      // The loopback server still needs no token, and still denies the file.
      expect((await http(loopPort, "/api/taste")).status).toBe(200);
      expect((await http(loopPort, fsLog)).status).toBe(403);
      expect(readFileSync(join(dir, "config.json"), "utf8")).not.toContain(
        token,
      );
    } finally {
      await server.close();
      await loop.server.close();
    }
  }, 30_000);

  it("fails clearly when no private address exists", async () => {
    const { serve } = await import("../cli/serve");
    const dir = join(tmp, ".taste-lab");
    initDataDir(dir);
    await expect(
      serve(dir, 5499, { ifaces: { lo: [] }, defaultIface: undefined }),
    ).rejects.toThrow("--host");
  });
});
