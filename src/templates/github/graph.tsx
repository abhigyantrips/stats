/*
 * Graph layout and animations adapted from GitHub README Activity Graph
 * https://github.com/Ashutosh00710/github-readme-activity-graph
 *
 * MIT License
 *
 * Copyright (c) 2020 Ashutosh Dwivedi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

import type { ActivityDay } from "@/lib/activity-graph";
import { graphPath } from "@/lib/graph-path";

export interface GraphOptions {
  width: number;
  height: number;
  radius: number;
  hideTitle: boolean;
  hideBorder: boolean;
  title: string;
  area: boolean;
  grid: boolean;
  disableAnimations: boolean;
}

export function GitHubGraph({
  days,
  colors,
  options,
}: {
  days: ActivityDay[];
  colors: {
    titleColor: string;
    textColor: string;
    bgColor: string;
    borderColor: string;
    lineColor: string;
    pointColor: string;
    areaColor: string;
  };
  options: GraphOptions;
}) {
  const { width, height } = options;
  // Upstream chartPadding (80, 50, 20, 20), plus 70px Y and 50px X axes.
  const left = 90;
  const right = width - 50;
  const top = 80;
  const bottom = height - 70;
  const maxCount = Math.max(1, ...days.map((day) => day.contributionCount));
  const targetTicks = Math.max(2, Math.floor((bottom - top) / 30));
  const magnitude = 10 ** Math.floor(Math.log10(maxCount / targetTicks));
  const roughStep = maxCount / targetTicks / magnitude;
  const step = Math.max(
    1,
    [1, 2, 5, 10].find((value) => value >= roughStep)! * magnitude,
  );
  const ceiling = Math.ceil(maxCount / step) * step;
  const ticks = Array.from(
    { length: Math.round(ceiling / step) + 1 },
    (_, i) => i * step,
  );
  const y = (count: number) => bottom - (count / ceiling) * (bottom - top);
  const points = days.map((day, index) => ({
    ...day,
    x:
      days.length === 1
        ? (left + right) / 2
        : left + (index / (days.length - 1)) * (right - left),
    y: y(day.contributionCount),
  }));
  const line = graphPath(points);
  const area =
    points.length > 0
      ? `${line} L${points.at(-1)!.x},${bottom} L${points[0].x},${bottom} Z`
      : "";
  // Keep every daily label at the reference width; thin labels on narrow cards.
  const labelEvery = Math.max(
    1,
    Math.ceil(days.length / Math.max(2, Math.floor((right - left) / 25))),
  );
  const total = days.reduce((sum, day) => sum + day.contributionCount, 0);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-labelledby="graph-title graph-description"
    >
      <title id="graph-title">{options.title}</title>
      <desc id="graph-description">{`${total} contributions from ${days[0]?.date} to ${days.at(-1)?.date}. Dates use UTC; each point's title includes its date and count.`}</desc>
      <style>{`
        svg { font: 600 18px 'Segoe UI', Ubuntu, sans-serif; user-select: none; }
        .header { font: 600 20px 'Segoe UI', Ubuntu, sans-serif; fill: ${colors.titleColor}; }
        .graph-label { font-size: 12px; fill: ${colors.textColor}; }
        ${
          options.disableAnimations
            ? ""
            : `
          .graph-line { stroke-dasharray: 5000; stroke-dashoffset: 5000; animation: dash 5s ease-in-out forwards; }
          .graph-point { animation: blink 1s ease-in-out forwards; }
          @keyframes dash { to { stroke-dashoffset: 0; } }
          @keyframes blink { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
          @media (prefers-reduced-motion: reduce) {
            .graph-line { animation: none; stroke-dasharray: none; stroke-dashoffset: 0; }
            .graph-point { animation: none; opacity: 1; transform: none; }
          }
        `
        }
      `}</style>
      <rect
        data-testid="card-bg"
        x="0.5"
        y="0.5"
        width={width - 1}
        height={height - 1}
        rx={options.radius}
        fill={colors.bgColor}
        stroke={colors.borderColor}
        stroke-opacity={options.hideBorder ? 0 : 1}
      />
      {!options.hideTitle && (
        <text
          data-testid="card-title"
          x={width / 2}
          y="38"
          text-anchor="middle"
          class="header"
        >
          {options.title}
        </text>
      )}
      <g data-testid="main-card-body">
        {ticks.map((tick) => (
          <g>
            {options.grid && (
              <line
                class="graph-grid"
                x1={left}
                x2={right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={colors.textColor}
                stroke-opacity="0.3"
                stroke-dasharray="2"
              />
            )}
            <text
              x={left - 10}
              y={y(tick) + 4.5}
              text-anchor="end"
              class="graph-label"
            >
              {tick}
            </text>
          </g>
        ))}
        {options.grid &&
          points.map((point) => (
            <line
              class="graph-grid"
              x1={point.x}
              x2={point.x}
              y1={top}
              y2={bottom}
              stroke={colors.textColor}
              stroke-opacity="0.3"
              stroke-dasharray="2"
            />
          ))}
        {options.area && (
          <path
            data-testid="graph-area"
            d={area}
            fill={colors.areaColor}
            fill-opacity="0.1"
          />
        )}
        <path
          data-testid="graph-line"
          class="graph-line"
          pathLength="5000"
          d={line}
          stroke={colors.lineColor}
          stroke-width="4"
          fill="none"
        />
        {points.map((point, index) => (
          <g>
            <circle
              data-testid="graph-point"
              class="graph-point"
              cx={point.x}
              cy={point.y}
              r="5"
              fill={colors.pointColor}
            >
              <title>{`${point.date}: ${point.contributionCount} contributions`}</title>
            </circle>
            {(index % labelEvery === 0 ||
              (index === points.length - 1 &&
                index % labelEvery > labelEvery / 2)) && (
              <text
                x={point.x - 4.5}
                y={bottom + 20}
                text-anchor="start"
                class="graph-label"
              >
                {Number(point.date.slice(8))}
              </text>
            )}
          </g>
        ))}
        <text
          x={(left + right) / 2}
          y={height - 20}
          dominant-baseline="text-after-edge"
          text-anchor="middle"
          class="graph-label"
        >
          Days
        </text>
        <text
          transform={`rotate(-90, 20, ${(top + bottom) / 2})`}
          x="20"
          y={(top + bottom) / 2}
          dominant-baseline="hanging"
          text-anchor="middle"
          class="graph-label"
        >
          Contributions
        </text>
      </g>
    </svg>
  );
}
