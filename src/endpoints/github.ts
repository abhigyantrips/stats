import { GitHubUserStats } from "@/types";

export async function getGitHubStats(token: string, username: string): Promise<string> {
    try {
        const response = await fetch(`https://api.github.com/users/${username}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'User-Agent': 'Cloudflare-Worker',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch GitHub user data');
        }

        const userData: GitHubUserStats = await response.json();
        const { login, public_repos, followers } = userData;

        const svg = `
            <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200">
                <rect width="100%" height="100%" fill="#f0f0f0"/>
                <text x="20" y="30" font-size="20" fill="#333">GitHub Stats</text>
                <text x="20" y="60" font-size="18" fill="#333">Username: ${login}</text>
                <text x="20" y="90" font-size="18" fill="#333">Public Repos: ${public_repos}</text>
                <text x="20" y="120" font-size="18" fill="#333">Followers: ${followers}</text>
            </svg>
        `;

        return svg;
    } catch (error) {
        throw new Error('Failed to generate GitHub stats');
    }
}
