/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {useReplySpeechQueue} from '../components/p-studio/use-reply-speech-queue'

it('should reject an in-flight reply when the queue is disposed', async () => {
  const [isOccupied] = createSignal(false)
  let completeSpeech: (() => void) | undefined
  const speak = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        completeSpeech = resolve
      }),
  )
  const {cleanup, result} = renderHook(() => useReplySpeechQueue({isOccupied, speak}))

  const reply = result.enqueue('진행 중 답변')
  await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce())

  cleanup()

  let settled = false
  reply
    .then(() => {
      settled = true
    })
    .catch(() => {
      settled = true
    })
  await Promise.resolve()
  await Promise.resolve()

  expect(settled).toBe(true)
  await expect(reply).rejects.toMatchObject({name: 'AbortError'})
  expect(completeSpeech).toBeTypeOf('function')
})
