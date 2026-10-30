import { useEffect, useState } from "react";

export type Route =
  | { page: "current" }
  | { page: "round"; id: string }
  | { page: "history" }
  | { page: "theme" }
  | { page: "library" }
  | { page: "library-entry"; name: string; example?: string };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#\/?/, "");
  if (path === "history") return { page: "history" };
  if (path === "theme") return { page: "theme" };
  if (path === "library") return { page: "library" };
  if (path.startsWith("library/") && path.length > 8) {
    // `library/<name>` or `library/<name>/<example>`. Each part is encoded, so a
    // raw "/" only ever separates them.
    const [name, example, ...rest] = path.slice(8).split("/");
    try {
      if (rest.length > 0 || name === "" || example === "") {
        return { page: "library" };
      }
      return example === undefined
        ? { page: "library-entry", name: decodeURIComponent(name) }
        : {
            page: "library-entry",
            name: decodeURIComponent(name),
            example: decodeURIComponent(example),
          };
    } catch {
      return { page: "library" };
    }
  }
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
    : r.page === "theme"
      ? "#/theme"
      : r.page === "library"
        ? "#/library"
        : r.page === "library-entry"
          ? `#/library/${encodeURIComponent(r.name)}${
              r.example === undefined ? "" : `/${encodeURIComponent(r.example)}`
            }`
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
