// The slice of pi's extension API that /taste uses, typed structurally.
// Pi supplies @earendil-works/pi-coding-agent at runtime. Importing its types
// would need it in devDependencies (a large tree) only for tsc, so these
// mirror the 1.4.0 declarations in dist/core/extensions/types.d.ts instead.

export type NotifyType = "info" | "warning" | "error";

export type ThemeColor = "accent" | "dim" | "text" | "mdLink" | "success";
export interface TasteTheme {
  fg(color: ThemeColor, text: string): string;
}
export interface TasteComponent {
  render(width: number): string[];
  invalidate(): void;
  handleInput?(data: string): void;
}
export type WidgetFactory = (
  tui: { requestRender(): void },
  theme: TasteTheme,
) => TasteComponent;
export type MessageRenderer = (
  message: CustomMessageIn,
  options: { expanded: boolean },
  theme: TasteTheme,
) => TasteComponent;
export type Truncate = (text: string, width: number) => string;

export interface TasteUi {
  readonly theme: TasteTheme;
  custom(
    factory: (
      tui: { requestRender(): void },
      theme: TasteTheme,
      keybindings: { matches(data: string, action: string): boolean },
      done: () => void,
    ) => TasteComponent,
  ): Promise<void>;
  notify(message: string, type?: NotifyType): void;
  /** Pi 1.4.0 closes the dialog when `signal` aborts. */
  confirm(
    title: string,
    message: string,
    options?: { signal?: AbortSignal },
  ): Promise<boolean>;
  setStatus(key: string, text: string | undefined): void;
  setWidget(
    key: string,
    content: string[] | WidgetFactory | undefined,
    options?: { placement?: "aboveEditor" | "belowEditor" },
  ): void;
}

export interface TasteCtx {
  cwd: string;
  hasUI: boolean;
  mode: "tui" | "rpc" | "json" | "print";
  ui: TasteUi;
}

export type CustomMessageIn = {
  customType: string;
  content: string;
  display: boolean;
  details?: unknown;
};

export type SendOptions = {
  triggerTurn?: boolean;
  deliverAs?: "steer" | "followUp" | "nextTurn";
};

export type Completion = { value: string; label: string; description?: string };

export interface TastePi {
  registerMessageRenderer(customType: string, renderer: MessageRenderer): void;
  registerCommand(
    name: string,
    options: {
      description?: string;
      getArgumentCompletions?: (prefix: string) => Completion[] | null;
      handler: (args: string, ctx: TasteCtx) => Promise<void>;
    },
  ): void;
  on(
    event: "session_shutdown",
    handler: (event: unknown, ctx: TasteCtx) => Promise<void> | void,
  ): unknown;
  sendMessage(message: CustomMessageIn, options?: SendOptions): void;
}
