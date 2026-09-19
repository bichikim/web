/** @vitest-environment jsdom */

import {formatLocalDate} from 'src/utils/format-local-date'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import type {PictureDiaryRepository} from '../../features/picture-diary'
import {PictureDiary} from '../components/memory-assist/PictureDiary'
import type {PictureDiaryEnvironment} from '../components/memory-assist/picture-diary/environment'

afterEach(cleanup)

it('should save the current local date when writing crosses midnight', async () => {
  const mountTime = new Date(2026, 8, 4, 23, 55, 0)
  let currentTime = mountTime
  const environment: PictureDiaryEnvironment = {
    createId: () => 'entry-midnight',
    now: () => currentTime,
    observeCompact: (onChange) => {
      onChange(false)
      return () => undefined
    },
  }
  const repository: PictureDiaryRepository = {
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    save: vi.fn().mockResolvedValue(undefined),
  }

  render(() => <PictureDiary environment={environment} repository={repository} />)
  expect(screen.getByLabelText('날짜')).toHaveValue(formatLocalDate(mountTime))

  fireEvent.input(screen.getByLabelText('그림일기 내용'), {target: {value: '자정 전후 일기'}})
  currentTime = new Date(2026, 8, 5, 0, 5, 0)
  fireEvent.click(screen.getByRole('button', {name: '일기 저장'}))

  await waitFor(() => expect(repository.save).toHaveBeenCalledOnce())
  expect(repository.save).toHaveBeenCalledWith(
    expect.objectContaining({date: formatLocalDate(currentTime)}),
  )
})
