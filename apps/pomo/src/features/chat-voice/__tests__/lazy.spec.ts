/** @vitest-environment jsdom */

import {renderHook} from '@solidjs/testing-library'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import type {ChatVoiceController} from '../index'
import {useLazyChatVoice} from '../lazy'

const chatVoice = vi.hoisted(() => ({useChatVoice: vi.fn()}))

vi.mock('../index', () => ({useChatVoice: chatVoice.useChatVoice}))

const createVoice = (): ChatVoiceController => ({
  activeViseme: () => 'wide',
  arm: vi.fn(),
  canPrepare: () => false,
  finish: vi.fn(async () => undefined),
  isGenerating: () => true,
  isPlaying: () => true,
  prepare: vi.fn(async () => undefined),
  speak: vi.fn(async () => undefined),
  state: () => ({message: '재생 중', phase: 'playing', status: 'speaking'}),
  statusMessage: () => '재생 중',
  stop: vi.fn(),
})

describe('useLazyChatVoice', () => {
  beforeEach(() => {
    chatVoice.useChatVoice.mockReset()
  })

  it('should expose inert defaults without loading the voice runtime', async () => {
    const {cleanup, result} = renderHook(() => useLazyChatVoice())

    expect(result.activeViseme()).toBe('rest')
    expect(result.canPrepare()).toBe(true)
    expect(result.isGenerating()).toBe(false)
    expect(result.isPlaying()).toBe(false)
    expect(result.state()).toEqual({status: 'unprepared'})
    expect(result.statusMessage()).toBe('채팅 모델과 함께 답변 음성 모델을 준비해 주세요.')
    expect(result.arm()).toBeUndefined()
    expect(result.stop()).toBeUndefined()
    await result.finish()

    expect(chatVoice.useChatVoice).not.toHaveBeenCalled()
    cleanup()
  })

  it('should cache one lazy load and delegate the complete controller contract', async () => {
    const voice = createVoice()
    chatVoice.useChatVoice.mockReturnValueOnce(voice)
    const props = {modelId: 'int8'} as const
    const {cleanup, result} = renderHook(() => useLazyChatVoice(props))

    const preparation = result.prepare()
    const speech = result.speak('안녕하세요.', 'M1')
    await Promise.all([preparation, speech])

    expect(chatVoice.useChatVoice).toHaveBeenCalledOnce()
    expect(chatVoice.useChatVoice).toHaveBeenCalledWith(props)
    expect(voice.prepare).toHaveBeenCalledOnce()
    expect(voice.speak).toHaveBeenCalledWith('안녕하세요.', 'M1')
    expect(result.activeViseme()).toBe('wide')
    expect(result.canPrepare()).toBe(false)
    expect(result.isGenerating()).toBe(true)
    expect(result.isPlaying()).toBe(true)
    expect(result.state()).toEqual({message: '재생 중', phase: 'playing', status: 'speaking'})
    expect(result.statusMessage()).toBe('재생 중')

    result.arm()
    await result.finish()
    result.stop()

    expect(voice.arm).toHaveBeenCalledOnce()
    expect(voice.finish).toHaveBeenCalledOnce()
    expect(voice.stop).toHaveBeenCalledOnce()
    cleanup()
    expect(voice.stop).toHaveBeenCalledTimes(2)
  })

  it('should reject a pending lazy load when its reactive owner is disposed', async () => {
    const voice = createVoice()
    chatVoice.useChatVoice.mockReturnValueOnce(voice)
    const {cleanup, result} = renderHook(() => useLazyChatVoice())

    const preparation = result.prepare()
    cleanup()
    const error = await preparation.then(
      () => null,
      (reason: unknown) => reason,
    )

    expect(error).toBeInstanceOf(DOMException)
    expect(error).toMatchObject({name: 'AbortError'})
    expect(chatVoice.useChatVoice).not.toHaveBeenCalled()
  })

  it('should reject loading when the controller cannot attach to the owner', async () => {
    chatVoice.useChatVoice.mockReturnValueOnce(undefined)
    const {cleanup, result} = renderHook(() => useLazyChatVoice())

    const error = await result.prepare().then(
      () => null,
      (reason: unknown) => reason,
    )

    expect(error).toEqual(
      new Error('Voice runtime could not attach to the current reactive owner.'),
    )
    cleanup()
  })

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
