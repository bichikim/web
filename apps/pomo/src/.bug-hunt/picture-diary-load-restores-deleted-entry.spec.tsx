/** @vitest-environment jsdom */
import {fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import type {PictureDiaryEntry, PictureDiaryRepository} from '../features/picture-diary'
import {PictureDiary} from '../components/memory-assist/PictureDiary'
import {setupDiary} from '../components/memory-assist/__tests__/fixtures/diary'

vi.mock('src/features/model-download', () => ({useModelDownload: vi.fn()}))
vi.mock('src/features/image-generation/client', () => ({runImageGeneration: vi.fn()}))

const {environment, finishPageTurn, getSpread, turns, viewport} = setupDiary()

it('should not resurrect a deleted entry when the initial list resolves after deletion', async () => {
  const pending = Promise.withResolvers<ReadonlyArray<PictureDiaryEntry>>()
  const repository = {
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockReturnValue(pending.promise),
    save: vi.fn().mockResolvedValue(undefined),
  } satisfies PictureDiaryRepository

  viewport.compact = true
  turns.setCompact(true)
  render(() => (
    <PictureDiary
      environment={environment}
      turnEnvironment={turns.environment}
      repository={repository}
    />
  ))

  fireEvent.input(screen.getByLabelText('그림일기 내용'), {
    target: {value: '삭제 후 부활하면 안 되는 일기'},
  })
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))

  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())

  const saved = repository.save.mock.calls[0]![0] as PictureDiaryEntry
  await waitFor(() => expect(screen.getByText('삭제 후 부활하면 안 되는 일기')).toBeInTheDocument())

  const [year, month, day] = saved.date.split('-')
  const deleteButton = await screen.findByRole('button', {
    name: `${year}. ${month}. ${day}. 일기 삭제`,
  })
  fireEvent.click(deleteButton)
  fireEvent.click(deleteButton)

  await waitFor(() => expect(repository.delete).toHaveBeenCalledWith(saved.id))
  await waitFor(() =>
    expect(screen.queryByText('삭제 후 부활하면 안 되는 일기')).not.toBeInTheDocument(),
  )

  pending.resolve([saved])
  await pending.promise

  fireEvent.click(screen.getAllByRole('button', {name: '이전 일기 보기'})[0]!)
  await finishPageTurn()

  expect(within(getSpread()).queryByText('삭제 후 부활하면 안 되는 일기')).not.toBeInTheDocument()
})
