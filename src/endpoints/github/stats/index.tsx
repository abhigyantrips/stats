import { renderToString } from "hono/jsx/dom/server";
import { Context, Hono } from "hono";

import { GitHubStats } from "@/templates/svg/github-stats";
import { ErrorSVG } from "@/components/error-svg";
import { getTheme } from "@/themes";

type Bindings = {
  GITHUB_PAT: string;
  GITHUB_USERNAME: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (context: Context) => {
  if (!context.env.GITHUB_PAT || !context.env.GITHUB_USERNAME) {
    return context.newResponse(
      renderToString(<ErrorSVG message="GitHub Variables not found." />),
    );
  }

  const { theme } = context.req.query();
  const myTheme = getTheme(theme);

  try {
    const response = await fetch(
      `https://api.github.com/users/${context.env.GITHUB_USERNAME}`,
      {
        headers: {
          Authorization: `token ${context.env.GITHUB_PAT}`,
          "User-Agent": "Cloudflare-Worker",
        },
      },
    );

    if (!response.ok) {
      return context.newResponse(
        renderToString(
          <ErrorSVG message={`GitHub API error: ${response.status}`} />,
        ),
      );
    }

    const userData = await response.json();
    const { login, public_repos, followers } = userData as {
      login: string;
      public_repos: number;
      followers: number;
    };

    return context.newResponse(
      renderToString(
        <GitHubStats
          username={login}
          repos={public_repos}
          followers={followers}
          theme={myTheme}
        />,
      ),
      {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=3600, stale-while-revalidate",
        },
      },
    );
  } catch (error: any) {
    return context.newResponse(
      renderToString(<ErrorSVG message={error.message} />),
      {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=3600, stale-while-revalidate",
        },
      },
    );
  }
});

export default app;
