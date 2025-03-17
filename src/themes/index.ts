import type { Theme } from "@/types";

import darkTheme from "./dark";

export const themes: Record<string, Theme> = {
  dark: darkTheme,
};

export function getTheme(name: string): Theme {
  return themes[name] || themes.dark;
}
