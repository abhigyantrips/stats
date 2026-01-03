import { fetchGitHubStreakStats } from "@/lib/github-fetcher";
import { GitHubStreak } from "@/templates/github/streak";
import { renderToString } from "hono/jsx/dom/server";
import { getCardColors } from "@/themes";
import { Context, Hono } from "hono";

type Bindings = {
  GITHUB_PAT: string;
  GITHUB_USERNAME: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c: Context) => {
  const username = c.req.query("user") || c.env.GITHUB_USERNAME;
  const githubToken = c.env.GITHUB_PAT;

  // Get query parameters
  const theme = c.req.query("theme") || "default";
  const hideTitle = c.req.query("hide_title") === "true";
  const hideBorder = c.req.query("hide_border") === "true";
  const excludeDays = c.req.query("exclude_days")?.split(",") || [];

  if (!githubToken) {
    return c.text("GitHub token not configured", 500);
  }

  if (!username) {
    return c.text("Username not provided", 400);
  }

  try {
    // Fetch stats
    const stats = await fetchGitHubStreakStats(
      username,
      githubToken,
      excludeDays,
    );

    // Get colors
    const colors = getCardColors({
      theme,
      title_color: c.req.query("title_color"),
      text_color: c.req.query("text_color"),
      icon_color: c.req.query("icon_color"),
      bg_color: c.req.query("bg_color"),
      border_color: c.req.query("border_color"),
      ring_color: c.req.query("ring_color"),
    });

    return c.newResponse(
      renderToString(
        <GitHubStreak
          stats={stats}
          colors={colors}
          options={{
            hide_title: hideTitle,
            hide_border: hideBorder,
            custom_title: c.req.query("custom_title"),
            card_width: Number(c.req.query("card_width")) || undefined,
            border_radius: Number(c.req.query("border_radius")) || 4.5,
            disable_animations: c.req.query("disable_animations") === "true",
          }}
        />,
      ),
      {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=3600, stale-while-revalidate",
        },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    return c.text(
      `Error fetching streak stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
    );
  }
});

export default app;
