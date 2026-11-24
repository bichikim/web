import {cleanup, render, screen} from '@solidjs/testing-library'
import Dexie from 'dexie'
import {afterEach, expect, test, vi} from 'vitest'
import {page} from 'vitest/browser'
import {SSpeechComposer} from '../../src/components/SSpeechComposer'
import {startSpeechTurn} from '../../src/features/dictation/start-speech-turn'
import {transcribeAudio} from '../../src/features/dictation/transcribe-audio'
import {createDictationPreferences} from '../../src/features/dictation/preferences'
import 'virtual:uno.css'

vi.mock('../../src/features/dictation/transcribe-audio', () => ({transcribeAudio: vi.fn()}))
vi.mock('../../src/features/dictation/start-speech-turn', () => ({startSpeechTurn: vi.fn()}))
vi.mock('../../src/features/dictation/preferences', async () => {
  const actual = await vi.importActual<typeof import('../../src/features/dictation/preferences')>(
    '../../src/features/dictation/preferences',
  )
  return {...actual, createDictationPreferences: vi.fn()}
})
const databases: string[] = []
const connections: (() => void)[] = []
afterEach(async () => {
  cleanup()
  vi.resetAllMocks()
  connections.splice(0).forEach((close) => close())
  await Promise.all(databases.splice(0).map((name) => Dexie.delete(name)))
})

test.each(['w-65', 'w-90'])(
  'should group input actions without settings at %s and use saved preferences',
  async (width) => {
    const actual = await vi.importActual<typeof import('../../src/features/dictation/preferences')>(
      '../../src/features/dictation/preferences',
    )
    const name = `composer-browser-${crypto.randomUUID()}`
    databases.push(name)
    vi.mocked(createDictationPreferences).mockImplementation(() =>
      actual.createDictationPreferences(name),
    )
    const preferences = actual.createDictationPreferences(name)
    connections.push(preferences.close)
    await preferences.save({model: 'buzzasr-korean-q8', vad: false})
    preferences.close()
    const audio = Promise.withResolvers<Float32Array>()
    const recognition = Promise.withResolvers<string>()
    const next = Promise.withResolvers<Float32Array>()
    let receiveLevel: ((level: number) => void) | undefined
    vi.mocked(transcribeAudio).mockReturnValue(recognition.promise)
    const stop = vi.fn()
    vi.mocked(startSpeechTurn)
      .mockImplementationOnce(async (_signal, onLevel) => {
        receiveLevel = onLevel
        return {audio: audio.promise, stop}
      })
      .mockImplementationOnce(async (signal, onLevel) => {
        receiveLevel = onLevel
        signal.addEventListener('abort', () => next.reject(signal.reason), {once: true})
        return {
          audio: next.promise,
          stop: () => {
            stop()
            next.resolve(new Float32Array())
          },
        }
      })
    render(() => (
      <div class={`box-border bg-teal-50 p-3 font-sans ${width}`}>
        <SSpeechComposer />
      </div>
    ))
    const frame = screen.getByRole('group', {name: '메시지 입력'})
    const input = screen.getByRole('textbox')
    const microphone = screen.getByRole('button', {name: '음성 입력'})
    const send = screen.getByRole('button', {name: '보내기'})
    expect(screen.queryByText('음성 입력 설정')).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
    const bounds = frame.getBoundingClientRect()
    const microphoneBounds = microphone.getBoundingClientRect()
    const sendBounds = send.getBoundingClientRect()
    expect(Math.abs(microphoneBounds.top - sendBounds.top)).toBeLessThan(1)
    expect(sendBounds.width).toBe(microphoneBounds.width)
    expect(sendBounds.right).toBeLessThanOrEqual(bounds.right)
    expect(sendBounds.bottom).toBeLessThanOrEqual(bounds.bottom)
    expect(bounds.height).toBeLessThanOrEqual(48)
    expect(input.getBoundingClientRect().right).toBeLessThanOrEqual(microphoneBounds.left)
    expect(input.getBoundingClientRect().bottom).toBeCloseTo(microphoneBounds.bottom, 0)
    expect(frame.scrollWidth).toBeLessThanOrEqual(frame.clientWidth)
    await page.getByRole('textbox').fill('긴 요청을 여러 줄로 입력합니다.\n'.repeat(20))
    const expanded = frame.getBoundingClientRect()
    expect(expanded.height).toBeGreaterThan(bounds.height)
    expect(expanded.height).toBeLessThanOrEqual(82)
    expect(input.scrollHeight).toBeGreaterThan(input.clientHeight)
    input.scrollTop = input.scrollHeight
    expect(input.scrollTop).toBeGreaterThan(0)
    expect(send.getBoundingClientRect().bottom).toBeLessThanOrEqual(expanded.bottom)
    expect(microphone.getBoundingClientRect().right).toBeLessThanOrEqual(
      send.getBoundingClientRect().left,
    )
    await page.getByRole('textbox').fill('다음 요청을 입력합니다.')
    await page
      .getByRole('group', {name: '메시지 입력'})
      .screenshot({path: `__screenshots__/composer-${width}.png`})
    await page.getByRole('button', {name: '음성 입력'}).click()
    await expect.poll(() => microphone.getAttribute('aria-label')).toBe('녹음 끝내기')
    expect(screen.queryByText('녹음 끝내기')).toBeNull()
    expect(screen.queryByRole('button', {name: '취소'})).toBeNull()
    expect(screen.getByRole('form').getBoundingClientRect().height).toBe(bounds.height + 4)
    const level = microphone.querySelector('rect')!
    const quiet = getComputedStyle(level).clipPath
    receiveLevel?.(0.8)
    await expect.poll(() => getComputedStyle(level).clipPath).not.toBe(quiet)
    await page
      .getByRole('group', {name: '메시지 입력'})
      .screenshot({path: `__screenshots__/composer-recording-${width}.png`})
    await expect.element(input).toBeEnabled()
    expect(screen.queryByRole('status')).toBeNull()
    audio.resolve(new Float32Array([0.1, -0.1]))
    await expect.poll(() => vi.mocked(transcribeAudio).mock.calls.length).toBe(1)
    expect(transcribeAudio).toHaveBeenCalledWith({
      audio: new Float32Array([0.1, -0.1]),
      model: 'buzzasr-korean-q8',
      signal: expect.any(AbortSignal),
      vad: false,
    })
    recognition.resolve('인식한 대화')
    await expect.element(input).toHaveValue('다음 요청을 입력합니다. 인식한 대화')
    await expect.element(input).toBeEnabled()
    expect(microphone).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', {name: '보내기'})).toBeEnabled()
    await page.getByRole('button', {name: '녹음 끝내기'}).click()
    expect(stop).toHaveBeenCalledOnce()
    await expect.poll(() => microphone.getAttribute('aria-label')).toBe('음성 입력')
  },
)
