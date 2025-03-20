import { Theme } from "@/types/theme";
import { FC } from "hono/jsx";

interface GitHubContributionsProps {
  width: number;
  height: number;
  theme: Theme;
  title: string;
  radius: number;
  contributions: { contributionCount: number; date: string }[];
}

export const GitHubContributions: FC<GitHubContributionsProps> = ({
  width,
  height,
  theme,
  title,
  radius,
  contributions,
}) => {
  // Calculate the center of the graph area
  const centerX = width / 2;
  const centerY = height / 2 + 20;

  // Calculate total contributions
  const totalContributions = contributions.reduce(
    (sum, day) => sum + day.contributionCount,
    0,
  );

  const chart = (
    <g>
      <text
        x={centerX}
        y={centerY}
        fontSize="20"
        fontWeight="bold"
        fill={theme.titleColor}
        textAnchor="middle"
      >
        Total Contributions: {totalContributions}
      </text>
    </g>
  );

  return (
    <svg
      width={`${width}`}
      height={`${height}`}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect
        xmlns="http://www.w3.org/2000/svg"
        data-testid="card_bg"
        id="cardBg"
        x="0"
        y="0"
        rx={`${radius}`}
        height="100%"
        stroke="#E4E2E2"
        fillOpacity="1"
        width="100%"
        fill={theme.backgroundColor}
        strokeOpacity="1"
        style={{ stroke: theme.borderColor, strokeWidth: 1 }}
      />

      <style>
        {`
          body {
            font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
          }
          .header {
            font: 600 20px 'Segoe UI', Ubuntu, Sans-Serif;
            text-align: center;
            color: ${theme.titleColor};
            margin-top: 20px;
          }
          svg {
            font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
            user-select: none;
          }
        `}
      </style>

      <foreignObject x="0" y="0" width={`${width}`} height="50">
        <h1 xmlns="http://www.w3.org/1999/xhtml" class="header">
          {title}
        </h1>
      </foreignObject>
      {chart}
    </svg>
  );
};
