import { graphql, type GraphQlQueryResponseData } from "@octokit/graphql";
import { GitHubContributions } from "@/templates/github/contributions";
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
      query: `query userInfo($LOGIN: String!, $FROM: DateTime!, $TO: DateTime!) {
        user(login: $LOGIN) {
          name
          contributionsCollection(from: $FROM, to: $TO) {
            contributionCalendar {
              weeks {
                contributionDays {
                  contributionCount
                  date
                }
              }
            }
          }
        }
      }`,
      LOGIN: context.env.GITHUB_USERNAME,
      FROM: new Date(new Date().getFullYear(), 0, 1).toISOString(),
      TO: new Date().toISOString(),
    });

    if (!user) {
      return context.newResponse(
        renderToString(<ErrorSVG message="User not found on GitHub." />),
        {
          status: 404,
          headers: {
            "Content-Type": "image/svg+xml",
            "Cache-Control": "s-maxage=3600, stale-while-revalidate",
          },
        },
      );
    }

    const contributions =
      user.contributionsCollection.contributionCalendar.weeks.flatMap(
        (week: any) => week.contributionDays,
      );

    return context.newResponse(
      renderToString(
        <GitHubContributions
          width={600}
          height={300}
          theme={myTheme}
          title="Contributions"
          radius={8}
          contributions={contributions}
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
    console.error("Error in /api/github/contributions:", error);
    return context.newResponse(
      renderToString(<ErrorSVG message={error.message} />),
      {
        status: 500,
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": "s-maxage=3600, stale-while-revalidate",
        },
      },
    );
  }
});

export default app;
