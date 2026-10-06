import { GitHubStats } from "@/templates/github/stats";
import { renderToString } from "hono/jsx/dom/server";
import type { StatsData } from "@/lib/stats-card";
import { describe, expect, it } from "vitest";
import { getCardColors } from "@/themes";

const stats: StatsData = {
  name: "Example",
  totalStars: 10,
  totalCommits: 100,
  totalIssues: 3,
  totalPRs: 10,
  totalPRsMerged: 5,
  mergedPRsPercentage: 50,
  totalReviews: 2,
  totalDiscussionsStarted: 1,
  totalDiscussionsAnswered: 2,
  contributedTo: 5,
  rank: { level: "B", percentile: 60, score: 40 },
};

describe("stats card layout", () => {
  for (const hideTitle of [true, false]) {
    it(`fits all optional rows with hide_title=${hideTitle}`, () => {
      const svg = renderToString(
        <GitHubStats
          stats={stats}
          colors={getCardColors({})}
          options={{
            hide_title: hideTitle,
            show: [
              "reviews",
              "prs_merged",
              "prs_merged_percentage",
              "discussions_started",
              "discussions_answered",
            ],
          }}
        />,
      );
      const height = Number(svg.match(/height="(\d+)"/)![1]);
      const bodyY = Number(
        svg.match(
          /data-testid="main-card-body" transform="translate\(0, ([\d.]+)\)"/,
        )![1],
      );
      const rows = [
        ...svg.matchAll(/<g transform="translate\(0, (\d+)\)">/g),
      ].map((match) => Number(match[1]));
      expect(rows).toHaveLength(10);
      expect(bodyY + Math.max(...rows) + 12.5).toBeLessThan(height - 20);
      const rankY = Number(
        svg.match(
          /data-testid="rank-circle" transform="translate\([^,]+, ([\d.-]+)\)"/,
        )![1],
      );
      expect(bodyY + rankY + 8).toBe(height / 2);
    });
  }
  it("preserves the default 195px height", () => {
    expect(
      renderToString(<GitHubStats stats={stats} colors={getCardColors({})} />),
    ).toContain('height="195"');
  });
});
