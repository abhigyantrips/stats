import { BaseSVG } from "@/components/base-svg";
import type { Theme } from "@/types";
import { FC } from "hono/jsx";

interface GitHubStatsProps {
  username: string;
  repos: number;
  followers: number;
  theme: Theme;
}

export const GitHubStats: FC<GitHubStatsProps> = ({
  username,
  repos,
  followers,
  theme,
}) => {
  return (
    <BaseSVG width={400} height={200} backgroundColor={theme.backgroundColor}>
      <text x="20" y="30" font-size="20" fill={theme.textColor}>
        GitHub Stats
      </text>
      <text x="20" y="60" font-size="18" fill={theme.textColor}>
        Username: {username}
      </text>
      <text x="20" y="90" font-size="18" fill={theme.textColor}>
        Public Repos: {repos}
      </text>
      <text x="20" y="120" font-size="18" fill={theme.textColor}>
        Followers: {followers}
      </text>
    </BaseSVG>
  );
};
