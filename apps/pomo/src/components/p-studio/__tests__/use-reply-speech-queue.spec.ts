/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {useReplySpeechQueue} from '../use-reply-speech-queue'

it('should preserve existing dialogue and play queued replies in order', async () => {
  const [isOccupied, setIsOccupied] = createSignal(true)
  const completions: Array<() => void> = []
  const speak = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        completions.push(resolve)
      }),
  )
  const {cleanup, result} = renderHook(() => useReplySpeechQueue({isOccupied, speak}))

  const firstReply = result.enqueue('기존 대화 다음 답변')
  const secondReply = result.enqueue('그다음 답변')
  await Promise.resolve()

  expect(speak).not.toHaveBeenCalled()

  setIsOccupied(false)
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('기존 대화 다음 답변'))
  expect(speak).toHaveBeenCalledTimes(1)

  completions[0]?.()
  await firstReply
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('그다음 답변'))
  expect(speak).toHaveBeenCalledTimes(2)

  completions[1]?.()
  await secondReply
  cleanup()
})
