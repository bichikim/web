/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import type {PictureDiaryRepository} from '../../../features/picture-diary'
import {PictureDiary} from '../PictureDiary'
import type {PictureDiaryEnvironment} from '../picture-diary/environment'

afterEach(cleanup)

it('should use the supplied date and ID and release its viewport subscription on disposal', async () => {
  const release = vi.fn()
  const environment: PictureDiaryEnvironment = {
    createId: () => 'injected-entry',
    now: () => new Date('2026-09-04T03:00:00.000Z'),
    observeCompact: vi.fn((onChange) => {
      onChange(true)
      return release
    }),
  }
  const repository: PictureDiaryRepository = {
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  }
  const {unmount} = render(() => <PictureDiary environment={environment} repository={repository} />)
  expect(screen.getByLabelText('날짜')).toHaveValue('2026-09-04')
  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '주입된 시계로 저장'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  await waitFor(() =>
    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        createdAt: '2026-09-04T03:00:00.000Z',
        date: '2026-09-04',
        id: 'injected-entry',
        text: '주입된 시계로 저장',
        updatedAt: '2026-09-04T03:00:00.000Z',
      }),
    ),
  )
  expect(environment.observeCompact).toHaveBeenCalledOnce()
  expect(release).not.toHaveBeenCalled()
  unmount()
  expect(release).toHaveBeenCalledOnce()
})

it('should discard a new entry when saving completes after disposal', async () => {
  const pending = Promise.withResolvers<void>()
  const environment: PictureDiaryEnvironment = {
    createId: () => 'disposed-entry',
    now: () => new Date('2026-09-04T03:00:00.000Z'),
    observeCompact: vi.fn(() => () => undefined),
  }
  const repository: PictureDiaryRepository = {
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockReturnValue(pending.promise),
  }
  const {unmount} = render(() => <PictureDiary environment={environment} repository={repository} />)

  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '닫히는 동안 저장'}})
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))
  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())

  const savedEntryId = vi.mocked(repository.save).mock.calls[0]![0].id
  unmount()
  pending.resolve()
  await pending.promise

  await waitFor(() => expect(repository.delete).toHaveBeenCalledWith(savedEntryId))
})
