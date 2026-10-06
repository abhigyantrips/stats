import type { ActivityDay } from "@/lib/activity-graph";
import type { CardColors } from "@/themes";
import { Card } from "@/components/card";

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
  colors: CardColors & {
    lineColor: string;
    pointColor: string;
    areaColor: string;
  };
  options: GraphOptions;
}) {
  const { width, height, hideTitle } = options;
  const bodyY = hideTitle ? 25 : 55;
  const left = 65;
  const right = width - 30;
  const top = 15;
  const bottom = height - bodyY - 55;
  const maxCount = Math.max(1, ...days.map((day) => day.contributionCount));
  const magnitude = 10 ** Math.floor(Math.log10(maxCount / 4));
  const roughStep = maxCount / 4 / magnitude;
  const step = [1, 2, 5, 10].find((value) => value >= roughStep)! * magnitude;
  const ceiling = Math.max(1, Math.ceil(maxCount / step) * step);
  const tickStep = Math.max(1, step);
  const ticks = Array.from(
    { length: Math.floor(ceiling / tickStep) + 1 },
    (_, i) => i * tickStep,
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
  const line = points
    .map(
      (point, i) =>
        `${i === 0 ? "M" : "L"}${point.x.toFixed(2)},${point.y.toFixed(2)}`,
    )
    .join(" ");
  const area =
    points.length > 0
      ? `${line} L${points.at(-1)!.x},${bottom} L${points[0].x},${bottom} Z`
      : "";
  const labelEvery = Math.max(
    1,
    Math.ceil(days.length / Math.max(2, Math.floor((right - left) / 65))),
  );
  const total = days.reduce((sum, day) => sum + day.contributionCount, 0);

  return (
    <Card
      width={width}
      height={height}
      title={options.title}
      colors={colors}
      borderRadius={options.radius}
      hideBorder={options.hideBorder}
      hideTitle={hideTitle}
      paddingY={hideTitle ? 25 : 35}
      a11yTitle={options.title}
      a11yDesc={`${total} contributions from ${days[0]?.date} to ${days.at(-1)?.date}. Daily counts are included in each point's title.`}
      css={`
        .graph-label {
          font:
            11px "Segoe UI",
            Ubuntu,
            Sans-Serif;
          fill: ${colors.textColor};
        }
        ${options.disableAnimations ? ".header { animation: none; }" : ""}
      `}
    >
      {ticks.map((tick) => (
        <g>
          {options.grid && (
            <line
              x1={left}
              x2={right}
              y1={y(tick)}
              y2={y(tick)}
              stroke={colors.textColor}
              stroke-opacity="0.15"
              stroke-dasharray="3 4"
            />
          )}
          <text
            x={left - 10}
            y={y(tick) + 4}
            text-anchor="end"
            class="graph-label"
          >
            {tick}
          </text>
        </g>
      ))}
      <line
        x1={left}
        x2={right}
        y1={bottom}
        y2={bottom}
        stroke={colors.textColor}
        stroke-opacity="0.4"
      />
      {options.area && (
        <path
          data-testid="graph-area"
          d={area}
          fill={colors.areaColor}
          fill-opacity="0.2"
        />
      )}
      <path
        data-testid="graph-line"
        d={line}
        stroke={colors.lineColor}
        stroke-width="2"
        stroke-linejoin="round"
        fill="none"
      />
      {points.map((point, index) => (
        <g>
          <circle
            data-testid="graph-point"
            cx={point.x}
            cy={point.y}
            r="3"
            fill={colors.pointColor}
          >
            <title>{`${point.date}: ${point.contributionCount} contributions`}</title>
          </circle>
          {(index % labelEvery === 0 ||
            (index === points.length - 1 &&
              index % labelEvery > labelEvery / 2)) && (
            <text
              x={point.x}
              y={bottom + 22}
              text-anchor="middle"
              class="graph-label"
            >
              {point.date.slice(5)}
            </text>
          )}
        </g>
      ))}
      <text
        x={(left + right) / 2}
        y={bottom + 42}
        text-anchor="middle"
        class="graph-label"
      >
        Date (UTC)
      </text>
      <text
        transform={`translate(20, ${(top + bottom) / 2}) rotate(-90)`}
        text-anchor="middle"
        class="graph-label"
      >
        Contributions
      </text>
    </Card>
  );
}
