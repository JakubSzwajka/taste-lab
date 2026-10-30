import { ChevronDown, RotateCcw } from "lucide-react";
import { type ReactNode, type Ref, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  type ControlValue,
  type ControlValues,
  type LibraryControl,
  parseNumber,
} from "@/lib/library-controls";
import { menuOptionId, menuOptionValue, UNSET_ID } from "./menu-options";

/** Selects with more options than this use a menu instead of toggles. */
const MAX_TOGGLES = 4;

/** Height of the header bar in px (`h-9`): all a collapsed panel shows. */
export const CONTROLS_HEADER_PX = 36;

/**
 * Storybook-style args table under the canvas. One row per declared control.
 * The header bar holds the title, Reset and any `actions` (the panel buttons).
 */
export function LibraryControls({
  controls,
  values,
  onChange,
  onReset,
  actions,
  bodyRef,
  collapsed = false,
}: {
  controls: LibraryControl[];
  values: ControlValues;
  onChange: (prop: string, value: ControlValue | undefined) => void;
  onReset: () => void;
  actions?: ReactNode;
  /** The scrolling body, so the panel can measure the table's full height. */
  bodyRef?: Ref<HTMLDivElement>;
  /** Only the header bar shows: the table stays out of tab order. */
  collapsed?: boolean;
}) {
  return (
    <section aria-label="Controls" className="flex h-full min-h-0 flex-col">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b px-4">
        <h2 className="text-xs font-medium">Controls</h2>
        <p className="hidden min-w-0 truncate text-xs text-muted-foreground sm:block">
          Unset props keep the example's own value.
        </p>
        <div className="ml-auto flex items-center gap-1">
          <Button size="xs" variant="ghost" onClick={onReset}>
            <RotateCcw />
            Reset
          </Button>
          {actions}
        </div>
      </div>
      <div
        ref={bodyRef}
        inert={collapsed}
        className="min-h-0 flex-1 overflow-y-auto"
      >
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-44 pl-4 text-xs font-normal text-muted-foreground">
                Prop
              </TableHead>
              <TableHead className="text-xs font-normal text-muted-foreground">
                Control
              </TableHead>
              <TableHead className="w-40 pr-4 text-right text-xs font-normal text-muted-foreground">
                Value
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {controls.map((c) => {
              const value = Object.hasOwn(values, c.prop)
                ? values[c.prop]
                : undefined;
              return (
                <TableRow key={c.prop} className="hover:bg-transparent">
                  <TableCell className="pl-4 align-middle">
                    <div className="flex flex-col">
                      <span className="font-mono text-xs">{c.prop}</span>
                      {c.label && (
                        <span className="text-xs text-muted-foreground">
                          {c.label}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Control
                      control={c}
                      value={value}
                      onChange={(v) => onChange(c.prop, v)}
                    />
                  </TableCell>
                  <TableCell className="max-w-40 truncate pr-4 text-right font-mono text-xs text-muted-foreground">
                    {value === undefined ? "unset" : JSON.stringify(value)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function Control({
  control,
  value,
  onChange,
}: {
  control: LibraryControl;
  value: ControlValue | undefined;
  onChange: (v: ControlValue | undefined) => void;
}) {
  const name = control.label ?? control.prop;
  switch (control.kind) {
    case "boolean":
      return (
        <Checkbox
          aria-label={name}
          checked={value === true}
          onCheckedChange={(c) => onChange(c === true)}
        />
      );
    case "select":
      return (
        <SelectControl
          name={name}
          options={control.options ?? []}
          value={typeof value === "string" ? value : undefined}
          onChange={onChange}
        />
      );
    case "text":
      return (
        <Input
          aria-label={name}
          className="h-7 max-w-72"
          placeholder="unset"
          value={typeof value === "string" ? value : ""}
          // An empty field means unset: the example keeps its own text.
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
    case "number":
      return (
        <NumberControl
          name={name}
          value={typeof value === "number" ? value : undefined}
          onChange={onChange}
        />
      );
  }
}

function SelectControl({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: string[];
  value: string | undefined;
  onChange: (v: string | undefined) => void;
}) {
  if (options.length <= MAX_TOGGLES) {
    return (
      <ToggleGroup
        type="single"
        size="sm"
        variant="outline"
        spacing={0}
        aria-label={name}
        value={value ?? ""}
        // Clicking the pressed item clears it: unset.
        onValueChange={(v) => onChange(v === "" ? undefined : v)}
      >
        {options.map((o) => (
          <ToggleGroupItem key={o} value={o} className="font-mono text-xs">
            {o}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          aria-label={name}
          className="font-mono text-xs"
        >
          {value ?? "unset"}
          <ChevronDown className="text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {/* Radio values are internal ids, so any option string is safe. */}
        <DropdownMenuRadioGroup
          value={menuOptionId(options, value)}
          onValueChange={(id) => onChange(menuOptionValue(options, id))}
        >
          <DropdownMenuRadioItem value={UNSET_ID} className="text-xs">
            unset
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator />
          {options.map((o) => (
            <DropdownMenuRadioItem
              key={o}
              value={menuOptionId(options, o)}
              className="font-mono"
            >
              {o}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Keeps the typed text, so "-" or "1." can be typed before it is a number. */
function NumberControl({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const [text, setText] = useState(value === undefined ? "" : String(value));
  const shown = parseNumber(text) === value ? text : (value?.toString() ?? "");
  return (
    <Input
      aria-label={name}
      type="number"
      className="h-7 w-28"
      placeholder="unset"
      value={shown}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parseNumber(e.target.value));
      }}
    />
  );
}
