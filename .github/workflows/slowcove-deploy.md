# Slowcove deployment

[Release Slowcove](./slowcove-deploy.yml) publishes the existing Pomo relax-player
build to the separate [Slowcove project](https://vercel.com/bichis-projects/slowcove).
Its [configuration](./config/slowcove-vercel.json) replaces Pomo's Vercel
configuration, so this release does not run Pomo migrations or schedule its crons.

Push reviewed source to `release/slowcove`, or manually run the workflow on that
branch. The initial branch comes from `dev` because it contains the dedicated
relax-player entry. Pomo's `main` release is independent. The workflow reuses the
repository's existing `VERCEL_TOKEN` secret and needs no new credentials.

The generated production URL is <https://slowcove-bichis-projects.vercel.app>.
`/` and `/relax` reuse the existing relax-player pages. The all-in-one link opens
the existing Pomo site, and direct `/?layout=all-in-one` navigation redirects there.
The standalone build uses a separate route directory and document middleware;
Pomo's API/admin routes, authentication middleware, and signaling handler are not
included. Unknown routes return 404, and no private Pomo environment is required.
Regular Pomo builds keep their existing routes, middleware, and authentication.

`slowcove.app` and DNS are intentionally left for later. Domain connection also
requires reviewing the public origin in the build configuration.
