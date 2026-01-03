import {
  StatsData,
  StatCardOptions,
  CardColors,
  clampValue,
  kFormatter,
  measureText,
  calculateCircleProgress,
  icons,
  getRankIcon,
  translations,
  CARD_MIN_WIDTH,
  RANK_CARD_MIN_WIDTH,
  RANK_ONLY_CARD_MIN_WIDTH,
} from "@/lib/stats-card";
import { Card } from "@/components/card";
import { FC } from "hono/jsx";

interface GitHubStatsProps {
  stats: StatsData;
  options?: Partial<StatCardOptions>;
  colors: CardColors;
}

const StatItem: FC<{
  icon: string;
  label: string;
  value: number;
  id: string;
  unitSymbol?: string;
  index: number;
  showIcons: boolean;
  shiftValuePos: number;
  bold: boolean;
  numberFormat: string;
  numberPrecision?: number;
}> = ({
  icon,
  label,
  value,
  id,
  unitSymbol,
  index,
  showIcons,
  shiftValuePos,
  bold,
  numberFormat,
  numberPrecision,
}) => {
  const precision =
    typeof numberPrecision === "number" && !isNaN(numberPrecision)
      ? clampValue(numberPrecision, 0, 2)
      : undefined;
  const kValue =
    numberFormat.toLowerCase() === "long" || id === "prs_merged_percentage"
      ? value
      : kFormatter(value, precision);
  const staggerDelay = (index + 3) * 150;

  return (
    <g
      class="stagger"
      style={`animation-delay: ${staggerDelay}ms`}
      transform="translate(25, 0)"
    >
      {showIcons && (
        <svg
          data-testid="icon"
          class="icon"
          viewBox="0 0 16 16"
          version="1.1"
          width="16"
          height="16"
        >
          <g dangerouslySetInnerHTML={{ __html: icon }} />
        </svg>
      )}
      <text
        class={`stat ${bold ? "bold" : "not_bold"}`}
        x={showIcons ? "25" : "0"}
        y="12.5"
      >
        {label}:
      </text>
      <text
        class={`stat ${bold ? "bold" : "not_bold"}`}
        x={(showIcons ? 140 : 120) + shiftValuePos}
        y="12.5"
        data-testid={id}
      >
        {kValue}
        {unitSymbol ? ` ${unitSymbol}` : ""}
      </text>
    </g>
  );
};

const RankCircle: FC<{
  rank: StatsData["rank"];
  ringColor: string;
  xTranslation: number;
  yTranslation: number;
  rankIconType: string;
}> = ({ rank, ringColor, xTranslation, yTranslation, rankIconType }) => {
  return (
    <g
      data-testid="rank-circle"
      transform={`translate(${xTranslation}, ${yTranslation})`}
    >
      <circle class="rank-circle-rim" cx="-10" cy="8" r="50" />
      <circle class="rank-circle" cx="-10" cy="8" r="50" />
      <g
        class="rank-text"
        dangerouslySetInnerHTML={{
          __html: getRankIcon(rankIconType, rank.level, rank.percentile),
        }}
      />
    </g>
  );
};

