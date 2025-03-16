import { BaseSVG } from "@/components/base-svg";
import { FC } from "hono/jsx";

interface GitHubStatsProps {
  username: string;
  repos: number;
  followers: number;
}

export const GitHubStats: FC<GitHubStatsProps> = ({
  username,
  repos,
  followers,
}) => {
  return (
    <BaseSVG width={400} height={200} backgroundColor="#f0f0f0">
      <text x="20" y="30" font-size="20" fill="#333">
        GitHub Stats
      </text>
      <text x="20" y="60" font-size="18" fill="#333">
        Username: {username}
      </text>
      <text x="20" y="90" font-size="18" fill="#333">
        Public Repos: {repos}
      </text>
      <text x="20" y="120" font-size="18" fill="#333">
        Followers: {followers}
      </text>
    </BaseSVG>
  );
};
