import { cachedGitHubData, type GitHubCacheOptions } from "./github-cache";
import { calculateRank } from "./calculate-rank";
import { StatsData } from "./stats-card";

interface GitHubGraphQLResponse {
  data?: {
    user: {
      name: string;
      login: string;
      contributionsCollection: {
        totalCommitContributions: number;
        restrictedContributionsCount: number;
        totalPullRequestReviewContributions: number;
      };
      repositoriesContributedTo: {
        totalCount: number;
      };
      pullRequests: {
        totalCount: number;
      };
      mergedPullRequests: {
        totalCount: number;
      };
      openIssues: {
        totalCount: number;
      };
      closedIssues: {
        totalCount: number;
      };
      followers: {
        totalCount: number;
      };
      repositories: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        totalCount: number;
        nodes: Array<{
          stargazers: {
            totalCount: number;
          };
        }>;
      };
      repositoryDiscussions: {
        totalCount: number;
      };
      repositoryDiscussionComments: {
        totalCount: number;
      };
    };
  };
  errors?: Array<{
    message: string;
    type?: string;
  }>;
}

const GITHUB_GRAPHQL_API = "https://api.github.com/graphql";

// Optimized single query that fetches all data at once
const GRAPHQL_QUERY = `
  query userInfo($login: String!, $after: String) {
    user(login: $login) {
      name
      login
      contributionsCollection {
        totalCommitContributions
        restrictedContributionsCount
        totalPullRequestReviewContributions
      }
      repositoriesContributedTo(
        first: 1
        contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]
      ) {
        totalCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      mergedPullRequests: pullRequests(states: MERGED, first: 1) {
        totalCount
      }
      openIssues: issues(states: OPEN, first: 1) {
        totalCount
      }
      closedIssues: issues(states: CLOSED, first: 1) {
        totalCount
      }
      followers {
        totalCount
      }
      repositories(
        first: 100
        ownerAffiliations: OWNER
        orderBy: { direction: DESC, field: STARGAZERS }
        after: $after
      ) {
        totalCount
        nodes {
          name
          stargazers {
            totalCount
          }
        }
        pageInfo { hasNextPage endCursor }
      }
      repositoryDiscussions(first: 1) {
        totalCount
      }
      repositoryDiscussionComments(first: 1, onlyAnswers: true) {
        totalCount
      }
    }
  }
`;

async function makeGraphQLRequest(
  query: string,
  variables: Record<string, any>,
  token: string,
  cache?: GitHubCacheOptions,
): Promise<any> {
  return cachedGitHubData(
    ["graphql", query, variables, token],
    cache,
    async () => {
      const response = await fetch(GITHUB_GRAPHQL_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "User-Agent": "GitHub-Stats-Card",
        },
        body: JSON.stringify({ query, variables }),
      });

      const result = await response.json();

      // Check for GraphQL errors
      if ((result as unknown as any).errors) {
        const errorMessages = (result as unknown as any).errors
          .map((e: any) => e.message)
          .join(", ");
        throw new Error(`GitHub GraphQL Error: ${errorMessages}`);
      }

      // Check for HTTP errors
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error(
            "Invalid GitHub token. Please check your GITHUB_PAT secret.",
          );
        }
        if (response.status === 403) {
          throw new Error(
            "GitHub API rate limit exceeded or insufficient permissions. Make sure your fine-grained token has the correct permissions.",
          );
        }
        throw new Error(
          `GitHub API error: ${response.status} ${response.statusText}`,
        );
      }

      if (!(result as any).data?.user) throw new Error("GitHub user not found");
      return result;
    },
  );
}

async function fetchAllCommits(
  username: string,
  token: string,
  cache?: GitHubCacheOptions,
): Promise<number> {
  const url = new URL("https://api.github.com/search/commits");
  url.searchParams.set("q", `author:${username}`);
  url.searchParams.set("per_page", "1");
  return cachedGitHubData(["all-commits", url.href, token], cache, async () => {
    const response = await fetch(url, {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "User-Agent": "GitHub-Stats-Card",
      },
    });
    if (!response.ok)
      throw new Error(`GitHub commit search failed (${response.status})`);
    const result = await response.json<{
      total_count: number;
      incomplete_results: boolean;
    }>();
    if (
      result.incomplete_results ||
      !Number.isInteger(result.total_count) ||
      result.total_count < 0
    ) {
      throw new Error(
        "GitHub commit search returned incomplete results; try again later",
      );
    }
    return result.total_count;
  });
}

