/** @vitest-environment jsdom */
/** This standalone file preserves the reproduction command referenced by issue #1870. */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {useReplySpeechQueue} from '../components/p-studio/use-reply-speech-queue'

it('should wait for canceled in-flight speech before starting the next reply', async () => {
  const [isEnabled, setIsEnabled] = createSignal(true)
  const [isOccupied] = createSignal(false)
  let completeFirst = () => undefined
  let completeSecond = () => undefined
  const firstSpeech = new Promise<void>((resolve) => {
    completeFirst = resolve
  })
  const secondSpeech = new Promise<void>((resolve) => {
    completeSecond = resolve
  })
  const speak = vi.fn((text: string) => (text === '첫 답변' ? firstSpeech : secondSpeech))
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
  await Promise.resolve()
  expect(speak).toHaveBeenCalledTimes(1)

  completeFirst()
  await vi.waitFor(() => expect(speak).toHaveBeenCalledTimes(2))

  completeSecond()
  await expect(secondReply).resolves.toBeUndefined()
  cleanup()
})
