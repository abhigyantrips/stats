# stats on workers.

Self-host GitHub stats, streak, and activity graph SVG cards for your README on Cloudflare Workers.
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
![GitHub activity](https://YOUR_WORKER.workers.dev/github/graph?theme=dark&area=true)
```

No username query parameter is needed. `user` and `username` may name the
configured user, but requests for other users return 400 before contacting GitHub.
The `/ping` endpoint is a basic health check.

## Options

Stats and streak cards support `theme`, `hide_border`, `card_width`, `border_radius`,
`disable_animations`, and hexadecimal `text_color`, `icon_color`, `bg_color`,
`border_color`, and `ring_color` overrides. Colors omit the leading `#`.

Stats also supports `show_icons`, `hide_rank`, `hide_title`, `custom_title`,
`title_color`, `rank_icon=default|github|percentile`, and `include_all_commits`.
Use `show=reviews,prs_merged,prs_merged_percentage,discussions_started,discussions_answered`
to add rows. The card grows to fit them.

Streak supports `exclude_days=Sun,Sat`. Its current-day calculation uses UTC.
This is a subset of the upstream projects' options, not a drop-in replacement.

### Activity graph

`/github/graph` renders a daily contribution line graph. It defaults to the last
31 calendar days, including today in UTC, using GitHub's contribution calendar
(all contribution types, not only commits). It supports these query parameters:

| Parameter            | Default                         | Description                                                               |
| -------------------- | ------------------------------- | ------------------------------------------------------------------------- |
| `days`               | `31`                            | Integer from 1 to 90; number of days to display.                          |
| `from`               | Computed                        | Inclusive starting date, `YYYY-MM-DD`.                                    |
| `to`                 | Today (UTC)                     | Inclusive ending date, `YYYY-MM-DD`.                                      |
| `theme`              | `default`                       | An existing project theme (listed below).                                 |
| `bg_color`           | Theme background                | Background color.                                                         |
| `border_color`       | Theme border                    | Border color.                                                             |
| `color`              | Theme text                      | Axis and tick label color; `text_color` is an alias and takes precedence. |
| `title_color`        | Graph text color                | Title color; defaults to the graph text color.                            |
| `line`               | Theme graph line                | Contribution line color.                                                  |
| `point`              | Theme graph point               | Daily point color.                                                        |
| `area`               | `false`                         | Set to `true` to fill beneath the line at 10% opacity.                    |
| `area_color`         | Line color                      | Area fill color; requires `area=true`.                                    |
| `hide_border`        | `false`                         | Set to `true` to hide the border.                                         |
| `hide_title`         | `false`                         | Set to `true` to hide the visible title.                                  |
| `custom_title`       | `USERNAME's Contribution Graph` | Custom title; URL-encode spaces and special characters.                   |
| `radius`             | `0`                             | Border radius from 0 to 16; fractional values are allowed.                |
| `border_radius`      | `0`                             | Alias for `radius`; takes precedence when both are supplied.              |
| `height`             | `420`                           | Integer from 200 to 600, in pixels.                                       |
| `card_width`         | `1200`                          | Integer from 300 to 2000, in pixels.                                      |
| `grid`               | `true`                          | Set to `false` to hide the horizontal and vertical grid lines.            |
| `disable_animations` | `false`                         | Set to `true` to disable the line draw and point entrance animations.     |

Colors are hexadecimal without `#` (3, 4, 6, or 8 digits); invalid colors fall
back to the theme. Available themes: `default`, `dark`, `radical`, `merko`,
`gruvbox`, `tokyonight`, `onedark`, `cobalt`, `synthwave`, `highcontrast`, and
`dracula`. Unknown theme names fall back to `default`.

When neither date is supplied, `days` counts backward from today. With only
`to`, it counts backward from that date. With only `from`, it counts forward
from that date, stopping at today if necessary. With both dates, the explicit
range determines the number of points and overrides `days` (if supplied,
`days` must still be valid). Every range is inclusive, limited to 90 days, and
cannot extend into the future. Invalid dates, ranges, or numeric options return
HTTP 400 before contacting GitHub.

The graph follows the reference layout: a centered 20px title, a smooth 4px
line, 10px points, and plot padding of 80px at the top, 90px on the left,
50px on the right, and 70px at the bottom (including axis labels). Hiding the
title preserves the plot position. The X axis shows day-of-month labels; point
titles include the full date and contribution count. The line draws over five
seconds and points enter over one second. Both animations respect reduced-motion
preferences and can be disabled with `disable_animations=true`.

Examples:

```md
![Last 60 days](https://YOUR_WORKER.workers.dev/github/graph?days=60&theme=dracula&area=true&hide_border=true)
![Custom range](https://YOUR_WORKER.workers.dev/github/graph?from=2026-01-01&to=2026-01-31&custom_title=January%20Activity&line=2f80ed&point=4c71f2&area=true&area_color=2f80ed&grid=false)
```

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
Data cache keys hash the query or activity date range, user, and token with SHA-256.
Changing card styling or excluded streak days reuses the same GitHub data.
Activity graphs cache their requested date range independently of styling.
Rotating the token selects a new cache key. API errors and incomplete results
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
- [Ashutosh Dwivedi's GitHub README Activity Graph](https://github.com/Ashutosh00710/github-readme-activity-graph): graph layout, animations, and customization options.
- [Gion Kunz's Chartist](https://github.com/gionkunz/chartist-js): curve-smoothing algorithm.

The rank calculation's upstream license is included in [calculate-rank.ts](src/lib/calculate-rank.ts).
The graph layout and animations are adapted from GitHub README Activity Graph;
its MIT license is included in [graph.tsx](src/templates/github/graph.tsx).
The curve-smoothing algorithm is adapted from Chartist 0.11.4; its MIT license
is included in [graph-path.ts](src/lib/graph-path.ts).
