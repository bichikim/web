/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PictureDiaryEntry, PictureDiaryRepository} from '../../../features/picture-diary'
import type {WeatherState} from '../../../features/weather'
import {PictureDiary} from '../PictureDiary'

const createRepository = (entries: ReadonlyArray<PictureDiaryEntry> = []) =>
  ({
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue(entries),
    save: vi.fn().mockResolvedValue(undefined),
  }) satisfies PictureDiaryRepository

let animationTime = 0

beforeEach(() => {
  animationTime = 0
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function getPictureDiaryBounds(this: HTMLElement) {
      const width = this.classList.contains('picture-diary-book__edge-turns') ? 800 : 0
      const height = width > 0 ? 500 : 0
      return {
        bottom: height,
        height,
        left: 0,
        right: width,
        toJSON: () => ({}),
        top: 0,
        width,
        x: 0,
        y: 0,
      }
    },
  )
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(() => {
      animationTime += 100
      callback(animationTime)
    }),
  )
  vi.stubGlobal('cancelAnimationFrame', (handle: number) => window.clearTimeout(handle))
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const finishPageTurn = async () => {
  const turnSheet = screen.getByLabelText('일기장').querySelector('[data-picture-diary-turn-sheet]')

  expect(turnSheet).toBeInTheDocument()
  await waitFor(() =>
    expect(
      screen.getByLabelText('일기장').querySelector('[data-picture-diary-turn-sheet]'),
    ).not.toBeInTheDocument(),
  )
}

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

it('should save writing to local diary storage without a separate new-entry control', async () => {
  const repository = createRepository()
  render(() => <PictureDiary repository={repository} weatherState={readyWeather} />)

  await waitFor(() => expect(repository.list).toHaveBeenCalledOnce())
  expect(screen.queryByRole('button', {name: '새 일기'})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: '일기 저장'})).toBeDisabled()
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '좋은 하루였다.'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))

  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
  expect(repository.save).toHaveBeenCalledWith(
    expect.objectContaining({
      date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/u),
      text: '좋은 하루였다.',
      weather: {condition: 'clear', temperatureCelsius: 24.4},
    }),
  )
})

it('should save normally without weather while the current weather is unavailable', async () => {
  const repository = createRepository()
  render(() => <PictureDiary repository={repository} weatherState={{status: 'disabled'}} />)

  await waitFor(() => expect(repository.list).toHaveBeenCalledOnce())
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '날씨 없는 일기'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))

  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
  expect(repository.save).toHaveBeenCalledWith(
    expect.not.objectContaining({weather: expect.anything()}),
  )
})

it('should restore and delete a saved picture diary entry', async () => {
  const entry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'entry-1',
    strokes: [{points: [{x: 0.25, y: 0.5}]}],
    text: '산책한 날',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const repository = createRepository([entry])
  render(() => <PictureDiary repository={repository} />)

  await waitFor(() =>
    expect(screen.getByLabelText('그림일기 내용').closest('section')).toHaveAttribute(
      'data-picture-diary-page',
      'previous',
    ),
  )
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '삭제와 무관한 초안'}})
  fireEvent.click(screen.getAllByRole('button', {name: '이전 일기 보기'})[0]!)
  await finishPageTurn()
  expect(within(getSpread()).getByText('산책한 날')).toBeInTheDocument()
  expect(screen.queryByLabelText('그림일기 내용')).not.toBeInTheDocument()
  const deleteButton = screen.getByRole('button', {name: '2026. 09. 04. 일기 삭제'})
  fireEvent.click(deleteButton)
  expect(repository.delete).not.toHaveBeenCalled()
  fireEvent.click(deleteButton)

  await waitFor(() => expect(repository.delete).toHaveBeenCalledWith('entry-1'))
  await waitFor(() =>
    expect(screen.getByLabelText('그림일기 내용')).toHaveValue('삭제와 무관한 초안'),
  )
})

