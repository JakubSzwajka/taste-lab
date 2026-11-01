// The taste_lab tool: lets an agent start, check and stop the same lab that
// /taste runs. Its text goes to the model, so it is built from named fields
// and scrubbed like every other model message. It never carries a link.
import { type LabInfo, scrubSecrets } from "./messages.ts";

export const TOOL_NAME = "taste_lab";
export const TOOL_ACTIONS = ["start", "status", "stop"] as const;
export type ToolAction = (typeof TOOL_ACTIONS)[number];

export type TasteToolParams = {
  action: ToolAction;
  /** Serve on 127.0.0.1 only, no LAN link. Start only. */
  local?: boolean;
  /** Data dir. Defaults to `<cwd>/.taste-lab`. Start only. */
  dir?: string;
  /** Run `taste-lab init` when the data dir is missing. Start only. */
  create?: boolean;
};

export type TasteToolDetails = {
  action: ToolAction;
  state: "running" | "starting" | "stopped";
  dataDir?: string;
  port?: number;
  lan?: boolean;
};

/** The parts of TypeBox the schema needs. Pi supplies `typebox` at runtime. */
export interface TypeBuilder {
  Object(properties: Record<string, unknown>, options?: object): unknown;
  String(options?: object): unknown;
  Boolean(options?: object): unknown;
  Optional(schema: unknown): unknown;
}
/** pi-ai's StringEnum: a string enum every provider accepts. */
export type StringEnumFn = (
  values: readonly string[],
  options?: object,
) => unknown;

export function toolParameters(Type: TypeBuilder, StringEnum: StringEnumFn) {
  return Type.Object({
    action: StringEnum(TOOL_ACTIONS, {
      description:
        "start: serve the data dir and wait until it is ready. status: report the lab and show its links in the operator's UI again. stop: stop the lab.",
    }),
    local: Type.Optional(
      Type.Boolean({
        description: "start only: serve on 127.0.0.1, no LAN link",
      }),
    ),
    dir: Type.Optional(
      Type.String({
        description:
          "start only: data dir, default <cwd>/.taste-lab. Relative paths resolve against cwd",
      }),
    ),
    create: Type.Optional(
      Type.Boolean({
        description:
          "start only: run taste-lab init when the data dir does not exist",
      }),
    ),
  });
}

export const TOOL_DESCRIPTION =
  "Start, check or stop taste.lab for a .taste-lab data dir, like the operator's /taste command. One lab per pi session; start waits until it serves. Links go to the operator's UI only. After a start, each answer arrives as a message.";

export const TOOL_GUIDELINES = [
  "taste_lab start serves the lab in this session; its answers wake this session. Never ask for the lab links or repeat them: the operator has them in pi's UI, and taste_lab status shows them there again.",
];

const where = (lan: boolean) => (lan ? "local and LAN" : "local only");

/** The lab serves. `asked` is the data dir a start asked for, if any. */
export function runningText(
  info: LabInfo,
  asked?: string,
  token?: string,
): string {
  let text =
    `taste-lab is running (${where(info.lan)}) for ${info.dataDir} on port ${info.port}. ` +
    "The operator has the links in pi's UI. Each answer arrives as a message; on one, load the taste skill and follow it.";
  if (asked !== undefined && asked !== info.dataDir) {
    text += ` It serves ${info.dataDir}, not ${asked}. Stop it first to serve another data dir.`;
  }
  return scrubSecrets(text, token ? [token] : []);
}

export function startingText(dataDir: string): string {
  return scrubSecrets(`taste-lab is starting for ${dataDir}.`);
}

export const NOT_RUNNING_TEXT = "taste-lab is not running.";
