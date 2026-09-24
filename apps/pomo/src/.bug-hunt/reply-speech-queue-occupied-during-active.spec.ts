/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {useReplySpeechQueue} from '../components/p-studio/use-reply-speech-queue'

it('should cancel an active reply when dialogue becomes occupied', async () => {
  const [isOccupied, setIsOccupied] = createSignal(false)
  let completeSpeech: () => void = () => undefined
  const speak = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        completeSpeech = resolve
      }),
  )
  const stop = vi.fn()
  const {cleanup, result} = renderHook(() => useReplySpeechQueue({isOccupied, speak, stop}))

  const reply = result.enqueue('답변 재생 중')
  reply.catch(() => undefined)
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('답변 재생 중'))

  setIsOccupied(true)
  await Promise.resolve()
  await Promise.resolve()

  expect(stop).toHaveBeenCalledOnce()
  await expect(reply).rejects.toMatchObject({name: 'AbortError'})

  completeSpeech()
  cleanup()
})