it('should prevent duplicate saves and preserve changes made during a pending save', async () => {
  const pending = Promise.withResolvers<void>()
  const repository = createRepository()
  repository.save.mockReturnValue(pending.promise)
  render(() => <PictureDiary repository={repository} />)
  await waitFor(() => expect(repository.list).toHaveBeenCalledOnce())
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '첫 초안'}})
  const save = screen.getByRole('button', {name: '일기 저장'})
  fireEvent.click(save)
  fireEvent.click(save)
  expect(repository.save).toHaveBeenCalledOnce()
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '계속 쓴 초안'}})
  pending.resolve()
  await waitFor(() => expect(screen.getByRole('button', {name: '일기 저장'})).toBeEnabled())
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('계속 쓴 초안')
})

it('should retain a saved entry when the initial load resolves afterward', async () => {
  const pending = Promise.withResolvers<ReadonlyArray<PictureDiaryEntry>>()
  const repository = createRepository()
  repository.list.mockReturnValue(pending.promise)
  render(() => <PictureDiary repository={repository} />)
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '먼저 저장한 일기'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(screen.getByText('먼저 저장한 일기')).toBeInTheDocument())
  pending.resolve([])
  await pending.promise
  expect(screen.getByText('먼저 저장한 일기')).toBeInTheDocument()
})

it('should retain the draft and allow retry after storage failure', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const repository = createRepository()
  repository.save.mockRejectedValueOnce(new Error('disk full'))
  render(() => <PictureDiary repository={repository} />)
  await waitFor(() => expect(repository.list).toHaveBeenCalledOnce())
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '재시도할 초안'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('저장하지 못했어요'))
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('재시도할 초안')
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(2))
})

it('should close and reopen the final cover on a compact empty diary', async () => {
  vi.stubGlobal('matchMedia', (query: string) => ({matches: query === '(width < 48rem)'}))
  render(() => <PictureDiary repository={createRepository()} />)
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '모바일 초안'}})
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  await finishPageTurn()
  expect(screen.queryByLabelText('그림일기 내용')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  await finishPageTurn()
  expect(getSpread().querySelector('[data-picture-diary-cover="front"]')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
  await finishPageTurn()
  fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
  await finishPageTurn()
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('모바일 초안')
})

it('should keep saved entries read-only and preserve the draft through newer navigation', async () => {
  const entry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'entry-1',
    strokes: [],
    text: '처음 쓴 글',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const repository = createRepository([entry])
  render(() => <PictureDiary repository={repository} />)

  await waitFor(() =>
    expect(screen.getByLabelText('그림일기 내용').closest('section')).toHaveAttribute(
      'data-picture-diary-page',
      'previous',
    ),
  )
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '아직 작성 중'}})
  fireEvent.click(screen.getAllByRole('button', {name: '이전 일기 보기'})[0]!)
  await finishPageTurn()
  expect(screen.queryByLabelText('그림일기 내용')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  expect(getSpread().querySelector('.picture-diary-book__page--current')).toHaveClass(
    'picture-diary-book__back-cover--inside',
  )
  expect(
    screen
      .getByLabelText('일기장')
      .querySelector('[data-picture-diary-turn-face="back"] [data-picture-diary-mode="write"]'),
  ).toBeInTheDocument()
  await finishPageTurn()
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('아직 작성 중')
  expect(screen.getByLabelText('그림일기 내용').closest('section')).toHaveAttribute(
    'data-picture-diary-page',
    'previous',
  )
  expect(within(getSpread()).queryByText('처음 쓴 글')).not.toBeInTheDocument()
  expect(getSpread().querySelector('.picture-diary-book__page--current')).toHaveClass(
    'picture-diary-book__back-cover--inside',
  )
  expect(repository.save).not.toHaveBeenCalled()
})

it('should save multiple entries with distinct identities on the same date', async () => {
  const repository = createRepository()
  render(() => <PictureDiary repository={repository} />)

  await waitFor(() => expect(repository.list).toHaveBeenCalledOnce())
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '아침 일기'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())

  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  await finishPageTurn()
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('')

  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '저녁 일기'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(2))

  const firstEntry = vi.mocked(repository.save).mock.calls[0]![0]
  const secondEntry = vi.mocked(repository.save).mock.calls[1]![0]
  expect(secondEntry.date).toBe(firstEntry.date)
  expect(secondEntry.id).not.toBe(firstEntry.id)
})

