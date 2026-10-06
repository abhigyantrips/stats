import { fetchGitHubStats, fetchGitHubStreakStats } from "@/lib/github-fetcher";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateRank } from "@/lib/calculate-rank";
import worker from "@/index";

const baseUser = () => ({
  name: "Example",
  login: "example",
  contributionsCollection: {
    totalCommitContributions: 100,
    restrictedContributionsCount: 20,
    totalPullRequestReviewContributions: 2,
  },
  repositoriesContributedTo: { totalCount: 5 },
  pullRequests: { totalCount: 10 },
  mergedPullRequests: { totalCount: 5 },
  openIssues: { totalCount: 1 },
  closedIssues: { totalCount: 2 },
  followers: { totalCount: 10 },
  repositories: {
    totalCount: 1,
    nodes: [{ stargazers: { totalCount: 50 } }],
    pageInfo: { hasNextPage: false, endCursor: null as string | null },
  },
  repositoryDiscussions: { totalCount: 1 },
  repositoryDiscussionComments: { totalCount: 2 },
});
const cacheOptions = { origin: "https://example.workers.dev" };
let stored: Map<string, { response: Response; expires: number }>;
let now: number;
const upstream = vi.fn<typeof fetch>();
beforeEach(() => {
  now = 0;
  stored = new Map();
  upstream.mockReset();
  upstream.mockImplementation(async () =>
    Response.json({ data: { user: baseUser() } }),
  );
  vi.stubGlobal("fetch", upstream);
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (key: Request) => {
        const entry = stored.get(key.url);
        return entry && entry.expires > now
          ? entry.response.clone()
          : undefined;
      },
      put: async (key: Request, response: Response) => {
        const ttl = Number(
          response.headers.get("Cache-Control")?.match(/max-age=(\d+)/)?.[1],
        );
        stored.set(key.url, { response: response.clone(), expires: now + ttl });
      },
    }),
  });
});
afterEach(() => vi.unstubAllGlobals());

async function request(path: string) {
  return worker.fetch(new Request(cacheOptions.origin + path), {
    GITHUB_PAT: "test-token",
    GITHUB_USERNAME: "example",
  });
}

describe("GitHub counts", () => {
  it("does not treat private issues and PRs as commits", async () => {
    const stats = await fetchGitHubStats("example", "token");
    expect(stats.totalCommits).toBe(100);
  });
  it("uses REST search for all commits, including a valid zero", async () => {
    upstream.mockImplementation(async (url) =>
      String(url).includes("search/commits")
        ? Response.json({ total_count: 2000, incomplete_results: false })
        : Response.json({ data: { user: baseUser() } }),
    );
    const stats = await fetchGitHubStats("example", "token", {
      includeAllCommits: true,
    });
    expect(stats.totalCommits).toBe(2000);
    const search = upstream.mock.calls.find(([url]) =>
      String(url).includes("search/commits"),
    )!;
    expect(new URL(String(search[0])).searchParams.get("q")).toBe(
      "author:example",
    );
    upstream.mockImplementation(async (url) =>
      String(url).includes("search/commits")
        ? Response.json({ total_count: 0, incomplete_results: false })
        : Response.json({ data: { user: baseUser() } }),
    );
    expect(
      (await fetchGitHubStats("example", "token", { includeAllCommits: true }))
        .totalCommits,
    ).toBe(0);
  });
  it("rejects incomplete search totals without caching them", async () => {
    upstream.mockImplementation(async (url) =>
      String(url).includes("search/commits")
        ? Response.json({ total_count: 100, incomplete_results: true })
        : Response.json({ data: { user: baseUser() } }),
    );
    for (let attempt = 0; attempt < 2; attempt++) {
      await expect(
        fetchGitHubStats("example", "token", {
          includeAllCommits: true,
          cache: cacheOptions,
        }),
      ).rejects.toThrow("incomplete");
    }
    expect(
      upstream.mock.calls.filter(([url]) =>
        String(url).includes("search/commits"),
      ),
    ).toHaveLength(2);
  });
  it("counts stars beyond the first page", async () => {
    upstream.mockImplementation(async (_url, init) => {
      const { variables } = JSON.parse(init!.body as string);
      const user = baseUser();
      user.repositories = variables.after
        ? {
            totalCount: 101,
            nodes: [{ stargazers: { totalCount: 1 } }],
            pageInfo: { hasNextPage: false, endCursor: null },
          }
        : {
            totalCount: 101,
            nodes: Array.from({ length: 100 }, () => ({
              stargazers: { totalCount: 2 },
            })),
            pageInfo: { hasNextPage: true, endCursor: "next" },
          };
      return Response.json({ data: { user } });
    });
    expect((await fetchGitHubStats("example", "token")).totalStars).toBe(201);
    expect(upstream).toHaveBeenCalledTimes(2);
  });
});

