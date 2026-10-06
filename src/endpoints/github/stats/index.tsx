import { fetchGitHubStats } from "@/lib/github-fetcher";
import { GitHubStats } from "@/templates/github/stats";
import { renderToString } from "hono/jsx/dom/server";
import type { Bindings } from "@/types/bindings";
import { getCardColors } from "@/themes";
import { Hono } from "hono";

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
  const username = c.env.GITHUB_USERNAME;
  const githubToken = c.env.GITHUB_PAT;

  if (!username || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(username)) {
    return c.text("Configure a valid GITHUB_USERNAME", 500);
  }
  for (const parameter of ["user", "username"]) {
    const requested = c.req.query(parameter);
    if (requested && requested.toLowerCase() !== username.toLowerCase()) {
      return c.text("This Worker only serves its configured GitHub user", 400);
    }
  }

  // Get query parameters
  const theme = c.req.query("theme") || "default";
  const showIcons = c.req.query("show_icons") === "true";
  const hideRank = c.req.query("hide_rank") === "true";
  const hideTitle = c.req.query("hide_title") === "true";
  const hideBorder = c.req.query("hide_border") === "true";
  const includeAllCommits = c.req.query("include_all_commits") === "true";
  const show = c.req.query("show")?.split(",") || [];

  if (!githubToken) {
    return c.text("GitHub token not configured", 500);
  }

  try {
    // Fetch stats
    const stats = await fetchGitHubStats(username, githubToken, {
      includeAllCommits,
      cache: { origin: new URL(c.req.url).origin },
      includeReviews: show.includes("reviews"),
      includeDiscussions:
        show.includes("discussions_started") ||
        show.includes("discussions_answered"),
    });

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

    // Render card
    return c.newResponse(
      renderToString(
        <GitHubStats
          stats={stats}
          colors={colors}
          options={{
            show_icons: showIcons,
            hide_rank: hideRank,
            hide_title: hideTitle,
            hide_border: hideBorder,
            include_all_commits: includeAllCommits,
            show,
            custom_title: c.req.query("custom_title"),
            card_width: Number(c.req.query("card_width")) || undefined,
            border_radius: Number(c.req.query("border_radius")) || 4.5,
            disable_animations: c.req.query("disable_animations") === "true",
            rank_icon: (c.req.query("rank_icon") as any) || "default",
          }}
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
    console.error("Error:", error);
    return c.text(
      `Error fetching stats: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
    );
  }
});

export default app;
