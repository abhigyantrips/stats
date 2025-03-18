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

  function createGraph(
    chartType: string,
    config: any,
    data: any,
  ): Promise<string> {
    return new Promise((resolve) => {
      // Minimal example returning an inline SVG string.
      resolve(
        `<svg><!-- ${chartType} chart with ${data.series[0].value.length} points --></svg>`,
      );
    });
  }

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

    const days =
      user.contributionsCollection.contributionCalendar.weeks.flatMap(
        (week: any) => week.contributionDays,
      );

    const line = await createGraph(
      "line",
      { theme: myTheme },
      {
        labels: days.map((day: any) => day.date),
        series: [{ value: days.map((day: any) => day.contributionCount) }],
      },
    );

    return context.newResponse(
      renderToString(
        <GitHubContributions
          height={300}
          width={600}
          theme={myTheme}
          title="Contributions"
          radius={8}
          line={line}
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
