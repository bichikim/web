/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import flushPromises from 'flush-promises'
import {startSpeechTurn} from '../../features/dictation/start-speech-turn'
import {transcribeAudio} from '../../features/dictation/transcribe-audio'
import {SSpeechComposer} from '../SSpeechComposer'
import {createDictationPreferences} from '../../features/dictation/preferences'
import {createSignal} from 'solid-js'
import {isTauri} from '@tauri-apps/api/core'
import {getCurrentWebviewWindow} from '@tauri-apps/api/webviewWindow'

vi.mock('../../features/dictation/start-speech-turn', () => ({startSpeechTurn: vi.fn()}))
vi.mock('../../features/dictation/transcribe-audio', () => ({transcribeAudio: vi.fn()}))
vi.mock('../../features/dictation/preferences', () => ({createDictationPreferences: vi.fn()}))
vi.mock('@tauri-apps/api/core', () => ({isTauri: vi.fn()}))
vi.mock('@tauri-apps/api/webviewWindow', () => ({getCurrentWebviewWindow: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('should operate only the selected composer from a native global microphone event', async () => {
  vi.mocked(isTauri).mockReturnValue(true)
  const receivers: (() => void)[] = []
  const listen = vi.fn(async (_event: string, receive: () => void) => {
    receivers.push(receive)
    return vi.fn()
  })
  vi.mocked(getCurrentWebviewWindow).mockReturnValue({listen} as unknown as ReturnType<
    typeof getCurrentWebviewWindow
  >)
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
    save: vi.fn(),
  })
  const first = Promise.withResolvers<Float32Array>()
  const second = Promise.withResolvers<Float32Array>()
  const stop = vi.fn()
  vi.mocked(startSpeechTurn)
    .mockResolvedValueOnce({audio: first.promise, stop: vi.fn()})
    .mockResolvedValueOnce({audio: second.promise, stop})
  const [front, setFront] = createSignal(true)
  render(() => (
    <>
      <SSpeechComposer continuous active={front()} />
      <SSpeechComposer continuous active={!front()} />
    </>
  ))
  await flushPromises()
  receivers.forEach((receive) => receive())
  await flushPromises()
  expect(startSpeechTurn).toHaveBeenCalledOnce()
  expect(screen.getAllByRole('button', {name: '연속 대화 종료'})).toHaveLength(1)
  expect(screen.getAllByRole('button', {name: '연속 대화 시작'})).toHaveLength(1)
  const firstSignal = vi.mocked(startSpeechTurn).mock.calls[0][0]
  setFront(false)
  receivers.forEach((receive) => receive())
  await flushPromises()
  expect(firstSignal.aborted).toBe(true)
  expect(startSpeechTurn).toHaveBeenCalledTimes(2)
  receivers.forEach((receive) => receive())
  await flushPromises()
  expect(stop).toHaveBeenCalledOnce()
  fireEvent.keyDown(screen.getAllByRole('textbox')[1], {key: 'Escape'})
  expect(screen.getAllByRole('button', {name: '연속 대화 시작'})).toHaveLength(2)
  expect(vi.mocked(startSpeechTurn).mock.calls[1][0].aborted).toBe(true)
  first.resolve(new Float32Array())
  second.resolve(new Float32Array())
  await flushPromises()
})

it.each([true, false])(
  'should start speech then send the final transcript once from native shortcuts (continuous=%s)',
  async (continuous) => {
    vi.mocked(isTauri).mockReturnValue(true)
    let receive: () => void = () => undefined
    const listen = vi.fn(async (_event: string, callback: () => void) => {
      receive = callback
      return vi.fn()
    })
    vi.mocked(getCurrentWebviewWindow).mockReturnValue({listen} as unknown as ReturnType<
      typeof getCurrentWebviewWindow
    >)
    vi.mocked(createDictationPreferences).mockReturnValue({
      close: vi.fn(),
      read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
      save: vi.fn(),
    })
    const audio = Promise.withResolvers<Float32Array>()
    const recognition = Promise.withResolvers<string>()
    const answer = Promise.withResolvers<void>()
    const stop = vi.fn(() => audio.resolve(Float32Array.of(0.1)))
    vi.mocked(startSpeechTurn).mockResolvedValueOnce({audio: audio.promise, stop})
    vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
    const [draft, edit] = createSignal('기존 입력')
    const [busy, setBusy] = createSignal(false)
    const onSend = vi.fn(() => {
      setBusy(true)
      return answer.promise
    })
    render(() => (
      <SSpeechComposer
        continuous={continuous}
        value={draft()}
        onEdit={edit}
        onSend={onSend}
        disabled={busy()}
      />
    ))
    await flushPromises()
    receive()
    await flushPromises()
    expect(startSpeechTurn).toHaveBeenCalledOnce()
    receive()
    receive()
    await flushPromises()
    expect(stop).toHaveBeenCalledOnce()
    expect(onSend).not.toHaveBeenCalled()
    recognition.resolve('방금 들은 내용')
    await flushPromises()
    expect(draft()).toBe('기존 입력 방금 들은 내용')
    expect(onSend).toHaveBeenCalledOnce()
    expect(startSpeechTurn).toHaveBeenCalledOnce()
    if (continuous) {
      expect(screen.getByRole('button', {name: '답변 중단하고 말하기'})).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    } else {
      expect(screen.getByRole('button', {name: '음성 입력'})).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    }
    fireEvent.keyDown(screen.getByRole('textbox'), {key: 'Escape'})
    answer.resolve()
    await flushPromises()
  },
)

it.each(['click', 'shortcut'] as const)(
  'should interrupt reply waiting and resume listening from a microphone %s',
  async (action) => {
    let receive: () => void = () => undefined
    vi.mocked(isTauri).mockReturnValue(action === 'shortcut')
    const listen = vi.fn(async (_event: string, callback: () => void) => {
      receive = callback
      return vi.fn()
    })
    vi.mocked(getCurrentWebviewWindow).mockReturnValue({listen} as unknown as ReturnType<
      typeof getCurrentWebviewWindow
    >)
    vi.mocked(createDictationPreferences).mockReturnValue({
      close: vi.fn(),
      read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
      save: vi.fn(),
    })
    const first = Promise.withResolvers<Float32Array>()
    const second = Promise.withResolvers<Float32Array>()
    const answer = Promise.withResolvers<void>()
    vi.mocked(startSpeechTurn)
      .mockResolvedValueOnce({audio: first.promise, stop: vi.fn()})
      .mockResolvedValueOnce({audio: second.promise, stop: vi.fn()})
    vi.mocked(transcribeAudio).mockResolvedValue('첫 번째 말')
    const [busy, setBusy] = createSignal(false)
    const onSend = vi.fn(() => {
      setBusy(true)
      return answer.promise
    })
    const onInterrupt = vi.fn(() => setBusy(false))
    render(() => (
      <SSpeechComposer continuous disabled={busy()} onSend={onSend} onInterrupt={onInterrupt} />
    ))
    fireEvent.click(screen.getByRole('button', {name: '연속 대화 시작'}))
    await flushPromises()
    first.resolve(Float32Array.of(0.1))
    await flushPromises()
    expect(screen.getByRole('button', {name: '답변 중단하고 말하기'})).toBeEnabled()
    if (action === 'click') {
      fireEvent.click(screen.getByRole('button', {name: '답변 중단하고 말하기'}))
    } else {
      receive()
    }
    await flushPromises()
    expect(onInterrupt).toHaveBeenCalledOnce()
    expect(startSpeechTurn).toHaveBeenCalledTimes(2)
    expect(screen.getByRole('button', {name: '연속 대화 종료'}).title).toContain('듣는 중')
    answer.resolve()
    await flushPromises()
    expect(vi.mocked(startSpeechTurn).mock.calls[1][0].aborted).toBe(false)
    fireEvent.click(screen.getByRole('button', {name: '연속 대화 종료'}))
    second.resolve(new Float32Array())
    await flushPromises()
  },
)

it.each([{ctrlKey: true}, {metaKey: true}])(
  'should submit current speech once with the shortcut and retain continuous mode (%j)',
  async (modifier) => {
    const audio = Promise.withResolvers<Float32Array>()
    const next = Promise.withResolvers<Float32Array>()
    const stop = vi.fn(() => audio.resolve(new Float32Array([0.1])))
    vi.mocked(startSpeechTurn)
      .mockResolvedValueOnce({audio: audio.promise, stop})
      .mockResolvedValueOnce({audio: next.promise, stop: vi.fn()})
    const recognition = Promise.withResolvers<string>()
    vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
    vi.mocked(createDictationPreferences).mockReturnValue({
      close: vi.fn(),
      read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
      save: vi.fn(),
    })
    const [draft, edit] = createSignal('기존 입력')
    const [paused, setPaused] = createSignal(false)
    const answer = Promise.withResolvers<void>()
    const onSend = vi.fn(() => {
      expect(draft()).toBe('기존 입력 방금 말한 내용')
      setPaused(true)
      return answer.promise
    })
    render(() => (
      <SSpeechComposer
        continuous
        value={draft()}
        onEdit={edit}
        onSend={onSend}
        voiceBusy={paused()}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '연속 대화 시작'}))
    await flushPromises()
    const input = screen.getByRole('textbox')
    expect(input).toHaveFocus()
    fireEvent.keyDown(input, {...modifier, key: 'Enter'})
    fireEvent.keyDown(input, {...modifier, key: 'Enter'})
    await flushPromises()
    expect(stop).toHaveBeenCalledOnce()
    expect(onSend).not.toHaveBeenCalled()
    recognition.resolve('방금 말한 내용')
    await flushPromises()
    expect(onSend).toHaveBeenCalledOnce()
    expect(screen.getByRole('button', {name: '답변 중단하고 말하기'})).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    answer.resolve()
    await flushPromises()
    expect(startSpeechTurn).toHaveBeenCalledOnce()
    edit('')
    setPaused(false)
    await flushPromises()
    expect(startSpeechTurn).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getByRole('button', {name: '연속 대화 종료'}))
    next.resolve(new Float32Array())
    await flushPromises()
  },
)

