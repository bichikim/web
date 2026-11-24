/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import flushPromises from 'flush-promises'
import {SCodexPrompt} from '../SCodexPrompt'
import {startSpeechTurn} from '../../features/dictation/start-speech-turn'
import {transcribeAudio} from '../../features/dictation/transcribe-audio'
import {createDictationPreferences} from '../../features/dictation/preferences'

vi.mock('../../features/dictation/start-speech-turn', () => ({startSpeechTurn: vi.fn()}))
vi.mock('../../features/dictation/transcribe-audio', () => ({transcribeAudio: vi.fn()}))
vi.mock('../../features/dictation/preferences', () => ({createDictationPreferences: vi.fn()}))
beforeEach(() => {
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
    save: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it.each([{ctrlKey: true}, {metaKey: true}])(
  'should stop dictation and send the draft with all pending speech once (%j)',
  async (modifier) => {
    const first = Promise.withResolvers<Float32Array>()
    const final = Promise.withResolvers<Float32Array>()
    const stop = vi.fn(() => final.resolve(new Float32Array([0.2])))
    vi.mocked(startSpeechTurn)
      .mockResolvedValueOnce({audio: first.promise, stop: vi.fn()})
      .mockResolvedValueOnce({audio: final.promise, stop})
    const recognized = Promise.withResolvers<string>()
    const last = Promise.withResolvers<string>()
    vi.mocked(transcribeAudio)
      .mockReturnValueOnce(recognized.promise)
      .mockReturnValueOnce(last.promise)
    const send = vi.fn().mockResolvedValue(undefined)
    render(() => <SCodexPrompt sessionId="voice-shortcut" onSend={send} />)
    fireEvent.input(screen.getByRole('textbox'), {target: {value: '기존 입력'}})
    fireEvent.click(screen.getByRole('button', {name: '음성 입력'}))
    await flushPromises()
    first.resolve(new Float32Array([0.1]))
    await flushPromises()
    const microphone = screen.getByRole('button', {name: '녹음 끝내기'})
    fireEvent.keyDown(microphone, {...modifier, key: 'Enter'})
    fireEvent.keyDown(screen.getByRole('textbox'), {...modifier, key: 'Enter'})
    await flushPromises()
    expect(stop).toHaveBeenCalledOnce()
    expect(send).not.toHaveBeenCalled()
    expect(screen.getByRole('button', {name: '보내기'})).toBeDisabled()
    recognized.resolve('앞서 말한 내용')
    await flushPromises()
    expect(screen.getByRole('textbox')).toHaveValue('기존 입력 앞서 말한 내용')
    expect(send).not.toHaveBeenCalled()
    last.resolve('방금 말한 내용')
    await flushPromises()
    expect(send).toHaveBeenCalledExactlyOnceWith(
      'voice-shortcut',
      '기존 입력 앞서 말한 내용 방금 말한 내용',
    )
    expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  },
)

it('should submit speech from an initially empty draft after final recognition', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  vi.mocked(startSpeechTurn).mockResolvedValueOnce({
    audio: audio.promise,
    stop: () => audio.resolve(new Float32Array([0.1])),
  })
  const recognition = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  const send = vi.fn().mockResolvedValue(undefined)
  render(() => <SCodexPrompt sessionId="voice-only" onSend={send} />)
  fireEvent.click(screen.getByRole('button', {name: '음성 입력'}))
  await flushPromises()
  expect(screen.getByRole('button', {name: '보내기'})).toBeDisabled()
  fireEvent.keyDown(screen.getByRole('textbox'), {ctrlKey: true, key: 'Enter'})
  await flushPromises()
  expect(send).not.toHaveBeenCalled()
  recognition.resolve('음성으로만 보낸 내용')
  await flushPromises()
  expect(send).toHaveBeenCalledExactlyOnceWith('voice-only', '음성으로만 보낸 내용')
})

it('should wait for recognition already in progress after the microphone was switched off', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  const stop = vi.fn(() => audio.resolve(new Float32Array([0.1])))
  vi.mocked(startSpeechTurn).mockResolvedValueOnce({audio: audio.promise, stop})
  const recognition = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  const send = vi.fn().mockResolvedValue(undefined)
  render(() => <SCodexPrompt sessionId="voice-finishing" onSend={send} />)
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '기존 문장'}})
  fireEvent.click(screen.getByRole('button', {name: '음성 입력'}))
  await flushPromises()
  fireEvent.click(screen.getByRole('button', {name: '녹음 끝내기'}))
  await flushPromises()
  fireEvent.keyDown(screen.getByRole('textbox'), {ctrlKey: true, key: 'Enter'})
  expect(send).not.toHaveBeenCalled()
  recognition.resolve('마무리한 음성')
  await flushPromises()
  expect(stop).toHaveBeenCalledOnce()
  expect(send).toHaveBeenCalledExactlyOnceWith('voice-finishing', '기존 문장 마무리한 음성')
})

