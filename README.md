# stats on workers.

Self-host GitHub stats and streak SVG cards for your README on Cloudflare Workers.
Each instance serves only its configured GitHub user. No KV, database, or Node.js
server is required.

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/abhigyantrips/stats)

## Self-hosting

1. Fork or clone this repository and install dependencies with `pnpm install`.
   Use Node.js 22 or newer and the pnpm version declared in `package.json`.
2. Set `vars.GITHUB_USERNAME` in `wrangler.jsonc` to your GitHub username.
3. Create a [GitHub personal access token](https://github.com/settings/tokens).
   A classic token without scopes is sufficient for public data. GitHub's
   contribution collection requires `read:user` to include private/internal
   contributions. Use only the permissions needed for the data you want to
   publish; these cards are public.
4. For local development, copy `.dev.vars.example` to `.dev.vars`, set
   `GITHUB_PAT`, and run `pnpm dev`. Never commit the real token.
5. For production, run:

   ```sh
   pnpm exec wrangler login
   pnpm exec wrangler secret put GITHUB_PAT
   pnpm deploy
   ```

   Wrangler prints your Worker URL. The deployment requires both the configured
   username and the uploaded secret; `.dev.vars` is only used locally.

The deploy button discovers the username from `wrangler.jsonc` and the required
secret from `.dev.vars.example`. Supply your own values in the deployment setup.

## Embed in your README

Replace `YOUR_WORKER` with the Worker URL printed during deployment:

```md
![GitHub stats](https://YOUR_WORKER.workers.dev/github/stats?show_icons=true&theme=dark)
![GitHub streak](https://YOUR_WORKER.workers.dev/github/streak?theme=dark)
```

No username query parameter is needed. `user` and `username` may name the
configured user, but requests for other users return 400 before contacting GitHub.
The `/ping` endpoint is a basic health check.

## Options

Both cards support `theme`, `hide_border`, `card_width`, `border_radius`,
`disable_animations`, and hexadecimal `text_color`, `icon_color`, `bg_color`,
`border_color`, and `ring_color` overrides. Colors omit the leading `#`.

Stats also supports `show_icons`, `hide_rank`, `hide_title`, `custom_title`,
`title_color`, `rank_icon=default|github|percentile`, and `include_all_commits`.
Use `show=reviews,prs_merged,prs_merged_percentage,discussions_started,discussions_answered`
to add rows. The card grows to fit them.

Streak supports `exclude_days=Sun,Sat`. Its current-day calculation uses UTC.
This is a subset of the upstream projects' options, not a drop-in replacement.
Activity/contribution graphs are planned and have no endpoint yet.

## Counts and rank

- Default stats commits use GitHub's contribution count for the past year;
  restricted contribution counts are not added to commits because they include
  other kinds of contributions.
- `include_all_commits=true` uses GitHub's REST commit search with `author:USERNAME`,
  matching GitHub README Stats' approach. It reflects searchable commits, not a
  guaranteed count of every private, unindexed, or otherwise unavailable commit.
  Incomplete search responses produce an error instead of a misleading total.
- Rank uses GitHub README Stats' weighted CDF formula and grade thresholds. It is
  an estimated score, not a measured ranking of all GitHub users. Reviews affect
  rank even when the review row is hidden.
- Stars are summed across owned repositories, paging beyond the first 100 while
  repositories still have stars. This corresponds to upstream's multi-page
  self-hosting mode, rather than its public instance's first-page limit.
- Streak cards use the contribution calendars from account creation onward.
  Access to private data depends on token permissions and GitHub's visibility rules.

## Caching

Successful GitHub responses are cached for one hour using the Workers Cache API.
Data cache keys include the query, user, and a SHA-256 hash incorporating the token.
Changing card styling or excluded streak days reuses the same GitHub data;
rotating the token selects a new cache key. API errors and incomplete results
are never stored. Cache failures fall back to fresh GitHub requests.

The Cache API is local to each Cloudflare data center and entries can be evicted.
A cold streak request still fetches all years; this is not a globally shared cache.
README images also carry a 30-minute browser cache header. GitHub's image proxy
may apply its own caching, so updates need not appear immediately.

## Development

```sh
pnpm typecheck
pnpm test
pnpm exec wrangler deploy --dry-run
```

## Credits

- [Anurag Hazra's GitHub README Stats](https://github.com/anuraghazra/github-readme-stats): stats design, commit-count approach, and rank calculation.
- [DenverCoder1's GitHub Streak Stats](https://github.com/DenverCoder1/github-readme-streak-stats): streak design and behavior.
- [GitHub README Activity Graph](https://github.com/Ashutosh00710/github-readme-activity-graph): inspiration for the planned graph.

The rank calculation's upstream license is included in [calculate-rank.ts](src/lib/calculate-rank.ts).