it('should page backward and forward through locally stored entries', async () => {
  const newerEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'newer-entry',
    strokes: [],
    text: '최근 일기',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const olderEntry = {
    ...newerEntry,
    createdAt: '2026-09-03T03:00:00.000Z',
    date: '2026-09-03',
    id: 'older-entry',
    text: '이전 일기',
    updatedAt: '2026-09-03T03:00:00.000Z',
  } satisfies PictureDiaryEntry
  render(() => <PictureDiary repository={createRepository([newerEntry, olderEntry])} />)

  await screen.findByText('최근 일기')
  expect(within(getSpread()).getByText('최근 일기').closest('section')).toHaveAttribute(
    'data-picture-diary-page',
    'previous',
  )
  fireEvent.click(screen.getAllByRole('button', {name: '이전 일기 보기'})[0]!)
  await finishPageTurn()
  expect(within(getSpread()).queryByText('최근 일기')).not.toBeInTheDocument()
  expect(within(getSpread()).getByText('이전 일기')).toBeInTheDocument()
  expect(
    within(getSpread()).getByText('이전 일기').closest('[data-picture-diary-page="current"]'),
  ).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  await finishPageTurn()
  expect(
    within(getSpread()).getByText('최근 일기').closest('[data-picture-diary-page="previous"]'),
  ).toBeInTheDocument()
})

it.each([0, 2, 4])(
  'should turn writing to blank and cover and back with %i entries',
  async (count) => {
    const entries: Array<PictureDiaryEntry> = Array.from({length: count}, (_, index) => ({
      createdAt: '2026-09-05T00:00:00.000Z',
      date: '2026-09-05',
      id: String(index),
      strokes: [],
      text: String(index),
      updatedAt: '2026-09-05T00:00:00.000Z',
      version: 1,
    }))
    const repository = createRepository(entries)
    render(() => <PictureDiary repository={repository} />)
    await waitFor(() => expect(repository.list).toHaveBeenCalled())
    fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '보존할 초안'}})
    fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
    await finishPageTurn()
    expect(screen.queryByLabelText('그림일기 내용')).not.toBeInTheDocument()
    expect(getSpread().querySelector('.picture-diary-book__page--previous')).toHaveTextContent('')
    expect(getSpread().querySelector('.picture-diary-book__page--current')).toHaveClass(
      'picture-diary-book__back-cover--inside',
    )
    fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
    await finishPageTurn()
    expect(getSpread().querySelector('[data-picture-diary-cover="front"]')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
    await finishPageTurn()
    expect(screen.queryByLabelText('그림일기 내용')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
    await finishPageTurn()
    expect(screen.getByLabelText('그림일기 내용')).toHaveValue('보존할 초안')
  },
)

it('should close the right cover and reopen the writing page without losing the draft', async () => {
  const entry: PictureDiaryEntry = {
    createdAt: '2026-09-05T00:00:00.000Z',
    date: '2026-09-05',
    id: 'one',
    strokes: [],
    text: '일기 1',
    updatedAt: '2026-09-05T00:00:00.000Z',
    version: 1,
  }
  render(() => <PictureDiary repository={createRepository([entry])} />)
  await waitFor(() =>
    expect(getSpread().querySelector('.picture-diary-book__page--current')).toHaveClass(
      'picture-diary-book__back-cover--inside',
    ),
  )
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '보존할 초안'}})
  const closeButton = screen.getByRole('button', {name: '다음 일기 보기'})
  expect(closeButton).toBeEnabled()
  fireEvent.click(closeButton)
  expect(within(getSpread()).getByLabelText('그림일기 내용')).toHaveValue('보존할 초안')
  await finishPageTurn()
  expect(getSpread().querySelector('[data-picture-diary-cover="front"]')).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '다음 일기 보기'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
  expect(within(getSpread()).getByLabelText('그림일기 내용')).toHaveValue('보존할 초안')
  await finishPageTurn()
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('보존할 초안')
  expect(getSpread().querySelector('.picture-diary-book__page--current')).toHaveClass(
    'picture-diary-book__back-cover--inside',
  )
})

