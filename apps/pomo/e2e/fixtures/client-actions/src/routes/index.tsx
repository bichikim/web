import {createAsync, useAction, useLocation, useSubmission, useSubmissions} from '@solidjs/router'
import {createSignal, onMount, Show} from 'solid-js'

import {
  changeAdminAlbumStatusAction,
  confirmAdminTrackAction,
  connectAdminAlbumOfferAction,
  createAdminAlbumAction,
  createAdminTrackAction,
  removeAdminTrackAction,
  requestAdminTrackPlaybackAction,
} from '../../../../../src/features/admin-music/actions'
import {adminCatalogQuery} from '../../../../../src/features/admin-music/catalog-query'
import {requestTrackAccessAction} from '../../../../../src/features/focus-room-audio/actions'
import {publishedAlbumCatalogQuery} from '../../../../../src/features/focus-room-audio/published-catalog-query'
import {createQueryRevalidationScheduler} from '../../../../../src/features/query-revalidation/scheduler'
import {
  completeAccountLinkAction,
  createTossLoginSessionAction,
  requestAccountLinkEmailAction,
  revokeTossLoginSessionAction,
} from '../../../../../src/features/user-auth/actions'
import {accountSessionQuery} from '../../../../../src/features/user-auth/session-query'
import {weatherFeedQuery} from '../../../../../src/features/weather/query'
import {resolveWeatherRevalidationSchedule} from '../../../../../src/features/weather/revalidation'

const stringify = (value: unknown): string => JSON.stringify(value)

const AdminActions = () => {
  const createAlbum = useAction(createAdminAlbumAction)
  const albumSubmission = useSubmission(createAdminAlbumAction)
  const createTrack = useAction(createAdminTrackAction)
  const trackSubmission = useSubmission(createAdminTrackAction)
  const connectOffer = useAction(connectAdminAlbumOfferAction)
  const changeStatus = useAction(changeAdminAlbumStatusAction)
  const removeTrack = useAction(removeAdminTrackAction)
  const removeSubmissions = useSubmissions(removeAdminTrackAction)
  const confirmTrack = useAction(confirmAdminTrackAction)
  const requestPlayback = useAction(requestAdminTrackPlaybackAction)
  const [result, setResult] = createSignal('idle')
  const pendingRemovals = () =>
    removeSubmissions
      .filter((submission) => submission.pending)
      .map((submission) => String(submission.input[0]))
      .sort()
      .join(',')

  return (
    <section aria-label="Admin actions">
      <form
        action="/api/admin/music/albums"
        method="post"
        onSubmit={async (event) => {
          event.preventDefault()
          setResult(stringify(await createAlbum(new FormData(event.currentTarget))))
        }}
      >
        <input name="coverFallback" value="lp" />
        <input name="title.ko" value="E2E 앨범" />
        <input name="description.ko" value="E2E 설명" />
        <button disabled={albumSubmission.pending} type="submit">
          Create album
        </button>
      </form>

      <form
        action="/api/admin/music/offers"
        method="post"
        onSubmit={async (event) => {
          event.preventDefault()
          setResult(stringify(await connectOffer(new FormData(event.currentTarget))))
        }}
      >
        <input name="albumId" value="album-one" />
        <input name="externalProductId" value="offer-one" />
        <button type="submit">Connect offer</button>
      </form>

      <form
        action="/api/admin/music/tracks"
        enctype="multipart/form-data"
        method="post"
        onSubmit={async (event) => {
          event.preventDefault()
          setResult(stringify(await createTrack(new FormData(event.currentTarget))))
        }}
      >
        <input name="albumId" value="album-one" />
        <input name="artist" value="E2E Artist" />
        <input name="title" value="E2E Track" />
        <input aria-label="Track audio" name="audio" type="file" />
        <button disabled={trackSubmission.pending} type="submit">
          Create track
        </button>
      </form>

      <button
        type="button"
        onClick={async () => setResult(stringify(await changeStatus('album-one', 'publish')))}
      >
        Publish album
      </button>
      <button
        type="button"
        onClick={async () => setResult(stringify(await confirmTrack('asset-one')))}
      >
        Confirm track
      </button>
      <button
        type="button"
        onClick={async () => setResult(stringify(await requestPlayback('track-one')))}
      >
        Request admin playback
      </button>
      {['track-one', 'track-two'].map((trackId) => (
        <button
          type="button"
          onClick={async () => setResult(stringify(await removeTrack(trackId)))}
        >
          Remove {trackId}
        </button>
      ))}
      <output data-testid="admin-result">{result()}</output>
      <output data-testid="album-pending">{String(albumSubmission.pending)}</output>
      <output data-testid="track-pending">{String(trackSubmission.pending)}</output>
      <output data-testid="remove-pending">{pendingRemovals()}</output>
    </section>
  )
}

