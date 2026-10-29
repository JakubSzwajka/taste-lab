import { getThemeData, subscribeThemeData } from "virtual:taste-lab/theme";
import { useSyncExternalStore } from "react";

/** Stock and theme.css tokens. Updates when theme.css changes while the server runs. */
export const useThemeData = () =>
  useSyncExternalStore(subscribeThemeData, getThemeData);
