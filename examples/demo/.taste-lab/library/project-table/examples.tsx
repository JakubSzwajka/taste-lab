import { type Row, rows } from "@/fixtures";
import { ProjectTable } from "./ProjectTable";

/** Props the Library Controls panel sets (meta.json `controls`). */
export type ProjectTableArgs = {
  /** Only rows with this status. */
  status?: Row["status"];
  /** How many rows to show. 0 shows the empty state. */
  count?: number;
  /** Owner name on every row. */
  owner?: string;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");

/** The fixture rows with the controls applied over them. */
function Table({ items, ...args }: { items: Row[] } & ProjectTableArgs) {
  const filtered = args.status
    ? items.filter((r) => r.status === args.status)
    : items;
  const shown =
    args.count === undefined ? filtered : filtered.slice(0, args.count);
  const { owner } = args;
  return (
    <ProjectTable
      rows={
        owner === undefined
          ? shown
          : shown.map((r) => ({
              ...r,
              owner: { name: owner, initials: initials(owner) },
            }))
      }
    />
  );
}

/** Every project in the fixture. */
export function Default(args: ProjectTableArgs) {
  return <Table items={rows} {...args} />;
}

/** Three rows: the table does not stretch to fill space. */
export function FewRows(args: ProjectTableArgs) {
  return <Table items={rows} count={3} {...args} />;
}

/** Both at-risk projects among active, paused and done ones. */
export function AtRiskMixed(args: ProjectTableArgs) {
  const pick = ["PRJ-01", "PRJ-02", "PRJ-04", "PRJ-06", "PRJ-08", "PRJ-10"];
  return <Table items={rows.filter((r) => pick.includes(r.id))} {...args} />;
}

/** No rows: the header stays and one quiet line says so. */
export function Empty(args: ProjectTableArgs) {
  return <Table items={rows} count={0} {...args} />;
}
