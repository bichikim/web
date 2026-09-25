/** @vitest-environment jsdom */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {useReplySpeechQueue} from '../components/p-studio/use-reply-speech-queue'

it('should start the next reply after dialogue occupancy cancels a hung speech', async () => {
  const [isOccupied, setIsOccupied] = createSignal(false)
  const [isDialogueOccupied, setIsDialogueOccupied] = createSignal(false)
  let resolveFirst: () => void = () => undefined
  const speak = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        resolveFirst = resolve
      }),
  )
  const stop = vi.fn()
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied, isOccupied, speak, stop}),
  )

  const firstReply = result.enqueue('첫 답변')
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('첫 답변'))

  setIsDialogueOccupied(true)
  await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce())
  await expect(firstReply).rejects.toMatchObject({name: 'AbortError'})

  setIsDialogueOccupied(false)
  const secondReply = result.enqueue('두 번째 답변')
  await vi.waitFor(() => expect(speak).toHaveBeenCalledTimes(2))

  resolveFirst()
  await expect(secondReply).resolves.toBeUndefined()

  cleanup()
})
