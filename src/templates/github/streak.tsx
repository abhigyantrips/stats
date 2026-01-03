import { CardColors, translations, kFormatter } from "@/lib/stats-card";
import { StreakStats } from "@/lib/github-fetcher";
import { FC } from "hono/jsx";

interface GitHubStreakProps {
  stats: StreakStats;
  colors: CardColors;
  options?: {
    hide_border?: boolean;
    hide_title?: boolean;
    card_width?: number;
    border_radius?: number;
    disable_animations?: boolean;
    custom_title?: string;
  };
}

export const GitHubStreak: FC<GitHubStreakProps> = ({
  stats,
  colors,
  options = {},
}) => {
  const {
    hide_border = false,
    card_width = 495,
    border_radius = 4.5,
    disable_animations = false,
  } = options;

  const { titleColor, textColor, ringColor, bgColor, borderColor } = colors;

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
    }).format(date);
  };

  const styles = `
    .stat {
      font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${textColor};
    }
    @supports(-moz-appearance: auto) {
      .stat { font-size:12px; }
    }
    .stagger {
      opacity: 0;
      animation: fadeInAnimation 0.3s ease-in-out forwards;
    }
    .stat-value {
      font: 700 28px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${textColor};
    }
    .stat-label {
      font: 400 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${textColor};
    }
    .date-range {
      font: 400 12px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${textColor};
      opacity: 0.7;
    }
    .fire-icon {
      fill: ${ringColor};
    }
    .ring {
      stroke: ${ringColor};
      stroke-width: 5;
      fill: none;
      opacity: 0;
      animation: fadein 0.5s linear forwards 0.4s;
    }
    .current-streak-label {
      font: 700 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${ringColor};
      opacity: 0;
      animation: fadein 0.5s linear forwards 0.9s;
    }
    .current-streak-value {
      font: 700 28px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${textColor};
      animation: currstreak 0.6s linear forwards;
    }
    .separator {
      stroke: ${textColor};
      stroke-width: 1;
      opacity: 0.2;
    }
    @keyframes fadeInAnimation {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes currstreak {
        0% { font-size: 3px; opacity: 0.2; }
        80% { font-size: 34px; opacity: 1; }
        100% { font-size: 28px; opacity: 1; }
    }
    @keyframes fadein {
        0% { opacity: 0; }
        100% { opacity: 1; }
    }
    ${disable_animations ? "* { animation-duration: 0s !important; animation-delay: 0s !important; }" : ""}
  `;

  const height = 195;
  const rectWidth = card_width - 1;
  const rectHeight = height - 1;

  // Calculate offsets based on card width (3 columns)
  const columnWidth = card_width / 3;
  const totalContributionsOffset = columnWidth / 2;
  const currentStreakOffset = columnWidth * 1.5;
  const longestStreakOffset = columnWidth * 2.5;

  return (
    <svg
      width={card_width}
      height={height}
      viewBox={`0 0 ${card_width} ${height}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <style>{styles}</style>
      <defs>
        <clipPath id="outer_rectangle">
          <rect width={card_width} height={height} rx={border_radius} />
        </clipPath>
        <mask id="mask_out_ring_behind_fire">
          <rect width={card_width} height={height} fill="white" />
          <ellipse
            id="mask-ellipse"
            cx={currentStreakOffset}
            cy="32"
            rx="13"
            ry="18"
            fill="black"
          />
        </mask>
        {Array.isArray(bgColor) && (
          <linearGradient
            id="gradient"
            gradientTransform={`rotate(${bgColor[0]})`}
            gradientUnits="userSpaceOnUse"
          >
            {bgColor.slice(1).map((color, i) => {
              const offset = (i * 100) / (bgColor.length - 2);
              return <stop key={i} offset={`${offset}%`} stop-color={color} />;
            })}
          </linearGradient>
        )}
      </defs>

      <g clip-path="url(#outer_rectangle)">
        <rect
          stroke={borderColor}
          fill={Array.isArray(bgColor) ? "url(#gradient)" : bgColor}
          rx={border_radius}
          x="0.5"
          y="0.5"
          width={rectWidth}
          height={rectHeight}
          stroke-opacity={hide_border ? 0 : 1}
        />

        {/* Separators */}
        <line
          x1={columnWidth}
          y1="28"
          x2={columnWidth}
          y2="170"
          vector-effect="non-scaling-stroke"
          stroke-width="1"
          stroke={textColor}
          stroke-opacity="0.2"
          stroke-linejoin="miter"
          stroke-linecap="square"
          stroke-miterlimit="3"
        />
        <line
          x1={columnWidth * 2}
          y1="28"
          x2={columnWidth * 2}
          y2="170"
          vector-effect="non-scaling-stroke"
          stroke-width="1"
          stroke={textColor}
          stroke-opacity="0.2"
          stroke-linejoin="miter"
          stroke-linecap="square"
          stroke-miterlimit="3"
        />

        {/* Total Contributions */}
        <g transform={`translate(${totalContributionsOffset}, 48)`}>
          <text
            class="stat-value"
            x="0"
            y="32"
            text-anchor="middle"
            style="opacity: 0; animation: fadein 0.5s linear forwards 0.6s"
          >
            {stats.totalContributions.toLocaleString()}
          </text>
          <text
            class="stat-label"
            x="0"
            y="68"
            text-anchor="middle"
            style="opacity: 0; animation: fadein 0.5s linear forwards 0.7s"
          >
            {translations.totalContributions}
          </text>
          <text
            class="date-range"
            x="0"
            y="98"
            text-anchor="middle"
            style="opacity: 0; animation: fadein 0.5s linear forwards 0.8s"
          >
            {formatDate(stats.firstContribution)} - Present
          </text>
        </g>

        {/* Current Streak */}
        <g>
          <g transform={`translate(${currentStreakOffset}, 108)`}>
            <text
              class="current-streak-label"
              x="0"
              y="32"
              text-anchor="middle"
            >
              {translations.currentStreak}
            </text>
            <text
              class="date-range"
              x="0"
              y="53"
              text-anchor="middle"
              style="opacity: 0; animation: fadein 0.5s linear forwards 0.9s"
            >
              {formatDate(stats.currentStreak.end)}
            </text>
          </g>

          {/* Ring around number */}
          <g mask="url(#mask_out_ring_behind_fire)">
            <circle class="ring" cx={currentStreakOffset} cy="71" r="40" />
          </g>

          {/* Fire icon */}
          <g
            transform={`translate(${currentStreakOffset}, 19.5)`}
            style="opacity: 0; animation: fadein 0.5s linear forwards 0.6s"
          >
            <path
              d="M -12 -0.5 L 15 -0.5 L 15 23.5 L -12 23.5 L -12 -0.5 Z"
              fill="none"
            />
            <path
              d="M 1.5 0.67 C 1.5 0.67 2.24 3.32 2.24 5.47 C 2.24 7.53 0.89 9.2 -1.17 9.2 C -3.23 9.2 -4.79 7.53 -4.79 5.47 L -4.76 5.11 C -6.78 7.51 -8 10.62 -8 13.99 C -8 18.41 -4.42 22 0 22 C 4.42 22 8 18.41 8 13.99 C 8 8.6 5.41 3.79 1.5 0.67 Z M -0.29 19 C -2.07 19 -3.51 17.6 -3.51 15.86 C -3.51 14.24 -2.46 13.1 -0.7 12.74 C 1.07 12.38 2.9 11.53 3.92 10.16 C 4.31 11.45 4.51 12.81 4.51 14.2 C 4.51 16.85 2.36 19 -0.29 19 Z"
              class="fire-icon"
            />
          </g>

          {/* Current Streak big number */}
          <g transform={`translate(${currentStreakOffset}, 48)`}>
            <text
              class="current-streak-value"
              x="0"
              y="32"
              text-anchor="middle"
            >
              {stats.currentStreak.length}
            </text>
          </g>
        </g>

        {/* Longest Streak */}
        <g transform={`translate(${longestStreakOffset}, 48)`}>
          <text
            class="stat-value"
            x="0"
            y="32"
            text-anchor="middle"
            style="opacity: 0; animation: fadein 0.5s linear forwards 1.2s"
          >
            {stats.longestStreak.length}
          </text>
          <text
            class="stat-label"
            x="0"
            y="68"
            text-anchor="middle"
            style="opacity: 0; animation: fadein 0.5s linear forwards 1.3s"
          >
            {translations.longestStreak}
          </text>
          <text
            class="date-range"
            x="0"
            y="98"
            text-anchor="middle"
            style="opacity: 0; animation: fadein 0.5s linear forwards 1.4s"
          >
            {formatDate(stats.longestStreak.start)} -{" "}
            {formatDate(stats.longestStreak.end)}
          </text>
        </g>
      </g>
    </svg>
  );
};
