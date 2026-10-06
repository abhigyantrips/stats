import { getActivityRange, graphNumber } from "@/lib/activity-graph";
import { fetchGitHubActivity } from "@/lib/github-fetcher";
import { GitHubGraph } from "@/templates/github/graph";
import { renderToString } from "hono/jsx/dom/server";
import type { Bindings } from "@/types/bindings";
import { getCardColors, themes } from "@/themes";
import { Hono } from "hono";

const app = new Hono<{ Bindings: Bindings }>();
const graphColor = (value: string | undefined, fallback: string) =>
  value && /^(?:[a-f\d]{3}|[a-f\d]{4}|[a-f\d]{6}|[a-f\d]{8})$/i.test(value)
    ? `#${value}`
    : fallback;

app.get("/", async (c) => {
  const username = c.env.GITHUB_USERNAME;
  if (!username || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username))
    return c.text("Configure a valid GITHUB_USERNAME", 500);
  for (const parameter of ["user", "username"]) {
    const requested = c.req.query(parameter);
    if (requested && requested.toLowerCase() !== username.toLowerCase())
      return c.text("This Worker only serves its configured GitHub user", 400);
  }
  const query = c.req.query();
  let range;
  let options;
  try {
    range = getActivityRange(query);
    options = {
      width: graphNumber(query.card_width, 1000, 300, 2000, "card_width"),
      height: graphNumber(query.height, 300, 200, 600, "height"),
      radius: graphNumber(
        query.border_radius ?? query.radius,
        4.5,
        0,
        16,
        "border_radius",
        false,
      ),
      hideTitle: query.hide_title === "true",
      hideBorder: query.hide_border === "true",
      title: query.custom_title ?? `${username}'s GitHub Activity Graph`,
      area: query.area === "true",
      grid: query.grid !== "false",
      disableAnimations: query.disable_animations === "true",
    };
  } catch (error) {
    return c.text(
      error instanceof Error ? error.message : "Invalid graph options",
      400,
    );
  }
  if (!c.env.GITHUB_PAT) return c.text("GitHub token not configured", 500);
  const theme = Object.hasOwn(themes, query.theme)
    ? themes[query.theme]
    : themes.default;
  const defaults = getCardColors({ theme: theme.name });
  const colors = {
    ...defaults,
    titleColor: graphColor(query.title_color, defaults.titleColor),
    textColor: graphColor(query.text_color ?? query.color, defaults.textColor),
    bgColor: graphColor(query.bg_color, theme.backgroundColor),
    borderColor: graphColor(query.border_color, defaults.borderColor),
  };
  const lineColor = graphColor(query.line, theme.graph.lineColor);
  try {
    const days = await fetchGitHubActivity(username, c.env.GITHUB_PAT, range, {
      origin: new URL(c.req.url).origin,
    });
    return c.newResponse(
      renderToString(
        <GitHubGraph
          days={days}
          colors={{
            ...colors,
            lineColor,
            pointColor: graphColor(query.point, theme.graph.pointColor),
            areaColor: graphColor(query.area_color, lineColor),
          }}
          options={options}
        />,
      ),
      {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "public, max-age=1800",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching activity graph:", error);
    return c.text(
      `Error fetching activity graph: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
    );
  }
});

export default app;