export const GitHubStats: FC<GitHubStatsProps> = ({
  stats,
  options = {},
  colors,
}) => {
  const {
    hide = [],
    show_icons = false,
    hide_title = true,
    hide_border = false,
    card_width,
    hide_rank = false,
    include_all_commits = false,
    commits_year,
    line_height = 25,
    text_bold = true,
    border_radius = 4.5,
    number_format = "short",
    number_precision,
    disable_animations = false,
    rank_icon = "default",
    show = [],
    custom_title,
  } = options;

  const lheight = parseInt(String(line_height), 10);
  const { iconColor, textColor, ringColor } = colors;

  // Build stats object
  const STATS: Record<string, any> = {
    stars: {
      icon: icons.star,
      label: translations.totalstars,
      value: stats.totalStars,
      id: "stars",
    },
    commits: {
      icon: icons.commits,
      label: `${translations.commits}${
        include_all_commits
          ? ""
          : commits_year
            ? ` (${commits_year})`
            : ` (${translations.lastyear})`
      }`,
      value: stats.totalCommits,
      id: "commits",
    },
    prs: {
      icon: icons.prs,
      label: translations.prs,
      value: stats.totalPRs,
      id: "prs",
    },
    issues: {
      icon: icons.issues,
      label: translations.issues,
      value: stats.totalIssues,
      id: "issues",
    },
    contribs: {
      icon: icons.contribs,
      label: translations.contribs,
      value: stats.contributedTo,
      id: "contribs",
    },
  };

  if (show.includes("prs_merged")) {
    STATS.prs_merged = {
      icon: icons.prs_merged,
      label: translations["prs-merged"],
      value: stats.totalPRsMerged,
      id: "prs_merged",
    };
  }

  if (show.includes("prs_merged_percentage")) {
    STATS.prs_merged_percentage = {
      icon: icons.prs_merged_percentage,
      label: translations["prs-merged-percentage"],
      value: stats.mergedPRsPercentage.toFixed(
        typeof number_precision === "number" && !isNaN(number_precision)
          ? clampValue(number_precision, 0, 2)
          : 2,
      ),
      id: "prs_merged_percentage",
      unitSymbol: "%",
    };
  }

  if (show.includes("reviews")) {
    STATS.reviews = {
      icon: icons.reviews,
      label: translations.reviews,
      value: stats.totalReviews,
      id: "reviews",
    };
  }

  if (show.includes("discussions_started")) {
    STATS.discussions_started = {
      icon: icons.discussions_started,
      label: translations["discussions-started"],
      value: stats.totalDiscussionsStarted,
      id: "discussions_started",
    };
  }

  if (show.includes("discussions_answered")) {
    STATS.discussions_answered = {
      icon: icons.discussions_answered,
      label: translations["discussions-answered"],
      value: stats.totalDiscussionsAnswered,
      id: "discussions_answered",
    };
  }

  // Filter stats
  const statItems = Object.keys(STATS)
    .filter((key) => !hide.includes(key))
    .map((key, index) => ({
      ...STATS[key],
      index,
    }));

  // Calculate dimensions
  const iconWidth = show_icons && statItems.length ? 17 : 0;
  const minCardWidth =
    (hide_rank
      ? Math.max(
          50 +
            measureText(
              custom_title ||
                (statItems.length
                  ? translations.title
                  : translations.ranktitle),
            ) *
              2,
          CARD_MIN_WIDTH,
        )
      : statItems.length
        ? RANK_CARD_MIN_WIDTH
        : RANK_ONLY_CARD_MIN_WIDTH) + iconWidth;

  let width = card_width || minCardWidth;
  if (width < minCardWidth) width = minCardWidth;

  const height = 195;

  const progress = 100 - stats.rank.percentile;
  const paddingX = 25;
  const paddingY = hide_title ? (height - statItems.length * lheight) / 2 : 35;

  const calculateRankXTranslation = () => {
    if (statItems.length) {
      const minXTranslation = RANK_CARD_MIN_WIDTH + iconWidth - 70;
      return minXTranslation + (width - minCardWidth) / 2;
    }
    return width / 2 + 20 - 10;
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
    .rank-text {
      font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif;
      fill: ${textColor};
      animation: scaleInAnimation 0.3s ease-in-out forwards;
    }
    .rank-percentile-header {
      font-size: 14px;
    }
    .rank-percentile-text {
      font-size: 16px;
    }
    .not_bold { font-weight: 400; }
    .bold { font-weight: 700; }
    .icon {
      fill: ${iconColor};
      display: ${show_icons ? "block" : "none"};
    }
    .rank-circle-rim {
      stroke: ${ringColor};
      fill: none;
      stroke-width: 6;
      opacity: 0.2;
    }
    .rank-circle {
      stroke: ${ringColor};
      stroke-dasharray: 250;
      fill: none;
      stroke-width: 6;
      stroke-linecap: round;
      opacity: 0.8;
      transform-origin: -10px 8px;
      transform: rotate(-90deg);
      animation: rankAnimation 1s forwards ease-in-out;
    }
    @keyframes rankAnimation {
      from {
        stroke-dashoffset: ${calculateCircleProgress(0, 50)};
      }
      to {
        stroke-dashoffset: ${calculateCircleProgress(progress, 50)};
      }
    }
    @keyframes scaleInAnimation {
      from { transform: translate(-5px, 5px) scale(0); }
      to { transform: translate(-5px, 5px) scale(1); }
    }
    ${disable_animations ? "* { animation-duration: 0s !important; animation-delay: 0s !important; }" : ""}
  `;

  const title =
    custom_title ||
    (statItems.length ? translations.title : translations.ranktitle);
  const accessibilityDesc = statItems
    .map((s) => `${s.label}: ${s.value}`)
    .join(", ");

  return (
    <Card
      width={width}
      height={height}
      borderRadius={border_radius}
      hideBorder={hide_border}
      hideTitle={hide_title}
      title={title}
      colors={colors}
      paddingX={paddingX}
      paddingY={paddingY}
      css={styles}
      a11yTitle={`${title}, Rank: ${stats.rank.level}`}
      a11yDesc={accessibilityDesc}
    >
      {!hide_rank && (
        <RankCircle
          rank={stats.rank}
          ringColor={ringColor}
          xTranslation={calculateRankXTranslation()}
          yTranslation={height / 2 - 8 - paddingY}
          rankIconType={rank_icon}
        />
      )}

      <svg x="0" y="0">
        {statItems.map((stat, i) => (
          <g key={stat.id} transform={`translate(0, ${i * lheight})`}>
            <StatItem
              {...stat}
              showIcons={show_icons}
              shiftValuePos={79.01}
              bold={text_bold}
              numberFormat={number_format}
              numberPrecision={number_precision}
            />
          </g>
        ))}
      </svg>
    </Card>
  );
};
