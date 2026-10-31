import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stripVTControlCharacters } from "node:util";
import decodeQR from "qr/decode.js";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import type { ReadyEvent } from "../pi/lib/events";
import {
  answerDetails,
  answerText,
  modelMessage,
  startedDetails,
  startedText,
} from "../pi/lib/messages";
import type { TasteTheme } from "../pi/lib/pi-api";
import {
  labName,
  lineComponent,
  progressText,
  themedStatus,
  transcriptComponent,
  widgetLines,
} from "../pi/lib/presentation";
import { qrComponent, qrLines } from "../pi/lib/qr";
import type { TasteEntry } from "../src/lib/taste";

const tmp = mkdtempSync(join(tmpdir(), "taste-presentation-"));
afterEach(() => rmSync(join(tmp, "data"), { recursive: true, force: true }));
afterAll(() => rmSync(tmp, { recursive: true, force: true }));
const dataDir = join(tmp, "data");
const ready: ReadyEvent = {
  event: "ready",
  port: 5301,
  dataDir,
  local: "http://127.0.0.1:5301/",
  lan: "http://192.168.1.23:5301/?k=secret_token_for_test_123",
};
const theme: TasteTheme = {
  fg: (color, text) => `<${color}>${text}</${color}>`,
};
const truncate = vi.fn((text: string, width: number) => text.slice(0, width));
const entry: TasteEntry = {
  ts: "2026-10-29T10:00:00.000Z",
  round: "round-018",
  component: "task card",
  level: "component",
  shown: ["a", "b"],
  pick: "b",
  tags: [],
  reason: "quiet; less noise",
  theme: "dark",
};

function round() {
  mkdirSync(join(dataDir, "rounds", "round-018"), { recursive: true });
  writeFileSync(
    join(dataDir, "rounds", "round-018", "round.json"),
    JSON.stringify({ variants: [{ id: "b", label: "Soft outline" }] }),
  );
}

