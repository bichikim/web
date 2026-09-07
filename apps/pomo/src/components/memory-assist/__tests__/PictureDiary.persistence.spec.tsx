/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {PictureDiaryEntry} from '../../../features/picture-diary'
import {PictureDiary} from '../PictureDiary'
import {setupDiary} from './fixtures/diary'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))
const {createRepository, environment, finishPageTurn, getSpread, readyWeather, turns} = setupDiary()

it('should save writing to local diary storage without a separate new-entry control', async () => {
  const repository = createRepository()
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={repository}
      weatherState={readyWeather}
    />
  ))

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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={repository}
      weatherState={{status: 'disabled'}}
    />
  ))

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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={repository}
    />
  ))
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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={repository}
    />
  ))
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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={repository}
    />
  ))
  await waitFor(() => expect(repository.list).toHaveBeenCalledOnce())
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '재시도할 초안'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('저장하지 못했어요'))
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('재시도할 초안')
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(2))
})

it('should save multiple entries with distinct identities on the same date', async () => {
  const repository = createRepository()
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={repository}
    />
  ))

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
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={failedRepository}
    />
  ))
  expect(await screen.findByText('이 기기의 일기장을 불러오지 못했어요.')).toBeInTheDocument()
})
