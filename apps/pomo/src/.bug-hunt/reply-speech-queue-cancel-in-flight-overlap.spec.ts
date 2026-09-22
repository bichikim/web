/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {useReplySpeechQueue} from '../components/p-studio/use-reply-speech-queue'

it('should not start a new reply while a cancelled speak promise is still pending', async () => {
  const [isEnabled, setIsEnabled] = createSignal(true)
  const [isOccupied] = createSignal(false)
  let resolveFirstSpeech: () => void = () => undefined
  const speak = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveFirstSpeech = resolve
      }),
  )
  const stop = vi.fn()
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isEnabled, isOccupied, speak, stop}),
  )

  const firstReply = result.enqueue('첫 답변')
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('첫 답변'))

  setIsEnabled(false)
  await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce())
  await expect(firstReply).rejects.toMatchObject({name: 'AbortError'})

  setIsEnabled(true)
  const secondReply = result.enqueue('두 번째 답변')
  await Promise.resolve()

  expect(speak).toHaveBeenCalledTimes(1)

  cleanup()
})
