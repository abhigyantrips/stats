import { Hono } from 'hono';
import { getGitHubStats } from './endpoints/github';
import { healthCheck } from './endpoints/health';

type Bindings = {
    GITHUB_PAT: string;
}

const app = new Hono<{Bindings: Bindings}>();

app.get('/api/stats/:username', async (context) => {
    const username = context.req.param('username');
    try {
        const svg = await getGitHubStats(context.env.GITHUB_PAT, username);
        return new Response(svg, {
            headers: {
                'Content-Type': 'image/svg+xml',
                'Cache-Control': 'max-age=3600'
            }
        });
    } catch (error: any) {
        return context.json({ error: error.message }, 500);
    }
});

app.get('/health', async (context) => {
    try {
        const status = await healthCheck();
        return context.json({ status });
    } catch (error: any) {
        return context.json({ error: error.message }, 500);
    }
});

export default {
    fetch: app.fetch
};
