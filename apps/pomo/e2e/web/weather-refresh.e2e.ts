import {expect, test} from '@playwright/test'
import {enterFocusRoom} from '../helpers/settings'

const seoul = {
  country: '대한민국',
  id: 'openweather:legacy:seoul',
  legacyCitySlug: 'seoul',
  name: '서울',
  region: '서울특별시',
}

test('keeps the previous weather visible while checking for a new feed', async ({page}) => {
  await page.addInitScript((location) => {
    localStorage.setItem(
      'pomo:weather-preference:v2',
      JSON.stringify({enabled: true, location, sceneMode: 'auto'}),
    )
  }, seoul)

  const refreshStarted = Promise.withResolvers<void>()
  const releaseRefresh = Promise.withResolvers<void>()
  let requests = 0
  await page.route('**/api/weather/feeds/*.json', async (route) => {
    requests += 1
    const isRefreshing = requests > 1
    if (isRefreshing) {
      refreshStarted.resolve()
      await releaseRefresh.promise
    }
    const now = Date.now()
    await route.fulfill({
      json: {
        current: {
          condition: isRefreshing ? 'rain' : 'clear',
          humidityPercent: 50,
          precipitationMillimeters: isRefreshing ? 2 : 0,
          temperatureCelsius: isRefreshing ? 18 : 24,
        },
        expiresAt: new Date(now + (isRefreshing ? 60_000 : 5_000)).toISOString(),
        location: seoul,
        observedAt: new Date(now).toISOString(),
        schemaVersion: 2,
        source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
        stale: false,
        updatedAt: new Date(now).toISOString(),
      },
    })
  })

  try {
    await page.goto('/')
    await enterFocusRoom(page)
    await expect(page.getByText('서울 · 맑음 · 24°')).toBeVisible()
    await refreshStarted.promise
    await expect(page.getByText('서울 · 맑음 · 24° · 업데이트 중')).toBeVisible()
    releaseRefresh.resolve()
    await expect(page.getByText('서울 · 비 · 18°')).toBeVisible()
  } finally {
    releaseRefresh.resolve()
  }
})
