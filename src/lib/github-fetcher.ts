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
  query userInfo($login: String!) {
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
        isFork: false
      ) {
        totalCount
        nodes {
          name
          stargazers {
            totalCount
          }
        }
      }
      repositoryDiscussions(first: 1) {
        totalCount
      }
      repositoryDiscussionComments(first: 1) {
        totalCount
      }
    }
  }
`;

const calculateRank = ({
  totalRepos,
  totalCommits,
  contributions,
  followers,
  prs,
  issues,
  stargazers,
}: {
  totalRepos: number;
  totalCommits: number;
  contributions: number;
  followers: number;
  prs: number;
  issues: number;
  stargazers: number;
}): { level: string; percentile: number; score: number } => {
  const COMMITS_MEDIAN = 1000;
  const COMMITS_WEIGHT = 2;
  const REPOS_MEDIAN = 20;
  const REPOS_WEIGHT = 1;
  const ISSUES_MEDIAN = 25;
  const ISSUES_WEIGHT = 1;
  const STARS_MEDIAN = 50;
  const STARS_WEIGHT = 4;
  const PRS_MEDIAN = 50;
  const PRS_WEIGHT = 3;
  const FOLLOWERS_MEDIAN = 10;
  const FOLLOWERS_WEIGHT = 1;
  const CONTRIBUTIONS_MEDIAN = 50;
  const CONTRIBUTIONS_WEIGHT = 1;

  const TOTAL_WEIGHT =
    COMMITS_WEIGHT +
    REPOS_WEIGHT +
    ISSUES_WEIGHT +
    STARS_WEIGHT +
    PRS_WEIGHT +
    FOLLOWERS_WEIGHT +
    CONTRIBUTIONS_WEIGHT;

  const score =
    (totalCommits / COMMITS_MEDIAN) * COMMITS_WEIGHT +
    (totalRepos / REPOS_MEDIAN) * REPOS_WEIGHT +
    (issues / ISSUES_MEDIAN) * ISSUES_WEIGHT +
    (stargazers / STARS_MEDIAN) * STARS_WEIGHT +
    (prs / PRS_MEDIAN) * PRS_WEIGHT +
    (followers / FOLLOWERS_MEDIAN) * FOLLOWERS_WEIGHT +
    (contributions / CONTRIBUTIONS_MEDIAN) * CONTRIBUTIONS_WEIGHT;

  const normalizedScore = (score / TOTAL_WEIGHT) * 100;

  const level = (() => {
    if (normalizedScore >= 25) return "S+";
    if (normalizedScore >= 22.5) return "S";
    if (normalizedScore >= 20) return "A++";
    if (normalizedScore >= 17.5) return "A+";
    if (normalizedScore >= 12.5) return "A";
    if (normalizedScore >= 10) return "B+";
    if (normalizedScore >= 7.5) return "B";
    if (normalizedScore >= 5) return "C+";
    if (normalizedScore >= 2.5) return "C";
    return "D";
  })();

  const percentile = Math.max(0, Math.min(100, 100 - normalizedScore * 2));

  return {
    level,
    percentile: Math.round(percentile * 10) / 10,
    score: Math.round(normalizedScore * 10) / 10,
  };
};

async function makeGraphQLRequest(
  query: string,
  variables: Record<string, any>,
  token: string,
): Promise<any> {
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
        "Invalid GitHub token. Please check your GITHUB_TOKEN environment variable.",
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

  return result;
}

export async function fetchGitHubStats(
  username: string,
  githubToken: string,
  options: {
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
      { login: username },
      githubToken,
    );

    if (!result.data || !result.data.user) {
      throw new Error(`User '${username}' not found`);
    }

    const user = result.data.user;

    // Calculate total stars (excluding forks)
    const totalStars = user.repositories.nodes.reduce(
      (acc, repo) => acc + repo.stargazers.totalCount,
      0,
    );

    // Total commits
    const totalCommits =
      user.contributionsCollection.totalCommitContributions +
      user.contributionsCollection.restrictedContributionsCount;

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
      totalRepos: user.repositories.totalCount,
      totalCommits,
      contributions: contributedTo,
      followers: user.followers.totalCount,
      prs: totalPRs,
      issues: totalIssues,
      stargazers: totalStars,
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
      totalCommits:
        (contributions?.totalCommitContributions || 0) +
        (contributions?.restrictedContributionsCount || 0),
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

    // We need to iterate through all days from first contribution to today to handle gaps
    const startDate = new Date(stats.firstContribution);
    const endDate = new Date(today);

    // Reset stats for iteration
    stats.currentStreak.length = 0;
    stats.longestStreak.length = 0;

    let currentStreakStart = "";
    let currentStreakLength = 0;

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      const count = contributions[dateStr] || 0;
      stats.totalContributions += count; // This might double count if we iterate over dates array, but here we iterate over calendar days.
      // Wait, totalContributions should be sum of all counts. The loop above iterates all days.
      // But contributions object only has days with data? No, GraphQL returns all days in calendar.
      // Actually, my contributions object construction:
      // contributions[day.date] = day.contributionCount;
      // This includes 0 counts if GraphQL returns them. GraphQL usually returns all days in the requested range.

      // However, to be safe and handle gaps properly (if any), iterating by date is better.
      // But wait, `stats.totalContributions` was already calculated? No, I initialized it to 0.
      // But I am iterating `dates` (which are keys of `contributions`) in the previous logic.
      // Let's rewrite the loop to be robust.
    }

    // Re-calculating total contributions and streaks
    stats.totalContributions = 0;

    let tempStreakLength = 0;
    let tempStreakStart = "";
    let tempStreakEnd = "";

    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().split("T")[0];
      const count = contributions[dateStr] || 0;
      stats.totalContributions += count;

      if (count > 0 || (tempStreakLength > 0 && isExcluded(dateStr))) {
        tempStreakLength++;
        tempStreakEnd = dateStr;
        if (tempStreakLength === 1) {
          tempStreakStart = dateStr;
        }
      } else {
        if (tempStreakLength > stats.longestStreak.length) {
          stats.longestStreak.start = tempStreakStart;
          stats.longestStreak.end = tempStreakEnd;
          stats.longestStreak.length = tempStreakLength;
        }
        tempStreakLength = 0;
      }
    }

    // Check last streak
    if (tempStreakLength > stats.longestStreak.length) {
      stats.longestStreak.start = tempStreakStart;
      stats.longestStreak.end = tempStreakEnd;
      stats.longestStreak.length = tempStreakLength;
    }

    // Current streak is the streak ending today (or yesterday if today has no contribs yet?)
    // The PHP logic says:
    // "reset streak but give exception for today"
    // "if ($date != $today)" reset.

    // Let's re-implement the PHP logic exactly using the sorted dates array from `contributions`
    // But `contributions` might have gaps if I only populated it from GraphQL results and GraphQL results had gaps (unlikely for Calendar).
    // But `contributions` keys are from `contributionDays`.

    // Let's stick to the PHP logic translation which iterates over `contributions` map.
    // But I need to ensure `contributions` has entries for ALL days.
    // The GraphQL `contributionCalendar` returns all days.

    // So iterating `dates` (keys of `contributions`) is safe assuming GraphQL returns contiguous days.

    stats.totalContributions = 0;
    stats.currentStreak.length = 0;
    stats.longestStreak.length = 0;

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
