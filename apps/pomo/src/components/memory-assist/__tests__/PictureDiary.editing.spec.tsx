/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {PictureDiaryEntry} from '../../../features/picture-diary'
import {PictureDiary} from '../PictureDiary'
import {setupDiary} from './fixtures/diary'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))
const {createRepository, environment, finishPageTurn, turns} = setupDiary()

it('should edit an existing entry, retry a failed save, and preserve the new diary draft', async () => {
  const entry: PictureDiaryEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'edit-entry',
    strokes: [{points: [{x: 0.5, y: 0.5}]}],
    text: '기존 일기',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
    weather: {condition: 'clear', temperatureCelsius: 24},
  }
  const repository = createRepository([entry])
  repository.save.mockRejectedValueOnce(new Error('Storage failed'))
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
  fireEvent.click(await screen.findByRole('button', {name: '편집'}))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  const modal = screen.getByLabelText('그림일기 내용').closest('section')!
  expect(within(modal).getByLabelText('그림일기 내용')).toHaveValue('기존 일기')
  expect(modal.querySelector('circle')).toBeInTheDocument()
  fireEvent.input(within(modal).getByLabelText('그림일기 내용'), {target: {value: '취소할 수정'}})
  fireEvent.click(within(modal).getByRole('button', {name: '편집 취소'}))
  expect(repository.save).not.toHaveBeenCalled()
  expect(screen.getByText('기존 일기')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '편집'}))
  const editingPage = screen.getByLabelText('그림일기 내용').closest('section')!
  expect(within(editingPage).getByLabelText('그림일기 내용')).toHaveValue('기존 일기')
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
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  await finishPageTurn()
  expect(screen.getByLabelText('그림일기 내용')).toHaveValue('작성 중인 새 일기')
})