describe("taste.lab presentation", () => {
  it("uses semantic colors, three or four widget lines and short status", () => {
    const lines = widgetLines(
      ready,
      "My app",
      "round-018 open · 17 of 18 answered",
      theme,
    );
    expect(lines).toEqual([
      "<accent>taste.lab</accent> · My app",
      `<dim>local</dim> <mdLink>${ready.local}</mdLink>`,
      `<dim>LAN  </dim> <mdLink>${ready.lan}</mdLink>`,
      "<dim>round-018 open · 17 of 18 answered</dim>",
    ]);
    expect(
      widgetLines({ ...ready, lan: null }, "My app", "all answered", theme),
    ).toHaveLength(3);
    expect(themedStatus(ready, theme)).toBe(
      "<accent>taste.lab</accent> <dim>:5301 LAN</dim>",
    );
    expect(themedStatus({ ...ready, lan: null }, theme)).toBe(
      "<accent>taste.lab</accent> <dim>:5301</dim>",
    );
  });

  it("reads the name with a parent-folder fallback and tolerates empty or broken files", () => {
    mkdirSync(dataDir);
    expect(labName(dataDir)).toBe(tmp.split("/").at(-1));
    writeFileSync(join(dataDir, "config.json"), '{"name":"  My app\\nDemo "}');
    expect(labName(dataDir)).toBe("My app Demo");
    expect(progressText(dataDir, new Set())).toBe("rounds unavailable");
    mkdirSync(join(dataDir, "rounds"));
    expect(progressText(dataDir, new Set())).toBe("no rounds yet");
    round();
    writeFileSync(
      join(dataDir, "taste.jsonl"),
      `broken\n${JSON.stringify(entry)}\n${JSON.stringify(entry)}\n`,
    );
    expect(progressText(dataDir, new Set())).toBe("all answered");
  });

  it("renders labels and quoted reasons, preserves safe content and handles special picks", () => {
    round();
    const message = modelMessage({
      customType: "taste-lab-answer",
      content: answerText(entry, dataDir),
      details: answerDetails(entry, dataDir),
      display: true,
    });
    const before = JSON.stringify(message);
    const component = transcriptComponent(message, theme, truncate);
    expect(component.render(500)[0]).toBe(
      ' <accent>· taste.lab</accent> <accent>round-018</accent> <dim>task card</dim> · <success>b</success> · Soft outline <dim>"quiet; less noise"</dim>'.trim(),
    );
    expect(JSON.stringify(message)).toBe(before);
    for (const pick of ["none", "mix"]) {
      const special = { ...entry, pick, reason: "a header, b body" };
      expect(
        transcriptComponent(
          {
            ...message,
            content: answerText(special, dataDir),
            details: answerDetails(special, dataDir),
          },
          theme,
          truncate,
        ).render(500)[0],
      ).toContain(`<success>${pick}</success> <dim>"a header, b body"</dim>`);
    }
    writeFileSync(join(dataDir, "rounds", "round-018", "round.json"), "broken");
    expect(
      transcriptComponent(message, theme, truncate).render(500)[0],
    ).not.toContain("Soft outline");
  });

  it("themes started and legacy messages and re-renders after theme invalidation", () => {
    const info = { dataDir, port: 5301, lan: true };
    const message = {
      customType: "taste-lab",
      content: startedText(info),
      details: startedDetails(info),
      display: true,
    };
    const component = transcriptComponent(message, theme, truncate);
    expect(component.render(500)[0]).toBe(
      `<accent>· taste.lab</accent> <dim>started</dim> ${dataDir} <dim>:5301</dim>`,
    );
    expect(
      transcriptComponent(
        { ...message, details: undefined },
        theme,
        truncate,
      ).render(500)[0],
    ).toContain("taste-lab is running");
    let appearance = "dark";
    const changingTheme = {
      fg: (_color: string, text: string) => `${appearance}:${text}`,
    };
    const invalidate = vi.fn();
    const widget = lineComponent(
      () => widgetLines(ready, "App", "all answered", changingTheme),
      truncate,
      invalidate,
    );
    expect(widget.render(200)[0]).toContain("dark:taste.lab");
    appearance = "light";
    widget.invalidate();
    expect(invalidate).toHaveBeenCalledOnce();
    expect(widget.render(200)[0]).toContain("light:taste.lab");
    widget.render(12);
    expect(truncate).toHaveBeenCalledWith(expect.any(String), 12);
  });
});

describe("LAN QR", () => {
  it("encodes a scannable half-block QR with a four-module quiet zone", () => {
    const url = ready.lan as string;
    const lines = qrLines(url).map(stripVTControlCharacters);
    const size = lines[0].length;
    expect(lines.slice(0, 2).every((line) => line === " ".repeat(size))).toBe(
      true,
    );
    const scale = 4;
    const width = size * scale;
    const height = lines.length * 2 * scale;
    const data = new Uint8Array(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const cell = lines[Math.floor(y / (2 * scale))][Math.floor(x / scale)];
        const upper = Math.floor(y / scale) % 2 === 0;
        const black = cell === "█" || (upper ? cell === "▀" : cell === "▄");
        const offset = (y * width + x) * 4;
        data.fill(black ? 0 : 255, offset, offset + 3);
        data[offset + 3] = 255;
      }
    }
    expect(decodeQR({ width, height, data })).toBe(url);
    expect(lines.join("\n")).not.toContain("secret_token");
  });

  it("never clips a QR at narrow widths and forwards close input", () => {
    const close = vi.fn();
    const qr = qrComponent(ready.lan as string, theme, truncate, close);
    const narrow = qr.render(30);
    expect(narrow.join("\n")).toContain("Widen the terminal");
    expect(narrow.join("\n")).not.toMatch(/[▀▄]/);
    qr.invalidate();
    expect(qr.render(100).join("\n")).toMatch(/[▀▄]/);
    qr.handleInput?.("\x1b");
    expect(close).toHaveBeenCalledWith("\x1b");
  });
});
