/** @vitest-environment jsdom */
/** Repro for reply TTS continuing when `isOccupied` becomes true without `isDialogueOccupied` (e.g. pomoSay preparing/playing). */
import {renderHook} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {useReplySpeechQueue} from '../components/p-studio/use-reply-speech-queue'

it('should stop active reply speech when isOccupied becomes true while dialogue is idle', async () => {
  const [isDialogueOccupied] = createSignal(false)
  const [isOccupied, setIsOccupied] = createSignal(false)
  let completeSpeech = () => undefined
  const speech = new Promise<void>((resolve) => {
    completeSpeech = resolve
  })
  const speak = vi.fn(() => speech)
  const stop = vi.fn()
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied, isOccupied, speak, stop}),
  )

  const activeReply = result.enqueue('첫 답변')
  void activeReply.catch(() => undefined)
  await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce())

  setIsOccupied(true)
  await Promise.resolve()
  await Promise.resolve()

  expect(stop).toHaveBeenCalledOnce()
  completeSpeech()
  await expect(activeReply).rejects.toMatchObject({name: 'AbortError'})
  cleanup()
})
