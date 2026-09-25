/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {useReplySpeechQueue} from '../components/p-studio/use-reply-speech-queue'

it('should wait for cancelled reply speech to settle after dialogue occupancy ends', async () => {
  const [isOccupied] = createSignal(false)
  const [isDialogueOccupied, setIsDialogueOccupied] = createSignal(false)
  const completions = new Map<string, VoidFunction>()
  const speak = vi.fn(
    (text: string) =>
      new Promise<void>((resolve) => {
        completions.set(text, resolve)
      }),
  )
  const stop = vi.fn()
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied, isOccupied, speak, stop}),
  )

  const activeReply = result.enqueue('재생 중인 답변')
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('재생 중인 답변'))
  const queuedReply = result.enqueue('대화 뒤에 재생할 답변')

  setIsDialogueOccupied(true)
  await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce())
  await expect(activeReply).rejects.toMatchObject({name: 'AbortError'})

  setIsDialogueOccupied(false)
  await Promise.resolve()
  expect(speak).toHaveBeenCalledTimes(1)

  completions.get('재생 중인 답변')?.()
  await vi.waitFor(() => expect(speak).toHaveBeenCalledTimes(2))

  completions.get('대화 뒤에 재생할 답변')?.()
  await expect(queuedReply).resolves.toBeUndefined()
  cleanup()
})
