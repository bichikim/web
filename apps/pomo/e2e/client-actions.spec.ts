import {expect, test, type Page, type Request, type Route} from '@playwright/test'

const FIXTURE_ORIGIN = 'http://127.0.0.1:44175'
const TRACK_ID = '11111111-1111-4111-8111-111111111111'
const ASSET_ID = '22222222-2222-4222-8222-222222222222'

const observeActionUrls = (page: Page): Array<string> => {
  const actionUrls: Array<string> = []
  page.on('pageerror', (error) => {
    console.error(`Browser page error: ${error.stack ?? error.message}`)
  })
  page.on('request', (request) => {
    if (request.url().startsWith('https://action/')) {
      actionUrls.push(request.url())
    }
  })
  return actionUrls
}

const jsonResponse = (body: unknown, status = 200) => ({
  body: JSON.stringify(body),
  contentType: 'application/json',
  status,
})

const openHydratedFixture = async (page: Page, path = ''): Promise<void> => {
  await page.goto(`${FIXTURE_ORIGIN}${path}`)
  await expect(page.locator('html')).toHaveAttribute('data-hydrated', 'true')
  await page.getByRole('button', {name: 'Verify hydration'}).click()
  await expect(page.getByTestId('hydration-probe')).toHaveText('ready')
}

