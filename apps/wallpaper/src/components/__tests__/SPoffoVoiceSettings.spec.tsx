/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {DEFAULT_POFFO_VOICE, type PoffoVoice} from '@winter-love/wallpaper/settings/voice'
import {SPoffoVoiceSettings} from '../SPoffoVoiceSettings'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(cleanup)
it('should choose ChatGPT settings and preserve the previous local model, voice and speed', () => {
  const [value, setValue] = createSignal<PoffoVoice>({
    ...DEFAULT_POFFO_VOICE,
    model: 'full',
    speed: 1.4,
    voice: 'Hana',
  })
  render(() => <SPoffoVoiceSettings value={value()} onChange={setValue} />)
  expect(screen.getByRole('button', {name: '미리듣기'})).toBeEnabled()
  const provider = screen.getByRole('combobox', {name: '음성 서비스'})
  fireEvent.keyDown(provider, {key: 'End'})
  fireEvent.keyDown(provider, {key: 'Enter'})
  expect(value()).toMatchObject({model: 'full', provider: 'chatgpt', speed: 1.4, voice: 'Hana'})
  expect(provider).toHaveTextContent('ChatGPT 설정 음성')
  fireEvent.keyDown(provider, {key: 'Home'})
  fireEvent.keyDown(provider, {key: 'Enter'})
  expect(screen.getByRole('combobox', {name: '목소리'})).toHaveTextContent('Hana')
  expect(screen.getByRole('combobox', {name: '음성 모델'})).toHaveTextContent('Full')
})
it('should keep each widgets voice settings when enabling narration and changing volume', () => {
  const [value, setValue] = createSignal<PoffoVoice>({
    ...DEFAULT_POFFO_VOICE,
    speed: 1.4,
    voice: 'Hana',
  })
  const save = vi.fn((voice: PoffoVoice) => {
    setValue(voice)
  })
  render(() => <SPoffoVoiceSettings value={value()} onChange={save} />)
  fireEvent.click(screen.getByRole('switch', {name: '말풍선 읽어주기'}))
  expect(save).toHaveBeenLastCalledWith({
    ...DEFAULT_POFFO_VOICE,
    enabled: true,
    speed: 1.4,
    voice: 'Hana',
  })
  fireEvent.click(screen.getByRole('button', {name: '읽기 음량 늘리기'}))
  expect(save).toHaveBeenLastCalledWith({
    ...DEFAULT_POFFO_VOICE,
    enabled: true,
    speed: 1.4,
    voice: 'Hana',
    volume: 85,
  })
})

it('should expose only local and ChatGPT settings voices', () => {
  const [value, setValue] = createSignal<PoffoVoice>({...DEFAULT_POFFO_VOICE, voice: 'Hana'})
  const save = (voice: PoffoVoice) => {
    setValue(voice)
  }
  render(() => <SPoffoVoiceSettings value={value()} onChange={save} />)
  const provider = screen.getByRole('combobox', {name: '음성 서비스'})
  fireEvent.keyDown(provider, {key: 'End'})
  fireEvent.keyDown(provider, {key: 'Enter'})
  expect(value().provider).toBe('chatgpt')
  fireEvent.click(provider)
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
    '로컬 음성',
    'ChatGPT 설정 음성',
  ])
  fireEvent.keyDown(provider, {key: 'Escape'})
  expect(screen.queryByRole('combobox', {name: '음성 모델'})).not.toBeInTheDocument()
  expect(screen.queryByRole('combobox', {name: '목소리'})).not.toBeInTheDocument()
  expect(screen.queryByText(/OpenAI로 전송/)).not.toBeInTheDocument()
  fireEvent.keyDown(provider, {key: 'Home'})
  fireEvent.keyDown(provider, {key: 'Enter'})
  expect(value().provider).toBe('local')
  expect(screen.getByRole('combobox', {name: '목소리'})).toHaveTextContent('Hana')
})

it('should persist a per-widget CPU preference and hide the GPU control for ChatGPT speech', () => {
  const [value, setValue] = createSignal<PoffoVoice>({
    ...DEFAULT_POFFO_VOICE,
    model: 'full',
    voice: 'Hana',
  })
  render(() => <SPoffoVoiceSettings value={value()} onChange={setValue} />)
  const toggle = screen.getByRole('switch', {name: 'GPU 가속'})
  expect(toggle).toHaveAttribute('aria-checked', 'true')
  fireEvent.click(toggle)
  expect(value()).toMatchObject({gpu: false, model: 'full', provider: 'local', voice: 'Hana'})
  const provider = screen.getByRole('combobox', {name: '음성 서비스'})
  fireEvent.keyDown(provider, {key: 'End'})
  fireEvent.keyDown(provider, {key: 'Enter'})
  expect(screen.queryByRole('switch', {name: 'GPU 가속'})).not.toBeInTheDocument()
  fireEvent.keyDown(provider, {key: 'Home'})
  fireEvent.keyDown(provider, {key: 'Enter'})
  expect(screen.getByRole('switch', {name: 'GPU 가속'})).toHaveAttribute('aria-checked', 'false')
})
