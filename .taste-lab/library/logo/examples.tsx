import { Logo, LogoMark } from "./Logo";

export type LogoArgs = { large?: boolean };

/** The lockup as the header shows it. */
export function Lockup(args: LogoArgs) {
  return <Logo large={args.large} />;
}

/** The mark from favicon size to app icon size. */
export function MarkSizes() {
  return (
    <div className="flex items-end gap-6">
      <LogoMark className="size-4" />
      <LogoMark className="size-6" />
      <LogoMark className="size-8" />
      <LogoMark className="size-16" />
      <LogoMark className="size-32" />
    </div>
  );
}

/** The lockup on the three surfaces it sits on. */
export function Surfaces() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div className="flex h-24 items-center justify-center rounded-xl border bg-card">
        <Logo />
      </div>
      <div className="flex h-24 items-center justify-center rounded-xl bg-muted">
        <Logo />
      </div>
      <div className="flex h-24 items-center justify-center rounded-xl border bg-background">
        <Logo large />
      </div>
    </div>
  );
}