test.describe('client action workflows', () => {
  test('should execute every successful administrator command in the browser', async ({page}) => {
    const actionUrls = observeActionUrls(page)
    const requests: Array<{body: string | null; method: string; pathname: string}> = []
    await page.route(`${FIXTURE_ORIGIN}/**`, async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      requests.push({body: request.postData(), method: request.method(), pathname: url.pathname})

      if (url.pathname === '/api/admin/music/albums') {
        await new Promise((resolve) => setTimeout(resolve, 75))
        await route.fulfill(jsonResponse({id: 'album-one'}))
        return
      }
      if (url.pathname === '/api/admin/music/tracks' && request.method() === 'POST') {
        await route.fulfill(jsonResponse({id: TRACK_ID}))
        return
      }
      if (url.pathname === '/api/admin/music/assets' && request.method() === 'POST') {
        await route.fulfill(
          jsonResponse({
            assetId: ASSET_ID,
            expiresAt: '2026-09-03T12:00:00.000Z',
            uploadUrl: `${FIXTURE_ORIGIN}/upload/${ASSET_ID}`,
          }),
        )
        return
      }
      if (url.pathname === `/api/admin/music/tracks/${TRACK_ID}`) {
        await route.fulfill({status: 204})
        return
      }
      if (url.pathname === '/api/admin/music/tracks/track-one/playback') {
        await route.fulfill(
          jsonResponse({
            expiresAt: '2026-09-03T12:00:00.000Z',
            url: 'https://audio.example/admin.mp3',
          }),
        )
        return
      }
      if (
        url.pathname === '/api/admin/music/status' ||
        url.pathname === '/api/admin/music/offers' ||
        url.pathname === '/api/admin/music/assets' ||
        url.pathname.startsWith('/upload/')
      ) {
        await route.fulfill({status: 204})
        return
      }

      await route.continue()
    })
    await openHydratedFixture(page)

    const albumForm = page.getByRole('button', {name: 'Create album'}).locator('..')
    await expect(albumForm).toHaveAttribute('action', '/api/admin/music/albums')
    await page.getByRole('button', {name: 'Create album'}).click()
    await expect(page.getByTestId('album-pending')).toHaveText('true')
    await expect(page.getByTestId('admin-result')).toHaveText(
      JSON.stringify({albumId: 'album-one', status: 'created'}),
    )

    await page.getByRole('button', {name: 'Connect offer'}).click()
    await expect(page.getByTestId('admin-result')).toHaveText(JSON.stringify({status: 'succeeded'}))
    await page.getByRole('button', {name: 'Publish album'}).click()
    await expect(page.getByTestId('admin-result')).toHaveText(JSON.stringify({status: 'succeeded'}))

    await page.getByLabel('Track audio').setInputFiles({
      buffer: Buffer.from('e2e mp3 bytes'),
      mimeType: 'audio/mpeg',
      name: 'track.mp3',
    })
    await page.getByRole('button', {name: 'Create track'}).click()
    await expect(page.getByTestId('admin-result')).toHaveText(JSON.stringify({status: 'created'}))
    await page.getByRole('button', {name: 'Confirm track'}).click()
    await expect(page.getByTestId('admin-result')).toHaveText(JSON.stringify({status: 'active'}))
    await page.getByRole('button', {name: 'Request admin playback'}).click()
    await expect(page.getByTestId('admin-result')).toHaveText(
      JSON.stringify({status: 'granted', url: 'https://audio.example/admin.mp3'}),
    )
    await page.getByRole('button', {name: 'Remove track-one'}).click()
    await expect(page.getByTestId('admin-result')).toHaveText(JSON.stringify({status: 'succeeded'}))

    expect(requests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({method: 'POST', pathname: '/api/admin/music/albums'}),
        expect.objectContaining({method: 'POST', pathname: '/api/admin/music/offers'}),
        expect.objectContaining({method: 'POST', pathname: '/api/admin/music/status'}),
        expect.objectContaining({method: 'POST', pathname: '/api/admin/music/tracks'}),
        expect.objectContaining({method: 'PUT', pathname: `/upload/${ASSET_ID}`}),
        expect.objectContaining({method: 'PUT', pathname: '/api/admin/music/assets'}),
        expect.objectContaining({
          method: 'GET',
          pathname: '/api/admin/music/tracks/track-one/playback',
        }),
        expect.objectContaining({method: 'DELETE', pathname: '/api/admin/music/tracks/track-one'}),
      ]),
    )
    expect(actionUrls).toEqual([])
  })

  test('should preserve an ambiguous track and track concurrent removals independently', async ({
    page,
  }) => {
    const actionUrls = observeActionUrls(page)
    const pendingRemovalRoutes: Array<Route> = []
    const requests: Array<Request> = []
    await page.route(`${FIXTURE_ORIGIN}/**`, async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      requests.push(request)

      if (url.pathname === '/api/admin/music/tracks' && request.method() === 'POST') {
        await route.fulfill(jsonResponse({id: TRACK_ID}))
        return
      }
      if (url.pathname === '/api/admin/music/assets' && request.method() === 'POST') {
        await route.fulfill(
          jsonResponse({
            assetId: ASSET_ID,
            expiresAt: '2026-09-03T12:00:00.000Z',
            uploadUrl: `${FIXTURE_ORIGIN}/upload/${ASSET_ID}`,
          }),
        )
        return
      }
      if (url.pathname.startsWith('/upload/')) {
        await route.fulfill({status: 204})
        return
      }
      if (url.pathname === '/api/admin/music/assets' && request.method() === 'PUT') {
        await route.fulfill({status: 503})
        return
      }
      if (url.pathname.startsWith('/api/admin/music/tracks/') && request.method() === 'DELETE') {
        pendingRemovalRoutes.push(route)
        return
      }

      await route.continue()
    })
    await openHydratedFixture(page)
    await page.getByLabel('Track audio').setInputFiles({
      buffer: Buffer.from('e2e mp3 bytes'),
      mimeType: 'audio/mpeg',
      name: 'track.mp3',
    })

    await page.getByRole('button', {name: 'Create track'}).click()
    await expect(page.getByTestId('admin-result')).toContainText('"cleanupStatus":"preserved"')
    expect(
      requests.some(
        (request) =>
          request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith(TRACK_ID),
      ),
    ).toBe(false)

    await Promise.all([
      page.getByRole('button', {name: 'Remove track-one'}).click(),
      page.getByRole('button', {name: 'Remove track-two'}).click(),
    ])
    await expect.poll(() => pendingRemovalRoutes.length).toBe(2)
    await expect(page.getByTestId('remove-pending')).toHaveText('track-one,track-two')
    await pendingRemovalRoutes[0]!.fulfill({status: 204})
    await expect(page.getByTestId('remove-pending')).toHaveText('track-two')
    await pendingRemovalRoutes[1]!.fulfill({status: 204})
    await expect(page.getByTestId('remove-pending')).toHaveText('')
    expect(actionUrls).toEqual([])
  })

  test('should execute Toss session and account-link commands with form fallback', async ({
    page,
  }) => {
    const actionUrls = observeActionUrls(page)
    const requests: Array<Request> = []
    await page.route(`${FIXTURE_ORIGIN}/**`, async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      requests.push(request)

      if (url.pathname === '/api/app-auth/exchange') {
        await new Promise((resolve) => setTimeout(resolve, 75))
        await route.fulfill(jsonResponse({token: 'app-token'}))
        return
      }
      if (
        url.pathname === '/api/account/link-email' ||
        url.pathname === '/api/account/complete-link' ||
        url.pathname === '/api/app-auth/session'
      ) {
        await route.fulfill({status: 204})
        return
      }

      await route.continue()
    })
    await openHydratedFixture(page)

    await page.getByRole('button', {name: 'Login with Toss'}).click()
    await expect(page.getByTestId('login-pending')).toHaveText('true')
    await expect(page.getByTestId('auth-result')).toHaveText(
      JSON.stringify({status: 'authenticated', token: 'app-token'}),
    )
    expect(await page.evaluate(() => localStorage.getItem('pomo:app-session:v1'))).toBe('app-token')

    const emailForm = page.getByRole('button', {name: 'Request account link'}).locator('..')
    await expect(emailForm).toHaveAttribute('action', '/api/account/link-email')
    await page.getByRole('button', {name: 'Request account link'}).click()
    await expect(page.getByTestId('auth-result')).toHaveText(JSON.stringify({status: 'sent'}))
    await page.getByRole('button', {name: 'Complete account link'}).click()
    await expect(page.getByTestId('auth-result')).toHaveText(JSON.stringify({status: 'linked'}))
    await page.getByRole('button', {name: 'Logout Toss session'}).click()
    await expect(page.getByTestId('auth-result')).toHaveText(JSON.stringify({status: 'signed-out'}))
    expect(await page.evaluate(() => localStorage.getItem('pomo:app-session:v1'))).toBeNull()

    const exchange = requests.find((request) =>
      new URL(request.url()).pathname.endsWith('/exchange'),
    )
    const email = requests.find((request) =>
      new URL(request.url()).pathname.endsWith('/link-email'),
    )
    const completion = requests.find((request) =>
      new URL(request.url()).pathname.endsWith('/complete-link'),
    )
    const logout = requests.find(
      (request) =>
        request.method() === 'DELETE' && new URL(request.url()).pathname.endsWith('/session'),
    )
    expect(exchange?.method()).toBe('POST')
    expect(exchange?.postDataJSON()).toEqual({
      authorizationCode: 'e2e-authorization',
      referrer: 'SANDBOX',
    })
    expect(email?.headers().authorization).toBe('Bearer app-token')
    expect(email?.postDataJSON()).toEqual({email: 'user@example.com'})
    expect(completion?.postDataJSON()).toEqual({token: 'link-token'})
    expect(logout?.headers().authorization).toBe('Bearer app-token')
    expect(actionUrls).toEqual([])
  })

  test('should request paid track access as a direct client command', async ({page}) => {
    const actionUrls = observeActionUrls(page)
    let accessRequest: Request | undefined
    await page.route(`${FIXTURE_ORIGIN}/**`, async (route) => {
      const request = route.request()
      const url = new URL(request.url())

      if (url.pathname === '/api/music/tracks/track-one/access') {
        accessRequest = request
        await new Promise((resolve) => setTimeout(resolve, 75))
        await route.fulfill(
          jsonResponse({
            expiresAt: '2026-09-03T12:00:00.000Z',
            mode: 'full',
            url: 'https://audio.example/full.mp3',
          }),
        )
        return
      }

      await route.continue()
    })
    await openHydratedFixture(page)

    await page.getByRole('button', {name: 'Request track access'}).click()
    await expect(page.getByTestId('access-pending')).toHaveText('true')
    await expect(page.getByTestId('access-result')).toHaveText(
      JSON.stringify({
        access: {
          expiresAt: '2026-09-03T12:00:00.000Z',
          mode: 'full',
          url: 'https://audio.example/full.mp3',
        },
        status: 'granted',
      }),
    )
    expect(accessRequest?.method()).toBe('GET')
    expect(actionUrls).toEqual([])
  })

  test('should deduplicate client queries and revalidate them after an action', async ({page}) => {
    const requestCounts = new Map<string, number>()
    let albumCreated = false
    await page.route(`${FIXTURE_ORIGIN}/**`, async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      const requestKey = `${request.method()} ${url.pathname}`
      requestCounts.set(requestKey, (requestCounts.get(requestKey) ?? 0) + 1)

      if (url.pathname === '/api/admin/music' && request.method() === 'GET') {
        await new Promise((resolve) => setTimeout(resolve, 75))
        await route.fulfill(
          jsonResponse({
            albums: albumCreated
              ? [
                  {
                    coverFallback: 'lp',
                    coverImageUrl: null,
                    id: 'album-one',
                    release: {blockers: ['tracks_missing_active_asset'], ready: false},
                    status: 'draft',
                    translations: [
                      {
                        albumId: 'album-one',
                        description: 'E2E 설명',
                        locale: 'ko',
                        title: 'E2E 앨범',
                      },
                    ],
                  },
                ]
              : [],
            assets: [],
            offers: [],
            pendingTracks: [],
            tracks: [],
          }),
        )
        return
      }
      if (url.pathname === '/api/admin/music/albums' && request.method() === 'POST') {
        albumCreated = true
        await route.fulfill(jsonResponse({id: 'album-one'}))
        return
      }
      if (url.pathname === '/api/music/albums') {
        await new Promise((resolve) => setTimeout(resolve, 75))
        await route.fulfill(jsonResponse({albums: [], version: 1}))
        return
      }
      if (url.pathname === '/api/account') {
        await new Promise((resolve) => setTimeout(resolve, 75))
        await route.fulfill(jsonResponse({email: 'query@example.com'}))
        return
      }

      await route.continue()
    })

    await openHydratedFixture(page, '/?queries=true')
    await expect(page.getByTestId('admin-query-one')).toContainText('"albums":[]')
    await expect(page.getByTestId('admin-query-two')).toContainText('"albums":[]')
    await expect(page.getByTestId('published-query-one')).toContainText('"status":"ready"')
    await expect(page.getByTestId('published-query-two')).toContainText('"status":"ready"')
    await expect(page.getByTestId('session-query-one')).toContainText('query@example.com')
    await expect(page.getByTestId('session-query-two')).toContainText('query@example.com')
    expect(requestCounts.get('GET /api/admin/music')).toBe(1)
    expect(requestCounts.get('GET /api/music/albums')).toBe(1)
    expect(requestCounts.get('GET /api/account')).toBe(1)

    await page.getByRole('button', {name: 'Read cached queries'}).click()
    await expect(page.getByTestId('cached-query-result')).toContainText('query@example.com')
    expect(requestCounts.get('GET /api/admin/music')).toBe(1)
    expect(requestCounts.get('GET /api/music/albums')).toBe(1)
    expect(requestCounts.get('GET /api/account')).toBe(1)

    await page.getByRole('button', {name: 'Create album'}).click()
    await expect(page.getByTestId('admin-query-one')).toContainText('"id":"album-one"')
    await expect(page.getByTestId('admin-query-two')).toContainText('"id":"album-one"')
    expect(requestCounts.get('GET /api/admin/music')).toBe(2)
    expect(requestCounts.get('GET /api/music/albums')).toBe(2)
    expect(requestCounts.get('GET /api/account')).toBe(2)
  })

  test('should revalidate the weather query at the externally selected Retry-After delay', async ({
    page,
  }) => {
    const weatherRequests: Array<Request> = []
    let previousRequestTime: number | undefined
    let scheduledGapMilliseconds: number | undefined
    await page.route(/\/api\/weather\/feeds\//u, async (route) => {
      weatherRequests.push(route.request())
      const requestTime = Date.now()
      const requestGap = previousRequestTime === undefined ? 0 : requestTime - previousRequestTime
      previousRequestTime = requestTime

      if (requestGap < 900) {
        await route.fulfill({
          ...jsonResponse({code: 'weather_collecting'}, 503),
          headers: {'Retry-After': '1'},
        })
        return
      }

      scheduledGapMilliseconds = requestGap
      await route.fulfill(
        jsonResponse({
          current: {
            condition: 'clear',
            humidityPercent: 50,
            precipitationMillimeters: 0,
            temperatureCelsius: 24,
          },
          expiresAt: '2099-09-02T09:05:00.000Z',
          location: {
            country: '대한민국',
            id: 'openweather:legacy:seoul',
            legacyCitySlug: 'seoul',
            name: '서울',
            region: '서울특별시',
          },
          observedAt: '2099-09-02T08:50:00.000Z',
          schemaVersion: 2,
          source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
          stale: false,
          updatedAt: '2099-09-02T09:00:00.000Z',
        }),
      )
    })

    await openHydratedFixture(page)
    await expect(page.getByTestId('weather-state')).toContainText('"status":"available"')
    await expect(page.getByTestId('weather-state')).toContainText('"temperatureCelsius":24')
    expect(weatherRequests.length).toBeGreaterThanOrEqual(2)
    expect(scheduledGapMilliseconds).toBeGreaterThanOrEqual(900)
  })
})
