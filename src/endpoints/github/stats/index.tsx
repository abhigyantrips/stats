import { graphql, type GraphQlQueryResponseData } from "@octokit/graphql";
import { GitHubStats } from "@/templates/github/stats";
import { renderToString } from "hono/jsx/dom/server";
import { ErrorSVG } from "@/components/error-svg";
import { Context, Hono } from "hono";
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
    const { user }: GraphQlQueryResponseData = await graphql({
      headers: {
        authorization: `token ${context.env.GITHUB_PAT}`,
      },
      query: `query GitHubUser($USERNAME: String!) {
        user(login: $USERNAME) {
          login
          followers {
            totalCount
          }
          repositories(privacy: PUBLIC) {
            totalCount
          }
        }
      }`,
      USERNAME: context.env.GITHUB_USERNAME,
    });

    return context.newResponse(
      renderToString(
        <GitHubStats
          username={user.login}
          repos={user.repositories.totalCount}
          followers={user.followers.totalCount}
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
