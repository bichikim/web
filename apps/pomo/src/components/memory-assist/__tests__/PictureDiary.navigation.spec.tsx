/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {PictureDiaryEntry} from '../../../features/picture-diary'
import {PictureDiary} from '../PictureDiary'
import {setupDiary} from './fixtures/diary'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))
const {createRepository, environment, finishPageTurn, getSpread, turns, viewport} = setupDiary()

it('should close and reopen the final cover on a compact empty diary', async () => {
  viewport.compact = true
  turns.setCompact(true)
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={createRepository()}
    />
  ))
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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={repository}
    />
  ))

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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={createRepository([newerEntry, olderEntry])}
    />
  ))

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
    render(() => (
      <PictureDiary
        environment={environment}
        turnEnvironment={turns.environment}
        repository={repository}
      />
    ))
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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={createRepository([entry])}
    />
  ))
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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={repository}
    />
  ))
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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={createRepository([oldestEntry])}
    />
  ))

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
