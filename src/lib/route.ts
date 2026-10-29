import { useEffect, useState } from "react";

export type Route =
  | { page: "current" }
  | { page: "round"; id: string }
  | { page: "history" };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  if (path === "history") return { page: "history" };
  if (path.startsWith("round/") && path.length > 6) {
    try {
      return { page: "round", id: decodeURIComponent(path.slice(6)) };
    } catch {
      return { page: "current" }; // malformed escape such as "%"
    }
  }
  return { page: "current" };
}

export const hrefFor = (r: Route) =>
  r.page === "history"
    ? "#/history"
    : r.page === "round"
      ? `#/round/${encodeURIComponent(r.id)}`
      : "#/";

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseHash(location.hash));
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
