// Ephemeral UI only: never persist the URL or its encoded modules.
import { stripVTControlCharacters } from "node:util";
import encodeQR from "qr";
import type { TasteComponent, TasteTheme, Truncate } from "./pi-api.ts";

export function qrLines(url: string): string[] {
  const matrix = encodeQR(url, "raw", { ecc: "medium", border: 4 });
  const lines: string[] = [];
  for (let y = 0; y < matrix.length; y += 2) {
    let row = "";
    for (let x = 0; x < matrix.length; x++) {
      const top = matrix[y][x];
      const bottom = matrix[y + 1]?.[x] ?? false;
      row += top ? (bottom ? "█" : "▀") : bottom ? "▄" : " ";
    }
    // Fixed black on white keeps the quiet zone readable in any pi theme.
    lines.push(`\x1b[30;107m${row}\x1b[0m`);
  }
  return lines;
}

export function qrComponent(
  url: string,
  theme: TasteTheme,
  truncate: Truncate,
  close: (data: string) => void,
): TasteComponent {
  const lines = qrLines(url);
  const size = stripVTControlCharacters(lines[0]).length;
  return {
    render(width) {
      const heading = theme.fg(
        "accent",
        "taste.lab · scan to open on your LAN",
      );
      const hint = theme.fg(
        "dim",
        "Enter or Esc to close. Keep this code private.",
      );
      return [
        truncate(heading, width),
        ...(width >= size
          ? lines
          : [
              truncate(`Widen the terminal to ${size} columns to scan.`, width),
            ]),
        truncate(hint, width),
      ];
    },
    invalidate() {},
    handleInput: close,
  };
}
