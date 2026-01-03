import { Theme } from "@/types";

export const themes: Record<string, Theme> = {
  default: {
    name: "default",
    titleColor: "#2f80ed",
    iconColor: "#4c71f2",
    textColor: "#434d58",
    backgroundColor: "#fffefe",
    borderColor: "#e4e2e2",
    graph: {
      lineColor: "#4c71f2",
      pointColor: "#4c71f2",
    },
  },
  dark: {
    name: "dark",
    titleColor: "#fff",
    iconColor: "#fb8c00",
    textColor: "#fefefe",
    backgroundColor: "#151515",
    borderColor: "#e4e2e2",
    graph: {
      lineColor: "#fb8c00",
      pointColor: "#fb8c00",
    },
  },
  radical: {
    name: "radical",
    titleColor: "#fe428e",
    iconColor: "#f8d847",
    textColor: "#a9fef7",
    backgroundColor: "#141321",
    graph: {
      lineColor: "#fe428e",
      pointColor: "#f8d847",
    },
  },
  merko: {
    name: "merko",
    titleColor: "#abd200",
    iconColor: "#b7d364",
    textColor: "#68b587",
    backgroundColor: "#0a0f0b",
    graph: {
      lineColor: "#abd200",
      pointColor: "#b7d364",
    },
  },
  gruvbox: {
    name: "gruvbox",
    titleColor: "#fabd2f",
    iconColor: "#fe8019",
    textColor: "#8ec07c",
    backgroundColor: "#282828",
    graph: {
      lineColor: "#fabd2f",
      pointColor: "#fe8019",
    },
  },
  tokyonight: {
    name: "tokyonight",
    titleColor: "#70a5fd",
    iconColor: "#bf91f3",
    textColor: "#38bdae",
    backgroundColor: "#1a1b27",
    graph: {
      lineColor: "#70a5fd",
      pointColor: "#bf91f3",
    },
  },
  onedark: {
    name: "onedark",
    titleColor: "#e4bf7a",
    iconColor: "#8eb573",
    textColor: "#df6d74",
    backgroundColor: "#282c34",
    graph: {
      lineColor: "#e4bf7a",
      pointColor: "#8eb573",
    },
  },
  cobalt: {
    name: "cobalt",
    titleColor: "#e683d9",
    iconColor: "#0480ef",
    textColor: "#75eeb2",
    backgroundColor: "#193549",
    graph: {
      lineColor: "#e683d9",
      pointColor: "#0480ef",
    },
  },
  synthwave: {
    name: "synthwave",
    titleColor: "#e2e9ec",
    iconColor: "#ef8539",
    textColor: "#e2e9ec",
    backgroundColor: "#2b213a",
    graph: {
      lineColor: "#e2e9ec",
      pointColor: "#ef8539",
    },
  },
  highcontrast: {
    name: "highcontrast",
    titleColor: "#e7f216",
    iconColor: "#00ffff",
    textColor: "#fff",
    backgroundColor: "#000",
    borderColor: "#e7f216",
    graph: {
      lineColor: "#e7f216",
      pointColor: "#00ffff",
    },
  },
  dracula: {
    name: "dracula",
    titleColor: "#ff6e96",
    iconColor: "#79dafa",
    textColor: "#f8f8f2",
    backgroundColor: "#282a36",
    graph: {
      lineColor: "#ff6e96",
      pointColor: "#79dafa",
    },
  },
};

const isValidHexColor = (hexColor: string): boolean => {
  return /^([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4})$/.test(
    hexColor,
  );
};

const isValidGradient = (colors: string[]): boolean => {
  return (
    colors.length > 2 &&
    colors.slice(1).every((color) => isValidHexColor(color))
  );
};

const parseFallbackColor = (
  color: string | undefined,
  fallback: string | string[],
): string | string[] => {
  if (!color) return fallback;

  const colors = color.split(",");
  if (colors.length > 1 && isValidGradient(colors)) {
    return colors;
  }

  return isValidHexColor(color) ? `#${color}` : fallback;
};

export interface CardColors {
  titleColor: string;
  iconColor: string;
  textColor: string;
  bgColor: string | string[];
  borderColor: string;
  ringColor: string;
}

export const getCardColors = ({
  title_color,
  text_color,
  icon_color,
  bg_color,
  border_color,
  ring_color,
  theme = "default",
}: {
  title_color?: string;
  text_color?: string;
  icon_color?: string;
  bg_color?: string;
  border_color?: string;
  ring_color?: string;
  theme?: string;
}): CardColors => {
  const defaultTheme = themes.default;
  const selectedTheme = themes[theme] || defaultTheme;

  const titleColor = title_color
    ? parseFallbackColor(title_color, selectedTheme.titleColor)
    : selectedTheme.titleColor;

  const ringColor = ring_color
    ? parseFallbackColor(ring_color, selectedTheme.graph.pointColor)
    : selectedTheme.graph.pointColor;

  const iconColor = icon_color
    ? parseFallbackColor(icon_color, selectedTheme.iconColor)
    : selectedTheme.iconColor;

  const textColor = text_color
    ? parseFallbackColor(text_color, selectedTheme.textColor)
    : selectedTheme.textColor;

  const bgColor = bg_color
    ? parseFallbackColor(bg_color, selectedTheme.backgroundColor)
    : selectedTheme.backgroundColor;

  const defaultBorderColor =
    selectedTheme.borderColor || defaultTheme.borderColor || "#e4e2e2";

  const borderColor = border_color
    ? parseFallbackColor(border_color, defaultBorderColor)
    : defaultBorderColor;

  if (
    typeof titleColor !== "string" ||
    typeof textColor !== "string" ||
    typeof ringColor !== "string" ||
    typeof iconColor !== "string" ||
    typeof borderColor !== "string"
  ) {
    throw new Error(
      "Unexpected behavior: all colors except background should be string.",
    );
  }

  return {
    titleColor,
    iconColor,
    textColor,
    bgColor,
    borderColor,
    ringColor,
  };
};