it.each(['escape', 'deselect', 'unmount'] as const)(
  'should discard a pending voice shortcut when cancelled by %s',
  async (action) => {
    const audio = Promise.withResolvers<Float32Array>()
    vi.mocked(startSpeechTurn).mockResolvedValueOnce({
      audio: audio.promise,
      stop: () => audio.resolve(new Float32Array([0.1])),
    })
    const recognition = Promise.withResolvers<string>()
    vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
    const send = vi.fn().mockResolvedValue(undefined)
    const [active, setActive] = createSignal(true)
    const view = render(() => (
      <SCodexPrompt sessionId="voice-cancel" active={active()} onSend={send} />
    ))
    fireEvent.input(screen.getByRole('textbox'), {target: {value: '남겨 둘 초안'}})
    fireEvent.click(screen.getByRole('button', {name: '음성 입력'}))
    await flushPromises()
    fireEvent.keyDown(screen.getByRole('textbox'), {ctrlKey: true, key: 'Enter'})
    await flushPromises()
    switch (action) {
      case 'escape':
        fireEvent.keyDown(screen.getByRole('textbox'), {key: 'Escape'})
        break
      case 'deselect':
        setActive(false)
        break
      case 'unmount':
        view.unmount()
        break
    }
    recognition.resolve('취소 후 도착한 말')
    await flushPromises()
    expect(send).not.toHaveBeenCalled()
  },
)

it('should retain the draft instead of sending partial input when final recognition fails', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  vi.mocked(startSpeechTurn).mockResolvedValueOnce({
    audio: audio.promise,
    stop: () => audio.resolve(new Float32Array([0.1])),
  })
  vi.mocked(transcribeAudio).mockRejectedValue(new Error('마지막 음성을 변환하지 못했어요.'))
  const send = vi.fn()
  render(() => <SCodexPrompt sessionId="voice-failure" onSend={send} />)
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '보존할 입력'}})
  fireEvent.click(screen.getByRole('button', {name: '음성 입력'}))
  await flushPromises()
  fireEvent.keyDown(screen.getByRole('textbox'), {ctrlKey: true, key: 'Enter'})
  await flushPromises()
  expect(send).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox')).toHaveValue('보존할 입력')
  expect(screen.getByRole('alert')).toHaveTextContent('마지막 음성을 변환하지 못했어요.')
})
it('should append voice input to the Codex draft and send it only after explicit submission', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  const recognition = Promise.withResolvers<string>()
  const second = Promise.withResolvers<Float32Array>()
  const third = Promise.withResolvers<Float32Array>()
  const send = vi.fn().mockResolvedValue(undefined)
  vi.mocked(startSpeechTurn)
    .mockResolvedValueOnce({audio: audio.promise, stop: vi.fn()})
    .mockResolvedValueOnce({audio: second.promise, stop: vi.fn()})
    .mockResolvedValueOnce({audio: third.promise, stop: vi.fn()})
  vi.mocked(transcribeAudio)
    .mockReturnValueOnce(recognition.promise)
    .mockResolvedValueOnce('추가한 말')
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
    save: vi.fn(),
  })
  render(() => <SCodexPrompt sessionId="voice-chat" onSend={send} />)
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '초안'}})
  fireEvent.click(screen.getByRole('button', {name: '음성 입력'}))
  await screen.findByRole('button', {name: '녹음 끝내기'})
  expect(screen.getByRole('textbox')).toBeEnabled()
  audio.resolve(new Float32Array([0.1]))
  await flushPromises()
  recognition.resolve('인식된 말')
  await recognition.promise
  await flushPromises()
  expect(screen.getByRole('textbox')).toHaveValue('초안 인식된 말')
  expect(screen.getByRole('button', {name: '녹음 끝내기'})).toHaveAttribute('aria-pressed', 'true')
  expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  second.resolve(new Float32Array([0.2]))
  await second.promise
  await flushPromises()
  expect(screen.getByRole('textbox')).toHaveValue('초안 인식된 말 추가한 말')
  expect(send).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: '보내기'}))
  expect(send).toHaveBeenCalledExactlyOnceWith('voice-chat', '초안 인식된 말 추가한 말')
  third.resolve(new Float32Array())
})
it('should present an accessible icon submit button without a separate text button row', () => {
  render(() => <SCodexPrompt sessionId="chat-one" />)
  const button = screen.getByRole('button', {name: '보내기'})
  expect(button.textContent?.trim()).toBe('')
  expect(button).toHaveAttribute('title', '보내기')
})
it('should queue a prompt only for its chat and prevent duplicate clicks', async () => {
  const delivery = Promise.withResolvers<void>()
  const send = vi.fn(() => delivery.promise)
  render(() => <SCodexPrompt sessionId="chat-one" onSend={send} />)
  expect(screen.getByRole('button', {name: '보내기'})).toBeDisabled()
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '다음 요청'}})
  const button = screen.getByRole('button', {name: '보내기'})
  fireEvent.click(button)
  expect(screen.queryByRole('textbox')).toBeNull()
  expect(screen.queryByRole('form', {name: 'Codex 프롬프트 전송'})).toBeNull()
  fireEvent.click(button)
  delivery.resolve()
  await delivery.promise
  expect(send).toHaveBeenCalledExactlyOnceWith('chat-one', '다음 요청')
  expect(screen.queryByRole('textbox')).toBeNull()
})
it('should retain the prompt after a failed delivery without retrying automatically', async () => {
  const send = vi.fn().mockRejectedValue(new Error('offline'))
  render(() => <SCodexPrompt sessionId="chat-two" onSend={send} />)
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '유지할 요청'}})
  fireEvent.click(screen.getByRole('button', {name: '보내기'}))
  await Promise.resolve()
  expect(screen.getByRole('alert')).toHaveTextContent('전송하지 못했습니다.')
  expect(screen.getByRole('textbox')).toHaveValue('유지할 요청')
  expect(send).toHaveBeenCalledExactlyOnceWith('chat-two', '유지할 요청')
})