describe("upstream rank behavior", () => {
  it("assigns C and 100th percentile to zero activity", () => {
    expect(
      calculateRank({
        commits: 0,
        prs: 0,
        issues: 0,
        reviews: 0,
        stars: 0,
        followers: 0,
      }),
    ).toEqual({ level: "C", percentile: 100, score: 0 });
  });
  it("places median activity at the 50th percentile in both commit modes", () => {
    for (const allCommits of [false, true]) {
      expect(
        calculateRank({
          allCommits,
          commits: allCommits ? 1000 : 250,
          prs: 50,
          issues: 25,
          reviews: 2,
          stars: 50,
          followers: 10,
        }),
      ).toEqual({ level: "B+", percentile: 50, score: 50 });
    }
  });
  it("includes reviews and keeps percentile bounded for very high activity", () => {
    const input = {
      commits: 250,
      prs: 50,
      issues: 25,
      reviews: 0,
      stars: 50,
      followers: 10,
    };
    expect(calculateRank({ ...input, reviews: 2 }).percentile).toBeLessThan(
      calculateRank(input).percentile,
    );
    const high = calculateRank({
      commits: 1e9,
      prs: 1e9,
      issues: 1e9,
      reviews: 1e9,
      stars: 1e9,
      followers: 1e9,
    });
    expect(high.level).toBe("S");
    expect(high.percentile).toBeGreaterThanOrEqual(0);
  });
});

describe("Worker data caching", () => {
  it("reuses GitHub data across styling and optional-row changes", async () => {
    expect((await request("/github/stats?theme=dark")).status).toBe(200);
    expect(
      (await request("/github/stats?theme=dracula&show=reviews")).status,
    ).toBe(200);
    expect(upstream).toHaveBeenCalledTimes(1);
    expect([...stored.keys()].some((key) => key.includes("test-token"))).toBe(
      false,
    );
  });
  it("expires after one hour and separates token permissions", async () => {
    await fetchGitHubStats("example", "token", { cache: cacheOptions });
    now = 3599;
    await fetchGitHubStats("example", "token", { cache: cacheOptions });
    expect(upstream).toHaveBeenCalledTimes(1);
    now = 3600;
    await fetchGitHubStats("example", "token", { cache: cacheOptions });
    await fetchGitHubStats("example", "new-token", { cache: cacheOptions });
    expect(upstream).toHaveBeenCalledTimes(3);
  });
  it("does not cache GitHub errors", async () => {
    upstream.mockResolvedValueOnce(
      Response.json({ errors: [{ message: "rate limited" }] }),
    );
    await expect(
      fetchGitHubStats("example", "token", { cache: cacheOptions }),
    ).rejects.toThrow("rate limited");
    expect(
      (await fetchGitHubStats("example", "token", { cache: cacheOptions }))
        .totalCommits,
    ).toBe(100);
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it("still serves data when cache access fails", async () => {
    vi.stubGlobal("caches", {
      open: async () => {
        throw new Error("unavailable");
      },
    });
    expect((await request("/github/stats")).status).toBe(200);
  });
  it("reuses historical calendars across excluded-day changes", async () => {
    const year = new Date().getUTCFullYear();
    upstream.mockImplementation(async (_url, init) => {
      const { variables } = JSON.parse(init!.body as string);
      const requestedYear = Number(variables.from.slice(0, 4));
      return Response.json({
        data: {
          user: {
            createdAt: `${year - 1}-01-01T00:00:00Z`,
            contributionsCollection: {
              contributionYears: [year, year - 1],
              contributionCalendar: {
                weeks: [
                  {
                    contributionDays: [
                      { date: `${requestedYear}-01-01`, contributionCount: 1 },
                    ],
                  },
                ],
              },
            },
          },
        },
      });
    });
    await fetchGitHubStreakStats("example", "token", [], cacheOptions);
    await fetchGitHubStreakStats("example", "token", ["Sun"], cacheOptions);
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  for (const endpoint of ["stats", "streak"]) {
    for (const parameter of ["user", "username"]) {
      it(`rejects other users on ${endpoint} using ${parameter}`, async () => {
        expect(
          (await request(`/github/${endpoint}?${parameter}=someone-else`))
            .status,
        ).toBe(400);
        expect(upstream).not.toHaveBeenCalled();
      });
    }
  }
});
