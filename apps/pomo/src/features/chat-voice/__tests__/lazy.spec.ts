/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'

import type {ChatVoiceController} from '../index'
import {useLazyChatVoice} from '../lazy'

const chatVoice = vi.hoisted(() => ({useChatVoice: vi.fn()}))

vi.mock('../index', () => ({useChatVoice: chatVoice.useChatVoice}))

const createVoice = (): ChatVoiceController => ({
  activeViseme: () => 'rest',
  arm: vi.fn(),
  canPrepare: () => true,
  finish: vi.fn(async () => undefined),
  isGenerating: () => false,
  isPlaying: () => false,
  prepare: vi.fn(async () => undefined),
  speak: vi.fn(async () => undefined),
  state: () => ({status: 'unprepared'}),
  statusMessage: () => '준비되지 않음',
  stop: vi.fn(),
})

describe('useLazyChatVoice', () => {
  it('should retry loading after voice runtime initialization fails', async () => {
    const initializationError = new Error('청크 초기화 실패')
    const voice = createVoice()
    chatVoice.useChatVoice.mockImplementationOnce(() => {
      throw initializationError
    })
    chatVoice.useChatVoice.mockReturnValueOnce(voice)
    const {cleanup, result} = renderHook(() => useLazyChatVoice())

    const firstError = await result.prepare().then(
      () => null,
      (error: unknown) => error,
    )
    await result.prepare()

    expect(firstError).toBe(initializationError)
    expect(chatVoice.useChatVoice).toHaveBeenCalledTimes(2)
    expect(voice.prepare).toHaveBeenCalledOnce()
    cleanup()
  })
})