it('should show an empty composer again only when a new response arrives', async () => {
  const [notification, setNotification] = createSignal(1)
  const send = vi.fn().mockResolvedValue(undefined)
  render(() => <SCodexPrompt sessionId="chat" notificationId={notification()} onSend={send} />)
  fireEvent.input(screen.getByRole('textbox'), {target: {value: '요청'}})
  fireEvent.click(screen.getByRole('button', {name: '보내기'}))
  await Promise.resolve()
  expect(screen.queryByRole('textbox')).toBeNull()
  setNotification(2)
  expect(screen.getByRole('textbox')).toHaveValue('')
  expect(screen.queryByRole('alert')).toBeNull()
})

it.each([{ctrlKey: true}, {metaKey: true}])(
  'should send the draft with the platform modifier and Enter (%j)',
  async (modifier) => {
    const send = vi.fn().mockResolvedValue(undefined)
    render(() => <SCodexPrompt sessionId="shortcut-chat" onSend={send} />)
    const input = screen.getByRole('textbox')
    fireEvent.input(input, {target: {value: '단축키로 보낼 요청'}})
    expect(fireEvent.keyDown(input, {...modifier, key: 'Enter'})).toBe(false)
    expect(send).toHaveBeenCalledExactlyOnceWith('shortcut-chat', '단축키로 보낼 요청')
    await Promise.resolve()
    expect(screen.queryByRole('textbox')).toBeNull()
  },
)

it.each([
  {key: 'Enter'},
  {ctrlKey: true, isComposing: true, key: 'Enter'},
  {key: 'Enter', keyCode: 229, metaKey: true},
  {ctrlKey: true, key: 'Enter', repeat: true},
  {altKey: true, ctrlKey: true, key: 'Enter'},
  {key: 'Enter', metaKey: true, shiftKey: true},
])('should preserve editing without sending for %j', (keyboard) => {
  const send = vi.fn()
  render(() => <SCodexPrompt sessionId="chat" onSend={send} />)
  const input = screen.getByRole('textbox')
  fireEvent.input(input, {target: {value: '입력 중인 글'}})
  fireEvent.keyDown(input, keyboard)
  expect(send).not.toHaveBeenCalled()
  expect(input).toHaveValue('입력 중인 글')
})

it('should not send an empty draft with the shortcut', () => {
  const send = vi.fn()
  render(() => <SCodexPrompt sessionId="chat" onSend={send} />)
  const input = screen.getByRole('textbox')
  fireEvent.input(input, {target: {value: '  '}})
  fireEvent.keyDown(input, {ctrlKey: true, key: 'Enter'})
  expect(send).not.toHaveBeenCalled()
})
