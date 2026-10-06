/*
 * Rank calculation adapted from GitHub README Stats
 * https://github.com/anuraghazra/github-readme-stats/blob/master/src/calculateRank.js
 *
 * MIT License
 *
 * Copyright (c) 2020 Anurag Hazra
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/** Matches github-readme-stats' weighted CDF rank. */
export function calculateRank({
  allCommits = false,
  commits,
  prs,
  issues,
  reviews,
  stars,
  followers,
}: {
  allCommits?: boolean;
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  stars: number;
  followers: number;
}) {
  const exponential = (value: number) => 1 - 2 ** -value;
  const logNormal = (value: number) => value / (1 + value);
  const percentile =
    100 *
    (1 -
      (2 * exponential(commits / (allCommits ? 1000 : 250)) +
        3 * exponential(prs / 50) +
        exponential(issues / 25) +
        exponential(reviews / 2) +
        4 * logNormal(stars / 50) +
        logNormal(followers / 10)) /
        12);
  const thresholds = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const levels = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C"];
  return {
    level: levels[thresholds.findIndex((limit) => percentile <= limit)],
    percentile,
    score: 100 - percentile,
  };
}