it('should cancel shortcut recognition without submitting after Escape', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  vi.mocked(startSpeechTurn).mockResolvedValueOnce({
    audio: audio.promise,
    stop: () => audio.resolve(new Float32Array([0.1])),
  })
  const recognition = Promise.withResolvers<string>()
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
    save: vi.fn(),
  })
  const onSend = vi.fn()
  render(() => <SSpeechComposer continuous onSend={onSend} />)
  fireEvent.click(screen.getByRole('button', {name: '연속 대화 시작'}))
  await flushPromises()
  fireEvent.keyDown(screen.getByRole('textbox'), {ctrlKey: true, key: 'Enter'})
  await flushPromises()
  fireEvent.keyDown(screen.getByRole('textbox'), {key: 'Escape'})
  recognition.resolve('취소 후 도착한 말')
  await flushPromises()
  expect(onSend).not.toHaveBeenCalled()
  expect(screen.getByRole('button', {name: '연속 대화 시작'})).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

it('should keep settings outside the composer and use saved preferences for voice input', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  const recognition = Promise.withResolvers<string>()
  const next = Promise.withResolvers<Float32Array>()
  vi.mocked(startSpeechTurn)
    .mockResolvedValueOnce({audio: audio.promise, stop: vi.fn()})
    .mockResolvedValueOnce({audio: next.promise, stop: vi.fn()})
  vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: false}),
    save: vi.fn(),
  })
  const onEdit = vi.fn()
  render(() => <SSpeechComposer onEdit={onEdit} />)
  expect(screen.queryByText('음성 입력 설정')).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '음성 입력'}))
  expect(screen.getByRole('textbox')).toHaveFocus()
  await flushPromises()
  const microphone = screen.getByRole('button', {name: '녹음 끝내기'})
  expect(screen.queryByText('녹음 끝내기')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '취소'})).not.toBeInTheDocument()
  expect(screen.getByRole('textbox')).toBeEnabled()
  audio.resolve(new Float32Array([0.1]))
  await audio.promise
  await flushPromises()
  expect(transcribeAudio).toHaveBeenCalledWith(
    expect.objectContaining({
      model: 'buzzasr-korean-q8',
      vad: false,
    }),
  )
  recognition.resolve('비교할 음성')
  await recognition.promise
  await flushPromises()
  expect(onEdit).toHaveBeenCalledExactlyOnceWith('비교할 음성')
  expect(screen.getByRole('textbox')).toBeEnabled()
  fireEvent.click(microphone)
  next.resolve(new Float32Array())
  await flushPromises()
})

it('should not display feedback or change the draft when speech is not recognized', async () => {
  const audio = Promise.withResolvers<Float32Array>()
  const next = Promise.withResolvers<Float32Array>()
  vi.mocked(startSpeechTurn)
    .mockResolvedValueOnce({audio: audio.promise, stop: vi.fn()})
    .mockResolvedValueOnce({audio: next.promise, stop: vi.fn()})
  vi.mocked(transcribeAudio).mockResolvedValue('')
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
    save: vi.fn(),
  })
  const onEdit = vi.fn()
  render(() => <SSpeechComposer value="기존 초안" onEdit={onEdit} />)
  fireEvent.click(screen.getByRole('button', {name: '음성 입력'}))
  await flushPromises()
  audio.resolve(new Float32Array([0]))
  await flushPromises()
  expect(screen.getByRole('button', {name: '녹음 끝내기'})).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(onEdit).not.toHaveBeenCalled()
  expect(screen.getByRole('textbox')).toHaveValue('기존 초안')
  fireEvent.click(screen.getByRole('button', {name: '녹음 끝내기'}))
  next.resolve(new Float32Array())
  await flushPromises()
})
