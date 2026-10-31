import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

// .taste-lab round-017 a (flask tile) + round-018 b (taste.lab, coral dot).
// Mirrors .taste-lab/library/logo/Logo.tsx.

/** The mark: the lucide flask on a primary tile. Size it with a size-* class. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      data-slot="logo-mark"
      aria-hidden="true"
      className={cn(
        "inline-flex aspect-square shrink-0 items-center justify-center rounded-[28%] bg-primary text-primary-foreground",
        className,
      )}
    >
      <FlaskConical className="size-[62%]" strokeWidth={2} />
    </span>
  );
}

/** Mark plus the name "taste.lab", the dot in the coral chart color. */
export function Logo({
  large = false,
  className,
}: {
  large?: boolean;
  className?: string;
}) {
  return (
    <span
      data-slot="logo"
      className={cn(
        "inline-flex items-center gap-2",
        large && "gap-3",
        className,
      )}
    >
      <LogoMark className={large ? "size-10" : "size-6"} />
      <span
        className={cn(
          "font-semibold tracking-tight text-foreground",
          large ? "text-2xl" : "text-sm",
        )}
      >
        taste<span className="text-chart-1">.</span>lab
      </span>
    </span>
  );
}