export async function fetchGitHubStats(
  username: string,
  githubToken: string,
  options: {
    cache?: GitHubCacheOptions;
    includeAllCommits?: boolean;
    excludeRepos?: string[];
    includeReviews?: boolean;
    includeDiscussions?: boolean;
  } = {},
): Promise<StatsData> {
  if (!githubToken) {
    throw new Error("GitHub token is required");
  }

  try {
    // Fetch main stats
    const result: GitHubGraphQLResponse = await makeGraphQLRequest(
      GRAPHQL_QUERY,
      { login: username, after: null },
      githubToken,
      options.cache,
    );

    if (!result.data || !result.data.user) {
      throw new Error(`User '${username}' not found`);
    }

    const user = result.data.user;

    // Self-hosting can page through all starred repositories, unlike the
    // public upstream instance's rate-limit-driven first-page default.
    let repositories = user.repositories;
    const nodes = [...repositories.nodes];
    while (
      repositories.pageInfo.hasNextPage &&
      repositories.nodes.every((repo) => repo.stargazers.totalCount > 0)
    ) {
      const after = repositories.pageInfo.endCursor;
      if (!after)
        throw new Error("GitHub repository pagination cursor is missing");
      const page: GitHubGraphQLResponse = await makeGraphQLRequest(
        GRAPHQL_QUERY,
        { login: username, after },
        githubToken,
        options.cache,
      );
      if (!page.data?.user) throw new Error("GitHub user not found");
      repositories = page.data.user.repositories;
      if (
        repositories.pageInfo.hasNextPage &&
        repositories.pageInfo.endCursor === after
      ) {
        throw new Error("GitHub repository pagination did not advance");
      }
      nodes.push(...repositories.nodes);
    }
    const totalStars = nodes.reduce(
      (acc, repo) => acc + repo.stargazers.totalCount,
      0,
    );

    // Total commits
    const totalCommits = options.includeAllCommits
      ? await fetchAllCommits(username, githubToken, options.cache)
      : user.contributionsCollection.totalCommitContributions;

    // Total issues
    const totalIssues =
      user.openIssues.totalCount + user.closedIssues.totalCount;

    // Total PRs
    const totalPRs = user.pullRequests.totalCount;
    const totalPRsMerged = user.mergedPullRequests.totalCount;
    const mergedPRsPercentage =
      totalPRs > 0 ? (totalPRsMerged / totalPRs) * 100 : 0;

    // Contributed to
    const contributedTo = user.repositoriesContributedTo.totalCount;

    // All data fetched in single query
    const totalReviews =
      user.contributionsCollection.totalPullRequestReviewContributions || 0;
    const totalDiscussionsStarted = user.repositoryDiscussions?.totalCount || 0;
    const totalDiscussionsAnswered =
      user.repositoryDiscussionComments?.totalCount || 0;

    // Calculate rank
    const rank = calculateRank({
      allCommits: options.includeAllCommits,
      commits: totalCommits,
      reviews: totalReviews,
      followers: user.followers.totalCount,
      prs: totalPRs,
      issues: totalIssues,
      stars: totalStars,
    });

    return {
      name: user.name || user.login,
      totalStars,
      totalCommits,
      totalIssues,
      totalPRs,
      totalPRsMerged,
      mergedPRsPercentage,
      totalReviews,
      totalDiscussionsStarted,
      totalDiscussionsAnswered,
      contributedTo,
      rank,
    };
  } catch (error) {
    console.error("Error fetching GitHub stats:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Failed to fetch stats for ${username}: Unknown error`);
  }
}

export async function fetchGitHubStatsForYear(
  username: string,
  githubToken: string,
  year: number,
): Promise<Partial<StatsData>> {
  const YEAR_QUERY = `
    query userInfo($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          totalCommitContributions
          restrictedContributionsCount
        }
      }
    }
  `;

  const from = `${year}-01-01T00:00:00Z`;
  const to = `${year}-12-31T23:59:59Z`;

  try {
    const result = await makeGraphQLRequest(
      YEAR_QUERY,
      { login: username, from, to },
      githubToken,
    );
    const contributions = result.data?.user?.contributionsCollection;

    return {
      totalCommits: contributions?.totalCommitContributions || 0,
    };
  } catch (error) {
    console.error(`Error fetching stats for year ${year}:`, error);
    throw error;
  }
}

export interface StreakStats {
  totalContributions: number;
  firstContribution: string;
  longestStreak: {
    start: string;
    end: string;
    length: number;
  };
  currentStreak: {
    start: string;
    end: string;
    length: number;
  };
}

interface ContributionCalendarDay {
  contributionCount: number;
  date: string;
}

interface ContributionCalendarWeek {
  contributionDays: ContributionCalendarDay[];
}

interface ContributionYearResponse {
  data: {
    user: {
      createdAt: string;
      contributionsCollection: {
        contributionYears: number[];
        contributionCalendar: {
          weeks: ContributionCalendarWeek[];
        };
      };
    };
  };
}

export async function fetchGitHubStreakStats(
  username: string,
  githubToken: string,
  excludedDays: string[] = [],
  cache?: GitHubCacheOptions,
): Promise<StreakStats> {
  if (!githubToken) {
    throw new Error("GitHub token is required");
  }

  const CONTRIBUTION_QUERY = `
    query userInfo($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        createdAt
        contributionsCollection(from: $from, to: $to) {
          contributionYears
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
    }
  `;

  try {
    // 1. Get current year and user creation date
    const currentYear = new Date().getFullYear();
    const currentYearResult: ContributionYearResponse =
      await makeGraphQLRequest(
        CONTRIBUTION_QUERY,
        {
          login: username,
          from: `${currentYear}-01-01T00:00:00Z`,
          to: `${currentYear}-12-31T23:59:59Z`,
        },
        githubToken,
        cache,
      );

    if (!currentYearResult.data?.user) {
      throw new Error(`User '${username}' not found`);
    }

    const createdAt = new Date(currentYearResult.data.user.createdAt);
    const createdYear = createdAt.getFullYear();
    const startYear = Math.max(createdYear, 2005); // GitHub started in 2005

    // 2. Fetch all other years in parallel
    const yearsToFetch = [];
    for (let year = startYear; year < currentYear; year++) {
      yearsToFetch.push(year);
    }

    const otherYearsResults = await Promise.all(
      yearsToFetch.map((year) =>
        makeGraphQLRequest(
          CONTRIBUTION_QUERY,
          {
            login: username,
            from: `${year}-01-01T00:00:00Z`,
            to: `${year}-12-31T23:59:59Z`,
          },
          githubToken,
          cache,
        ),
      ),
    );

    // 3. Combine all contribution data
    const allResults = [...otherYearsResults, currentYearResult];
    const contributions: Record<string, number> = {};
    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000)
      .toISOString()
      .split("T")[0];

    allResults.forEach((result) => {
      const weeks =
        result.data?.user?.contributionsCollection?.contributionCalendar
          ?.weeks || [];
      weeks.forEach((week: any) => {
        week.contributionDays.forEach((day: any) => {
          if (
            day.date <= today ||
            (day.date === tomorrow && day.contributionCount > 0)
          ) {
            contributions[day.date] = day.contributionCount;
          }
        });
      });
    });

    // 4. Calculate streaks
    const dates = Object.keys(contributions).sort();
    const stats: StreakStats = {
      totalContributions: 0,
      firstContribution: "",
      longestStreak: { start: "", end: "", length: 0 },
      currentStreak: { start: "", end: "", length: 0 },
    };

    if (dates.length === 0) {
      return stats;
    }

    stats.firstContribution = dates[0];

    // Helper to check excluded days
    const isExcluded = (dateStr: string) => {
      if (excludedDays.length === 0) return false;
      const day = new Date(dateStr).toLocaleDateString("en-US", {
        weekday: "short",
      });
      return excludedDays.includes(day);
    };

    dates.forEach((date) => {
      const count = contributions[date];
      stats.totalContributions += count;

      if (count > 0 || (stats.currentStreak.length > 0 && isExcluded(date))) {
        stats.currentStreak.length++;
        stats.currentStreak.end = date;
        if (stats.currentStreak.length === 1) {
          stats.currentStreak.start = date;
        }

        if (stats.currentStreak.length > stats.longestStreak.length) {
          stats.longestStreak = { ...stats.currentStreak };
        }
      } else if (date !== today) {
        stats.currentStreak.length = 0;
        stats.currentStreak.start = today;
        stats.currentStreak.end = today;
      }
    });

    return stats;
  } catch (error) {
    console.error("Error fetching GitHub streak stats:", error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(
      `Failed to fetch streak stats for ${username}: Unknown error`,
    );
  }
}
