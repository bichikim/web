/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {
  type SupertonicVoiceLabController,
  type SupertonicVoiceLabRuntime,
  useSupertonicVoiceLab as useActualSupertonicVoiceLab,
} from '../../../features/supertonic/use-supertonic-voice-lab'
import type {SupertonicVoiceSource} from '../../../features/supertonic/messages'
import {useSupertonicVoiceLab} from '../../../features/supertonic'
import {VoiceGenerator} from '../VoiceGenerator'

const harness = vi.hoisted(() => ({
  controller: null as SupertonicVoiceLabController | null,
  runtime: null as SupertonicVoiceLabRuntime | null,
}))

vi.mock('../../../features/supertonic', async () => {
  const model = await vi.importActual('@winter-love/supertonic/model')
  const style = await vi.importActual('@winter-love/supertonic/voice-style')
  return {
    ...model,
    ...style,
    useSupertonicVoiceLab: vi.fn(),
  }
})

const VOICE_JSON = JSON.stringify({
  style_dp: {data: [0.2], dims: [1]},
  style_ttl: {data: [0.4], dims: [1]},
})

const createHarness = () => {
  const generation = Promise.withResolvers<void>()
  const voices: Array<SupertonicVoiceSource> = []
  const audio = {generationTime: 10, sampleRate: 16000, samples: new Float32Array([0.1, -0.1])}
  const runtime: SupertonicVoiceLabRuntime = {
    createAudioPlayer: () => ({dispose: vi.fn(), enqueue: vi.fn(), finish: vi.fn()}),
    createAudioUrl: vi.fn(() => 'blob:voice-result'),
    createClient: () => ({
      dispose: vi.fn(),
      generateStream: async function* (options) {
        voices.push(options.voice)
        await generation.promise
        yield {ok: true, value: {audio: {...audio, index: 0, total: 1}, type: 'chunk'}}
        yield {ok: true, value: {audio, type: 'complete'}}
      },
      initialize: async () => ({ok: true, value: undefined}),
    }),
    revokeAudioUrl: vi.fn(),
  }
  harness.runtime = runtime
  return {generation, voices}
}

const selectFile = (text: Promise<string>, name = 'B.json') => {
  const file = new File(['voice'], name, {type: 'application/json'})
  Object.defineProperty(file, 'text', {value: () => text})
  fireEvent.change(screen.getByLabelText(/JSON 파일을 놓거나 클릭해 선택/u), {
    target: {files: [file]},
  })
}

const prepareModel = async () => {
  render(() => <VoiceGenerator />)
  fireEvent.click(screen.getByRole('button', {name: 'Supertonic 준비하기'}))
  await screen.findByRole('button', {name: '음성 만들기'})
}

const generate = () => fireEvent.click(screen.getByRole('button', {name: '음성 만들기'}))
const selectedVoice = () =>
  screen.getByRole<HTMLSelectElement>('combobox', {name: /^목소리/u}).value
const finish = async (generation: ReturnType<typeof Promise.withResolvers<void>>) => {
  generation.resolve()
  await waitFor(() => expect(harness.controller?.state().status).toBe('complete'))
}

beforeEach(() => {
  harness.controller = null
  vi.mocked(useSupertonicVoiceLab).mockImplementation((props) => {
    if (harness.runtime === null) {
      throw new Error('음성 런타임 fixture가 준비되지 않았습니다.')
    }
    harness.controller = useActualSupertonicVoiceLab({...props, runtime: harness.runtime})
    return harness.controller
  })
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  harness.runtime = null
})

it('should keep the generating preset and its result when an older JSON read completes', async () => {
  const {generation, voices} = createHarness()
  const fileRead = Promise.withResolvers<string>()
  await prepareModel()
  selectFile(fileRead.promise)
  generate()
  expect(harness.controller?.isBusy()).toBe(true)
  fileRead.resolve(VOICE_JSON)
  await fileRead.promise
  await finish(generation)

  expect(selectedVoice()).toBe('Yuna')
  expect(screen.queryByText('B.json')).not.toBeInTheDocument()
  expect(voices).toEqual([{id: 'Yuna', kind: 'preset'}])
  expect(screen.getByRole('link', {name: 'WAV 다운로드'})).toBeInTheDocument()
})

it('should ignore a superseded file read error after generation starts', async () => {
  const {generation} = createHarness()
  const fileRead = Promise.withResolvers<string>()
  await prepareModel()
  selectFile(fileRead.promise)
  generate()
  fileRead.reject(new Error('파일 읽기 실패'))
  await finish(generation)

  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  expect(selectedVoice()).toBe('Yuna')
  expect(screen.getByRole('link', {name: 'WAV 다운로드'})).toBeInTheDocument()
})

it('should generate with a custom voice that finished importing before the request', async () => {
  const {generation, voices} = createHarness()
  await prepareModel()
  selectFile(Promise.resolve(VOICE_JSON))
  await screen.findByText('B.json')
  generate()
  await finish(generation)

  expect(selectedVoice()).toBe('custom')
  expect(voices).toEqual([
    {
      kind: 'custom',
      value: {
        duration: {data: [0.2], dimensions: [1]},
        speech: {data: [0.4], dimensions: [1]},
      },
    },
  ])
  expect(screen.getByRole('link', {name: 'WAV 다운로드'})).toBeInTheDocument()
})

it('should retain an imported voice when another pending import completes during generation', async () => {
  const {generation, voices} = createHarness()
  const fileRead = Promise.withResolvers<string>()
  await prepareModel()
  selectFile(Promise.resolve(VOICE_JSON), 'A.json')
  await screen.findByText('A.json')
  selectFile(fileRead.promise)
  generate()
  fileRead.resolve(
    JSON.stringify({style_dp: {data: [0.8], dims: [1]}, style_ttl: {data: [0.9], dims: [1]}}),
  )
  await fileRead.promise
  await finish(generation)

  expect(screen.getByText('A.json')).toBeInTheDocument()
  expect(screen.queryByText('B.json')).not.toBeInTheDocument()
  expect(voices).toEqual([
    {
      kind: 'custom',
      value: {
        duration: {data: [0.2], dimensions: [1]},
        speech: {data: [0.4], dimensions: [1]},
      },
    },
  ])
  expect(screen.getByRole('link', {name: 'WAV 다운로드'})).toBeInTheDocument()
})

it('should accept the pending import when the empty text prevents generation', async () => {
  const {voices} = createHarness()
  const fileRead = Promise.withResolvers<string>()
  await prepareModel()
  fireEvent.input(screen.getByRole('textbox'), {target: {value: ''}})
  selectFile(fileRead.promise)
  const button = screen.getByRole('button', {name: '음성 만들기'})
  expect(button).toBeDisabled()
  button.click()
  fileRead.resolve(VOICE_JSON)

  expect(await screen.findByText('B.json')).toBeInTheDocument()
  expect(selectedVoice()).toBe('custom')
  expect(voices).toEqual([])
  expect(screen.queryByRole('link', {name: 'WAV 다운로드'})).not.toBeInTheDocument()
})
