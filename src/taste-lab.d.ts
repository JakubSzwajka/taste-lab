declare module "virtual:taste-lab/config" {
  const config: { version: 1; name: string };
  export default config;
}

declare module "virtual:taste-lab/theme" {
  import type { ThemeProblem, TokenBlocks } from "@/lib/taste-theme";
  export type ThemeData = {
    stock: TokenBlocks;
    theme: TokenBlocks;
    problems: ThemeProblem[];
  };
  export const getThemeData: () => ThemeData;
  export const subscribeThemeData: (fn: () => void) => () => void;
}
