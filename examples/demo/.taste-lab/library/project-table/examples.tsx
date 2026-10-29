import { rows } from "@/fixtures";
import { ProjectTable } from "./ProjectTable";

/** Every project in the fixture. */
export function Default() {
  return <ProjectTable rows={rows} />;
}

/** Three rows: the table does not stretch to fill space. */
export function FewRows() {
  return <ProjectTable rows={rows.slice(0, 3)} />;
}

/** Both at-risk projects among active, paused and done ones. */
export function AtRiskMixed() {
  const pick = ["PRJ-01", "PRJ-02", "PRJ-04", "PRJ-06", "PRJ-08", "PRJ-10"];
  return <ProjectTable rows={rows.filter((r) => pick.includes(r.id))} />;
}

/** No rows: the header stays and one quiet line says so. */
export function Empty() {
  return <ProjectTable rows={[]} />;
}