it('should close an empty diary and reopen its unchanged draft', async () => {
  const repository = createRepository()
  render(() => <PictureDiary repository={repository} />)
  await waitFor(() => expect(repository.list).toHaveBeenCalled())
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '작성 중인 초안'}})
  const olderButton = screen.getByRole('button', {name: '이전 일기 보기'})
  expect(olderButton).toBeEnabled()
  fireEvent.click(olderButton)
  expect(within(getSpread()).getByLabelText('그림일기 내용')).toHaveValue('작성 중인 초안')
  await finishPageTurn()
  expect(getSpread().querySelector('[data-picture-diary-cover="back"]')).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '이전 일기 보기'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  expect(within(getSpread()).getByLabelText('그림일기 내용')).toHaveValue('작성 중인 초안')
  await finishPageTurn()
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('작성 중인 초안')
  expect(getSpread().querySelector('.picture-diary-book__back-cover--inside')).toBeInTheDocument()
  expect(repository.save).not.toHaveBeenCalled()
})

it('should close the back cover after the oldest entry and reopen to that entry', async () => {
  const oldestEntry = {
    createdAt: '2026-09-01T03:00:00.000Z',
    date: '2026-09-01',
    id: 'oldest-entry',
    strokes: [],
    text: '가장 오래된 일기',
    updatedAt: '2026-09-01T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  render(() => <PictureDiary repository={createRepository([oldestEntry])} />)

  await waitFor(() =>
    expect(screen.getByLabelText('그림일기 내용').closest('section')).toHaveAttribute(
      'data-picture-diary-page',
      'previous',
    ),
  )
  fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
  await finishPageTurn()
  expect(within(getSpread()).getByText('가장 오래된 일기')).toBeInTheDocument()

  const olderButton = screen.getByRole('button', {name: '이전 일기 보기'})
  expect(olderButton).toBeEnabled()
  fireEvent.click(olderButton)
  expect(
    screen.getByLabelText('일기장').querySelector('[data-picture-diary-cover-turn]'),
  ).toBeInTheDocument()
  expect(
    screen.getByLabelText('일기장').querySelector('[data-picture-diary-cover="back"]'),
  ).not.toBeInTheDocument()
  await finishPageTurn()
  expect(
    screen.getByLabelText('일기장').querySelector('[data-picture-diary-cover="back"]'),
  ).toBeInTheDocument()

  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  expect(within(getSpread()).getByText('가장 오래된 일기')).toBeInTheDocument()
  await finishPageTurn()
  expect(
    screen.getByLabelText('일기장').querySelector('[data-picture-diary-cover="back"]'),
  ).not.toBeInTheDocument()
})

it('should report local load, save, and delete failures without discarding the draft', async () => {
  const entry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'entry-1',
    strokes: [],
    text: '남아 있어야 할 글',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const repository = createRepository([entry])
  vi.mocked(repository.save).mockRejectedValue(new Error('save failed'))
  vi.mocked(repository.delete).mockRejectedValue(new Error('delete failed'))
  render(() => <PictureDiary repository={repository} />)

  await waitFor(() =>
    expect(screen.getByLabelText('그림일기 내용').closest('section')).toHaveAttribute(
      'data-picture-diary-page',
      'previous',
    ),
  )
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '저장 실패 초안'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  expect(await screen.findByText('이 기기에 일기를 저장하지 못했어요.')).toBeInTheDocument()
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('저장 실패 초안')

  fireEvent.click(screen.getAllByRole('button', {name: '이전 일기 보기'})[0]!)
  await finishPageTurn()
  const deleteButton = screen.getByRole('button', {name: '2026. 09. 04. 일기 삭제'})
  fireEvent.click(deleteButton)
  fireEvent.click(deleteButton)
  expect(await screen.findByText('일기를 삭제하지 못했어요.')).toBeInTheDocument()
  expect(within(getSpread()).getByText('남아 있어야 할 글')).toBeInTheDocument()

  const failedRepository = createRepository()
  vi.mocked(failedRepository.list).mockRejectedValue(new Error('load failed'))
  render(() => <PictureDiary repository={failedRepository} />)
  expect(await screen.findByText('이 기기의 일기장을 불러오지 못했어요.')).toBeInTheDocument()
})
