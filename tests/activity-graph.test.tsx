import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { activityDates, getActivityRange } from "@/lib/activity-graph";
import { fetchGitHubActivity } from "@/lib/github-fetcher";
import worker from "@/index";

const origin = "https://example.workers.dev";
const upstream = vi.fn<typeof fetch>();
let stored: Map<string, Response>;

function calendar(
  days: { date: string; contributionCount: number }[],
  createdAt = "2020-01-01T00:00:00Z",
) {
  return Response.json({
    data: {
      user: {
        createdAt,
        contributionsCollection: {
          contributionCalendar: { weeks: [{ contributionDays: days }] },
        },
      },
    },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T23:30:00Z"));
  stored = new Map();
  upstream.mockReset();
  upstream.mockImplementation(async (_url, init) => {
    const { variables } = JSON.parse(init!.body as string);
    return calendar(
      activityDates({
        from: variables.from.slice(0, 10),
        to: variables.to.slice(0, 10),
      })
        .reverse()
        .map((date, i) => ({ date, contributionCount: i % 5 })),
    );
  });
  vi.stubGlobal("fetch", upstream);
  vi.stubGlobal("caches", {
    open: async () => ({
      match: async (key: Request) => stored.get(key.url)?.clone(),
      put: async (key: Request, response: Response) => {
        stored.set(key.url, response.clone());
      },
    }),
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const request = (
  query = "",
  env = { GITHUB_USERNAME: "example", GITHUB_PAT: "test-token" },
) =>
  worker.fetch(
    new Request(`${origin}/github/graph${query ? `?${query}` : ""}`),
    env,
  );

describe("activity date ranges", () => {
  it("includes today and crosses year boundaries in UTC", () => {
    const range = getActivityRange({});
    expect(range).toEqual({ from: "2025-12-16", to: "2026-01-15" });
    expect(activityDates(range)).toHaveLength(31);
    expect(getActivityRange({ days: "1" })).toEqual({
      from: "2026-01-15",
      to: "2026-01-15",
    });
    expect(activityDates(getActivityRange({ days: "90" }))).toHaveLength(90);
  });
  it("uses inclusive explicit ranges and handles leap days", () => {
    expect(
      activityDates(
        getActivityRange({ from: "2024-02-28", to: "2024-03-01", days: "1" }),
      ),
    ).toEqual(["2024-02-28", "2024-02-29", "2024-03-01"]);
    expect(getActivityRange({ to: "2024-03-01", days: "2" })).toEqual({
      from: "2024-02-29",
      to: "2024-03-01",
    });
    expect(getActivityRange({ from: "2024-02-28", days: "3" })).toEqual({
      from: "2024-02-28",
      to: "2024-03-01",
    });
    expect(getActivityRange({ from: "2026-01-14" })).toEqual({
      from: "2026-01-14",
      to: "2026-01-15",
    });
  });
  for (const query of [
    "days=0",
    "days=91",
    "days=2.5",
    "days=",
    "from=2025-02-29",
    "to=2026-02-30",
    "from=bad",
    "to=2026-01-16",
    "from=2026-01-16",
    "from=2026-01-10&to=2026-01-01",
    "from=2025-01-01&to=2026-01-01",
    "height=199",
    "height=601",
    "height=Infinity",
    "radius=-1",
    "radius=17",
    "card_width=299",
  ]) {
    it(`rejects invalid options before GitHub: ${query}`, async () => {
      expect((await request(query)).status).toBe(400);
      expect(upstream).not.toHaveBeenCalled();
    });
  }
});

describe("activity graph endpoint", () => {
  it("serves a chronological SVG with the requested GitHub time boundaries", async () => {
    const response = await request("from=2025-12-31&to=2026-01-02");
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/svg+xml");
    expect(response.headers.get("Cache-Control")).toBe("public, max-age=1800");
    const svg = await response.text();
    expect(svg.match(/data-testid="graph-point"/g)).toHaveLength(3);
    expect(svg.indexOf("2025-12-31: 2")).toBeLessThan(
      svg.indexOf("2026-01-02: 0"),
    );
    expect(svg).toContain("Date (UTC)");
    expect(svg).not.toContain('data-testid="graph-area"');
    const { variables } = JSON.parse(upstream.mock.calls[0][1]!.body as string);
    expect(variables).toEqual({
      login: "example",
      from: "2025-12-31T00:00:00Z",
      to: "2026-01-02T23:59:59Z",
    });
  });
  it("applies each color, area fill, dimensions, fractional radius, and grid toggle", async () => {
    const svg = await (
      await request(
        "days=3&bg_color=111111&border_color=222222&color=333333&title_color=444444&line=555555&point=666666&area=true&area_color=777777&height=200&card_width=400&radius=2.5&grid=false&disable_animations=true",
      )
    ).text();
    expect(svg).toContain('width="400" height="200"');
    expect(svg).toContain('rx="2.5"');
    expect(svg).toContain('fill="#111111"');
    expect(svg).toContain('stroke="#222222"');
    expect(svg).toContain("fill: #333333");
    expect(svg).toContain("fill: #444444");
    expect(svg).toMatch(/data-testid="graph-line"[^>]+stroke="#555555"/);
    expect(svg).toMatch(/data-testid="graph-point"[^>]+fill="#666666"/);
    expect(svg).toMatch(/data-testid="graph-area"[^>]+fill="#777777"/);
    expect(svg).not.toContain('stroke-dasharray="3 4"');
    expect(svg).toContain("animation: none");
  });
  it("uses existing theme graph colors and falls back on invalid overrides", async () => {
    const svg = await (
      await request(
        "days=2&theme=dark&line=invalid&color=invalid&bg_color=invalid&area=true",
      )
    ).text();
    expect(svg).toContain('fill="#151515"');
    expect(svg).toContain('stroke="#fb8c00"');
    expect(svg).toMatch(/data-testid="graph-area"[^>]+fill="#fb8c00"/);
    expect(svg).toContain("fill: #fefefe");
    expect(svg).toContain('stroke-dasharray="3 4"');
  });
  for (const theme of ["unknown", "constructor", "__proto__"]) {
    it(`falls back to the default for an unknown theme: ${theme}`, async () => {
      const response = await request(`days=1&theme=${theme}`);
      expect(response.status).toBe(200);
      expect(await response.text()).toContain('stroke="#4c71f2"');
    });
  }
  it("escapes custom titles and hides the visible title and border", async () => {
    const title = encodeURIComponent('<script>alert("x")</script> & activity');
    const svg = await (await request(`days=1&custom_title=${title}`)).text();
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    const hidden = await (
      await request(
        `days=1&custom_title=${title}&hide_title=true&hide_border=true`,
      )
    ).text();
    expect(hidden).not.toContain('data-testid="card-title"');
    expect(hidden).toContain('stroke-opacity="0"');
    expect(hidden).toContain("&lt;script&gt;");
  });
  it("renders zero activity and single-day ranges with finite coordinates", async () => {
    upstream.mockResolvedValue(
      calendar([{ date: "2026-01-15", contributionCount: 0 }]),
    );
    const svg = await (await request("days=1&area=true")).text();
    expect(svg).not.toMatch(/NaN|Infinity|undefined/);
    expect(svg.match(/data-testid="graph-point"/g)).toHaveLength(1);
    expect(svg).toContain('cx="517.5"');
    expect(svg).toContain("0 contributions from 2026-01-15 to 2026-01-15");
  });
  for (const parameter of ["user", "username"]) {
    it(`rejects other users via ${parameter}`, async () => {
      expect((await request(`${parameter}=someone-else`)).status).toBe(400);
      expect(upstream).not.toHaveBeenCalled();
      expect((await request(`${parameter}=EXAMPLE&days=1`)).status).toBe(200);
    });
  }
  it("requires valid configuration", async () => {
    expect(
      (await request("", { GITHUB_USERNAME: "bad/name", GITHUB_PAT: "token" }))
        .status,
    ).toBe(500);
    expect(
      (await request("", { GITHUB_USERNAME: "example", GITHUB_PAT: "" }))
        .status,
    ).toBe(500);
    expect(upstream).not.toHaveBeenCalled();
  });
});

describe("activity data and caching", () => {
  it("reuses data for styling changes and separates date ranges and tokens", async () => {
    await request("days=2&theme=dark");
    await request("days=2&theme=dracula&area=true&grid=false");
    expect(upstream).toHaveBeenCalledTimes(1);
    await request("days=3");
    await request("days=2", {
      GITHUB_USERNAME: "example",
      GITHUB_PAT: "new-token",
    });
    expect(upstream).toHaveBeenCalledTimes(3);
    expect([...stored.keys()].join(" ")).not.toContain("test-token");
  });
  it("fills dates before account creation and discards days outside the requested range", async () => {
    upstream.mockResolvedValue(
      calendar(
        [
          { date: "2026-01-14", contributionCount: 3 },
          { date: "2026-01-15", contributionCount: 1 },
          { date: "2026-01-16", contributionCount: 100 },
        ],
        "2026-01-14T12:00:00Z",
      ),
    );
    expect(
      await fetchGitHubActivity("example", "token", {
        from: "2026-01-13",
        to: "2026-01-15",
      }),
    ).toEqual([
      { date: "2026-01-13", contributionCount: 0 },
      { date: "2026-01-14", contributionCount: 3 },
      { date: "2026-01-15", contributionCount: 1 },
    ]);
  });
  it("does not cache API errors, missing dates, or invalid contribution counts", async () => {
    for (const response of [
      Response.json({ errors: [{ message: "rate limited" }] }),
      calendar([]),
      calendar([{ date: "2026-01-15", contributionCount: -1 }]),
      Response.json({ data: { user: { createdAt: "2020-01-01T00:00:00Z" } } }),
    ]) {
      stored.clear();
      upstream.mockResolvedValue(response);
      expect((await request("days=1")).status).toBe(500);
      expect(stored.size).toBe(0);
    }
  });
});
