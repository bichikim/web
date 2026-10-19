# Slowcove deployment

[Release Slowcove](./slowcove-deploy.yml) publishes the existing Pomo slowcove
build to the separate [Slowcove project](https://vercel.com/bichis-projects/slowcove).
Its [configuration](./config/slowcove-vercel.json) replaces Pomo's Vercel
configuration, so this release does not run Pomo migrations or schedule its crons.

Merge reviewed changes into `dev`, or manually run the workflow on `dev`.
Slowcove deploys merged source only; PR branches do not deploy production.
The initial source comes from `dev` because it contains the dedicated
slowcove entry. Pomo's `main` release is independent. The workflow reuses the
repository's existing `VERCEL_TOKEN` secret and needs no new credentials.

The generated production URL is <https://slowcove-bichis-projects.vercel.app>.
`/` and `/relax` reuse the existing slowcove pages. Dedicated builds intentionally have no integrated-app return link. Legacy
`?layout=all-in-one` queries stay on the standalone player. The regular Pomo
`/relax` entry retains its integrated-app return link.
The standalone build uses a separate route directory and document middleware;
Pomo's API/admin routes, authentication middleware, and signaling handler are not
included. Unknown routes return 404, and no private Pomo environment is required.
Regular Pomo builds keep their existing routes, middleware, and authentication.

The custom domains `slowcove.app` and `www.slowcove.app` are connected to the
project. The build uses `https://www.slowcove.app` as its public origin.
