/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {PictureDiaryEntry} from '../../../features/picture-diary'
import {PictureDiaryEditor} from '../picture-diary/Editor'
import {PictureDiary} from '../PictureDiary'
import {setupDiary} from './fixtures/diary'
import {useEntryEditing} from '../picture-diary/use-entry-editing'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))
const {createRepository, environment, finishPageTurn, turns} = setupDiary()

const createExistingEntry = (): PictureDiaryEntry => ({
  createdAt: '2026-09-04T03:00:00.000Z',
  date: '2026-09-04',
  id: 'edit-entry',
  strokes: [{points: [{x: 0.5, y: 0.5}]}],
  text: '기존 일기',
  updatedAt: '2026-09-04T03:00:00.000Z',
  version: 1,
  weather: {condition: 'clear', temperatureCelsius: 24},
})

const renderExistingEntry = (
  entry: PictureDiaryEntry,
  repository: ReturnType<typeof createRepository>,
) => {
  const [savedEntry, setSavedEntry] = createSignal(entry)

  render(() => {
    const editing = useEntryEditing({environment, onSaved: setSavedEntry, repository})

    return (
      <PictureDiaryEditor
        turnEnvironment={turns.environment}
        spread={{left: {kind: 'blank'}, right: {entry: savedEntry(), kind: 'entry'}}}
        canSave={false}
        date={entry.date}
        onDateChange={() => undefined}
        onEditEntry={editing.open}
        editing={editing.editor()}
        onSave={() => undefined}
        onStrokesChange={() => undefined}
        onTextChange={() => undefined}
        strokes={[]}
        text=""
      />
    )
  })

  return {savedEntry}
}

it('should leave an existing entry unchanged when cancelling an edit', async () => {
  const entry = createExistingEntry()
  const repository = createRepository([entry])

  renderExistingEntry(entry, repository)
  fireEvent.click(screen.getByRole('button', {name: '편집'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const editingPage = screen.getByLabelText('그림일기 내용').closest('section')!
  expect(within(editingPage).getByLabelText('그림일기 내용')).toHaveValue('기존 일기')
  expect(editingPage.querySelector('circle')).toBeInTheDocument()
  fireEvent.input(within(editingPage).getByLabelText('그림일기 내용'), {
    target: {value: '취소할 수정'},
  })
  fireEvent.click(within(editingPage).getByRole('button', {name: '편집 취소'}))

  expect(repository.save).not.toHaveBeenCalled()
  expect(screen.getByText('기존 일기')).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '편집'})).toBeVisible()
})

it('should keep an existing-entry edit available after a failed save', async () => {
  const entry = createExistingEntry()
  const repository = createRepository([entry])
  repository.save.mockRejectedValueOnce(new Error('Storage failed'))

  const {savedEntry} = renderExistingEntry(entry, repository)
  fireEvent.click(screen.getByRole('button', {name: '편집'}))
  const editingPage = screen.getByLabelText('그림일기 내용').closest('section')!
  fireEvent.input(within(editingPage).getByLabelText('그림일기 내용'), {
    target: {value: '수정한 일기'},
  })
  fireEvent.click(within(editingPage).getByRole('button', {name: '일기 저장'}))

  expect(await within(editingPage).findByRole('alert')).toBeInTheDocument()
  expect(within(editingPage).getByLabelText('그림일기 내용')).toHaveValue('수정한 일기')
  fireEvent.click(within(editingPage).getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(repository.save).toHaveBeenCalledTimes(2))
  expect(repository.save.mock.lastCall?.[0]).toMatchObject({
    ...entry,
    text: '수정한 일기',
    updatedAt: expect.any(String),
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await screen.findByText('수정한 일기')
  expect(savedEntry()).toMatchObject({text: '수정한 일기'})
})

it('should preserve a new diary draft after saving an existing entry', async () => {
  const repository = createRepository([createExistingEntry()])
  render(() => (
    <PictureDiary
      repository={repository}
      environment={environment}
      turnEnvironment={turns.environment}
    />
  ))
  await waitFor(() => expect(repository.list).toHaveBeenCalledOnce())
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '작성 중인 새 일기'}})
  fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
  await finishPageTurn()
  fireEvent.click(screen.getByRole('button', {name: '편집'}))
  const editingPage = screen.getByLabelText('그림일기 내용').closest('section')!
  expect(within(editingPage).getByLabelText('그림일기 내용')).toHaveValue('기존 일기')
  fireEvent.input(within(editingPage).getByLabelText('그림일기 내용'), {
    target: {value: '수정한 일기'},
  })
  fireEvent.click(within(editingPage).getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await screen.findByText('수정한 일기')
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  await finishPageTurn()
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('작성 중인 새 일기')
})

it('should keep an edit save completed after disposal', async () => {
  const pending = Promise.withResolvers<void>()
  const updatedAt = '2026-09-26T00:00:00.000Z'
  const entry: PictureDiaryEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'edit-entry',
    strokes: [],
    text: '기존 일기',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  }
  const repository = createRepository([entry])
  repository.save.mockReturnValue(pending.promise)
  const onSaved = vi.fn()
  const fixedEnvironment = {...environment, now: () => new Date(updatedAt)}
  let dispose!: () => void
  let save!: () => Promise<void>

  createRoot((disposeRoot) => {
    dispose = disposeRoot
    const editing = useEntryEditing({environment: fixedEnvironment, onSaved, repository})
    editing.open(entry)
    save = editing.editor()!.onSave
  })

  const saving = save()
  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
  dispose()
  pending.resolve()

  await expect(saving).resolves.toBeUndefined()
  expect(repository.save).toHaveBeenCalledOnce()
  expect(repository.save).toHaveBeenCalledWith({...entry, updatedAt})
  expect(onSaved).not.toHaveBeenCalled()
})
