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
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied: isOccupied, isOccupied, speak, stop: vi.fn()}),
  )

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

it('should continue the queue after an active reply speech fails', async () => {
  const [isOccupied, setIsOccupied] = createSignal(true)
  const firstError = new Error('첫 답변 음성 실패')
  const speak = vi.fn().mockRejectedValueOnce(firstError).mockResolvedValueOnce(undefined)
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied: isOccupied, isOccupied, speak, stop: vi.fn()}),
  )

  const firstReply = result.enqueue('첫 답변')
  setIsOccupied(false)
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('첫 답변'))
  const secondReply = result.enqueue('두 번째 답변')

  await expect(firstReply).rejects.toBe(firstError)
  await vi.waitFor(() => expect(speak).toHaveBeenCalledTimes(2))
  await expect(secondReply).resolves.toBeUndefined()

  expect(speak).toHaveBeenNthCalledWith(1, '첫 답변')
  expect(speak).toHaveBeenNthCalledWith(2, '두 번째 답변')
  cleanup()
})

it('should continue the queue when active reply speech throws before returning a promise', async () => {
  const [isOccupied] = createSignal(false)
  const firstError = new Error('첫 답변 음성 예외')
  const speak = vi
    .fn<(text: string) => Promise<void>>()
    .mockImplementationOnce(() => {
      throw firstError
    })
    .mockResolvedValueOnce(undefined)
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied: isOccupied, isOccupied, speak, stop: vi.fn()}),
  )

  const firstReply = result.enqueue('첫 답변')
  const secondReply = result.enqueue('두 번째 답변')

  await expect(firstReply).rejects.toBe(firstError)
  await vi.waitFor(() => expect(speak).toHaveBeenCalledTimes(2))
  await expect(secondReply).resolves.toBeUndefined()

  expect(speak).toHaveBeenNthCalledWith(1, '첫 답변')
  expect(speak).toHaveBeenNthCalledWith(2, '두 번째 답변')
  cleanup()
})

it('should reject an active reply when disposed', async () => {
  const [isOccupied] = createSignal(false)
  let completeSpeech = () => {}
  const speak = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        completeSpeech = resolve
      }),
  )
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied: isOccupied, isOccupied, speak, stop: vi.fn()}),
  )

  const reply = result.enqueue('dispose 중인 답변')
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('dispose 중인 답변'))

  cleanup()
  completeSpeech()

  return expect(reply).rejects.toMatchObject({name: 'AbortError'})
})

it('should reject replies enqueued after disposal', async () => {
  const [isOccupied] = createSignal(true)
  const speak = vi.fn(async () => undefined)
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied: isOccupied, isOccupied, speak, stop: vi.fn()}),
  )

  cleanup()

  const reply = result.enqueue('dispose 이후 추가된 답변')

  return expect(reply).rejects.toMatchObject({name: 'AbortError'})
})

it('should reject pending replies when disabled', async () => {
  const [isEnabled, setIsEnabled] = createSignal(true)
  const [isOccupied] = createSignal(true)
  const speak = vi.fn(async () => undefined)
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({
      isDialogueOccupied: isOccupied,
      isEnabled,
      isOccupied,
      speak,
      stop: vi.fn(),
    }),
  )

  const reply = result.enqueue('숨겨진 입력기의 답변')
  setIsEnabled(false)

  await expect(reply).rejects.toMatchObject({name: 'AbortError'})
  expect(speak).not.toHaveBeenCalled()
  cleanup()
})

it('should stop an active reply when disabled', async () => {
  const [isEnabled, setIsEnabled] = createSignal(true)
  const [isOccupied] = createSignal(false)
  let completeSpeech: () => void = () => undefined
  const speak = vi.fn(
    () =>
      new Promise<void>((resolve) => {
        completeSpeech = resolve
      }),
  )
  const stop = vi.fn(() => completeSpeech())
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied: isOccupied, isEnabled, isOccupied, speak, stop}),
  )

  const reply = result.enqueue('재생 중인 답변')
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('재생 중인 답변'))

  setIsEnabled(false)

  await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce())
  await expect(reply).rejects.toMatchObject({name: 'AbortError'})
  cleanup()
})

it('should abort an active reply when dialogue becomes occupied', async () => {
  const [isOccupied, setIsOccupied] = createSignal(false)
  const [isDialogueOccupied, setIsDialogueOccupied] = createSignal(false)
  let abortSpeech: () => void = () => undefined
  const speak = vi
    .fn<(text: string) => Promise<void>>()
    .mockImplementationOnce(
      () =>
        new Promise<void>((_, reject) => {
          abortSpeech = () => reject(new DOMException('Speech stopped.', 'AbortError'))
          setIsOccupied(true)
        }),
    )
    .mockResolvedValueOnce(undefined)
  const stop = vi.fn(() => abortSpeech())
  const {cleanup, result} = renderHook(() =>
    useReplySpeechQueue({isDialogueOccupied, isOccupied, speak, stop}),
  )

  const activeReply = result.enqueue('재생 중인 답변')
  await vi.waitFor(() => expect(speak).toHaveBeenCalledWith('재생 중인 답변'))
  const queuedReply = result.enqueue('대화 뒤에 재생할 답변')
  await Promise.resolve()

  expect(stop).not.toHaveBeenCalled()

  setIsDialogueOccupied(true)

  await vi.waitFor(() => expect(stop).toHaveBeenCalledOnce())
  const activeReplyError = await activeReply.catch((error: unknown) => error)
  expect(activeReplyError).toMatchObject({name: 'AbortError'})
  expect(speak).toHaveBeenCalledTimes(1)

  setIsDialogueOccupied(false)
  setIsOccupied(false)

  await vi.waitFor(() => expect(speak).toHaveBeenCalledTimes(2))
  return expect(queuedReply).resolves.toBeUndefined().finally(cleanup)
})
