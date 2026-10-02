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
`/` opens the relax player; `/?layout=all-in-one` opens the existing full app, and
`/relax` remains the integrated relax route. Full-app server features that require
Pomo's private environment are not configured in this separate project.

`slowcove.app` and DNS are intentionally left for later. Domain connection also
requires reviewing the public origin in the build configuration.
