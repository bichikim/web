import {cleanup, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, vi} from 'vitest'
import {useModelDownload} from 'src/features/model-download'
import {createModelDownloadController} from 'src/features/model-download/controller'
import type {PictureDiaryEntry, PictureDiaryRepository} from '../../../../features/picture-diary'
import type {WeatherState} from '../../../../features/weather'
import {createBrowserDiaryEnvironment} from '../../picture-diary/environment'
import {createTurnHarness} from '../../picture-diary/__tests__/fixtures/turns'

const PAGE_TURN_DURATION = 700

const createRepository = (entries: ReadonlyArray<PictureDiaryEntry> = []) =>
  ({
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue(entries),
    save: vi.fn().mockResolvedValue(undefined),
  }) satisfies PictureDiaryRepository

const getSpread = () => {
  const spread = screen
    .getByLabelText('일기장')
    .querySelector<HTMLElement>('.picture-diary-book__spread')

  expect(spread).toBeInTheDocument()
  return spread!
}

const readyWeather = {
  feed: {
    current: {
      condition: 'clear',
      humidityPercent: 48,
      precipitationMillimeters: null,
      temperatureCelsius: 24.4,
    },
    expiresAt: '2026-09-04T05:00:00.000Z',
    location: {
      country: '대한민국',
      id: 'openweather:legacy:seoul',
      legacyCitySlug: 'seoul',
      name: '서울',
      region: '서울특별시',
    },
    observedAt: '2026-09-04T04:00:00.000Z',
    schemaVersion: 2,
    source: {name: 'OpenWeather', url: 'https://openweathermap.org/'},
    stale: false,
    updatedAt: '2026-09-04T04:01:00.000Z',
  },
  status: 'ready',
} as const satisfies WeatherState

export const setupDiary = () => {
  const turns = createTurnHarness()
  const viewport = {compact: false}
  const environment = {
    ...createBrowserDiaryEnvironment(),
    observeCompact: (onChange: (value: boolean) => void) => {
      onChange(viewport.compact)
      return () => undefined
    },
  }

  beforeEach(() => {
    vi.mocked(useModelDownload).mockReturnValue(createModelDownloadController())
    turns.reset()
    viewport.compact = false
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  const finishPageTurn = async () => {
    const turnSheet = screen
      .getByLabelText('일기장')
      .querySelector('[data-picture-diary-turn-sheet]')

    expect(turnSheet).toBeInTheDocument()
    turns.advance(PAGE_TURN_DURATION)
    expect(
      screen.getByLabelText('일기장').querySelector('[data-picture-diary-turn-sheet]'),
    ).not.toBeInTheDocument()
  }

  return {createRepository, environment, finishPageTurn, getSpread, readyWeather, turns, viewport}
}
