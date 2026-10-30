import { getThemeData, subscribeThemeData } from "virtual:taste-lab/theme";
import { useSyncExternalStore } from "react";

/**
 * Stock and theme.css tokens. Updates when theme.css changes while the server runs.
 * The server snapshot is the same data, so static renders (tests) work too.
 */
export const useThemeData = () =>
  useSyncExternalStore(subscribeThemeData, getThemeData, getThemeData);
