// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { tasks } from "../examples/demo/.taste-lab/fixtures";
import * as Detail from "../examples/demo/.taste-lab/library/task-detail-screen/examples";
import * as List from "../examples/demo/.taste-lab/library/task-list-screen/examples";
import { click, mount, one, type, unmountAll } from "./dom";

afterEach(unmountAll);
function button(host: HTMLElement, label: string) {
  const found = [...host.querySelectorAll("button")].find(
    (el) => el.textContent === label,
  );
  if (!found) throw new Error(`Missing button: ${label}`);
  return found;
}
describe.each([
  ["list", List],
  ["detail", Detail],
] as const)("%s demo screen", (_name, examples) => {
  it.each(["Default", "Compact"] as const)(
    "%s renders the full fixture and supports local search/filter/edit/cancel/save/reset",
    async (preset) => {
      const before = JSON.stringify(tasks);
      const Example = examples[preset];
      const host = await mount(<Example />);
      expect(host.textContent).toContain(
        `${tasks.length} of ${tasks.length} tasks`,
      );
      await type(
        one<HTMLInputElement>(host, '[aria-label="Search tasks"]'),
        "zz-no-match",
      );
      expect(host.textContent).toContain("No matching tasks.");
      await click(button(host, "Clear filters"));
      await click(button(host, "Open"));
      expect(host.textContent).toContain(
        `${tasks.filter((t) => t.status !== "done").length} of ${tasks.length} tasks`,
      );
      await click(button(host, "All"));
      await click(button(host, `Edit ${tasks[0]?.id}`));
      const original = one<HTMLInputElement>(host, "form input").value;
      await type(one<HTMLInputElement>(host, "form input"), "Discard this");
      await click(button(host, "Cancel"));
      expect(host.textContent).not.toContain("Discard this");
      await click(button(host, `Edit ${tasks[0]?.id}`));
      expect(one<HTMLInputElement>(host, "form input").value).toBe(original);
      await type(one<HTMLInputElement>(host, "form input"), "Saved task title");
      await click(button(host, "Save locally"));
      expect(host.textContent).toContain("Saved task title");
      expect(host.textContent).toContain(`Saved ${tasks[0]?.id} locally`);
      await click(button(host, "Reset"));
      expect(host.textContent).not.toContain("Saved task title");
      expect(JSON.stringify(tasks)).toBe(before);
    },
  );
  it.each(["Loading", "Empty", "Error"] as const)(
    "%s recovers to the sample without a backend",
    async (preset) => {
      const Example = examples[preset];
      const host = await mount(<Example />);
      expect(host.querySelector('[aria-label="Search tasks"]')).toBeNull();
      await click(
        button(host, preset === "Error" ? "Retry" : "Show sample tasks"),
      );
      expect(host.querySelector('[aria-label="Search tasks"]')).not.toBeNull();
      expect(host.textContent).toContain(
        `${tasks.length} of ${tasks.length} tasks`,
      );
    },
  );
});