const AuthenticationActions = () => {
  const login = useAction(createTossLoginSessionAction)
  const loginSubmission = useSubmission(createTossLoginSessionAction)
  const logout = useAction(revokeTossLoginSessionAction)
  const requestEmail = useAction(requestAccountLinkEmailAction)
  const completeLink = useAction(completeAccountLinkAction)
  const [token, setToken] = createSignal('')
  const [result, setResult] = createSignal('idle')

  return (
    <section aria-label="Authentication actions">
      <button
        disabled={loginSubmission.pending}
        type="button"
        onClick={async () => {
          const nextResult = await login()
          if (nextResult.status === 'authenticated') {
            setToken(nextResult.token)
          }
          setResult(stringify(nextResult))
        }}
      >
        Login with Toss
      </button>
      <form
        action="/api/account/link-email"
        method="post"
        onSubmit={async (event) => {
          event.preventDefault()
          setResult(stringify(await requestEmail(token(), new FormData(event.currentTarget))))
        }}
      >
        <input name="email" required type="email" value="user@example.com" />
        <button type="submit">Request account link</button>
      </form>
      <button
        type="button"
        onClick={async () => setResult(stringify(await completeLink('link-token')))}
      >
        Complete account link
      </button>
      <button type="button" onClick={async () => setResult(stringify(await logout(token())))}>
        Logout Toss session
      </button>
      <output data-testid="auth-result">{result()}</output>
      <output data-testid="login-pending">{String(loginSubmission.pending)}</output>
    </section>
  )
}

const TrackAccessAction = () => {
  const requestAccess = useAction(requestTrackAccessAction)
  const submission = useSubmission(requestTrackAccessAction)
  const [result, setResult] = createSignal('idle')

  return (
    <section aria-label="Track access action">
      <button
        disabled={submission.pending}
        type="button"
        onClick={async () => setResult(stringify(await requestAccess('track-one')))}
      >
        Request track access
      </button>
      <output data-testid="access-result">{result()}</output>
      <output data-testid="access-pending">{String(submission.pending)}</output>
    </section>
  )
}

const WeatherQuery = () => {
  const locationId = 'openweather:legacy:seoul' as const
  const [mounted, setMounted] = createSignal(false)
  const weather = createAsync(() =>
    mounted() ? weatherFeedQuery(locationId) : Promise.resolve(undefined),
  )
  createQueryRevalidationScheduler({
    key: () => weatherFeedQuery.keyFor(locationId),
    schedule: () =>
      resolveWeatherRevalidationSchedule({
        active: mounted(),
        locationId,
        result: weather.latest,
      }),
  })

  onMount(() => setMounted(true))

  return (
    <section aria-label="Weather query">
      <output data-testid="weather-state">{stringify(weather())}</output>
    </section>
  )
}

const ClientQueries = () => {
  const [mounted, setMounted] = createSignal(false)
  const [cachedResult, setCachedResult] = createSignal('idle')
  const adminCatalogOne = createAsync(async () => {
    if (!mounted()) {
      return
    }

    return adminCatalogQuery()
  })
  const adminCatalogTwo = createAsync(async () => {
    if (!mounted()) {
      return
    }

    return adminCatalogQuery()
  })
  const publishedCatalogOne = createAsync(async () => {
    if (!mounted()) {
      return
    }

    return publishedAlbumCatalogQuery('ko')
  })
  const publishedCatalogTwo = createAsync(async () => {
    if (!mounted()) {
      return
    }

    return publishedAlbumCatalogQuery('ko')
  })
  const accountSessionOne = createAsync(async () => {
    if (!mounted()) {
      return
    }

    return accountSessionQuery()
  })
  const accountSessionTwo = createAsync(async () => {
    if (!mounted()) {
      return
    }

    return accountSessionQuery()
  })

  onMount(() => setMounted(true))

  return (
    <section aria-label="Client queries">
      <button
        type="button"
        onClick={async () => {
          const [adminCatalog, publishedCatalog, accountSession] = await Promise.all([
            adminCatalogQuery(),
            publishedAlbumCatalogQuery('ko'),
            accountSessionQuery(),
          ])
          setCachedResult(stringify({accountSession, adminCatalog, publishedCatalog}))
        }}
      >
        Read cached queries
      </button>
      <output data-testid="admin-query-one">{stringify(adminCatalogOne())}</output>
      <output data-testid="admin-query-two">{stringify(adminCatalogTwo())}</output>
      <output data-testid="published-query-one">{stringify(publishedCatalogOne())}</output>
      <output data-testid="published-query-two">{stringify(publishedCatalogTwo())}</output>
      <output data-testid="session-query-one">{stringify(accountSessionOne())}</output>
      <output data-testid="session-query-two">{stringify(accountSessionTwo())}</output>
      <output data-testid="cached-query-result">{cachedResult()}</output>
    </section>
  )
}

export default function ClientActions() {
  const location = useLocation()
  const [hydrationProbe, setHydrationProbe] = createSignal('idle')

  onMount(() => {
    document.documentElement.dataset.hydrated = 'true'
  })

  return (
    <main>
      <h1>Client action E2E</h1>
      <button type="button" onClick={() => setHydrationProbe('ready')}>
        Verify hydration
      </button>
      <output data-testid="hydration-probe">{hydrationProbe()}</output>
      <AdminActions />
      <AuthenticationActions />
      <TrackAccessAction />
      <WeatherQuery />
      <Show when={location.query.queries === 'true'}>
        <ClientQueries />
      </Show>
    </main>
  )
}
