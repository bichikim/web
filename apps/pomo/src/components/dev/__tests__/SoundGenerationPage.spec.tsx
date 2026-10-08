/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createLoopPlayer} from 'src/features/loop-player/player'
import {SoundGenerationPage} from '../SoundGenerationPage'

const loopPlayback = vi.hoisted(() => ({
  close: vi.fn(async () => {}),
  duration: 20,
  onPosition: undefined as ((seconds: number) => void) | undefined,
  onStatus: undefined as ((message: string, playing: boolean) => void) | undefined,
  play: vi.fn(async () => {}),
  seek: vi.fn(async () => {}),
  setVolume: vi.fn(),
  stop: vi.fn(),
}))

vi.mock('@solidjs/meta', () => ({Title: () => null}))
vi.mock('@solidjs/router', () => ({
  A: (props: {href: string; children?: JSX.Element}) => <a href={props.href}>{props.children}</a>,
}))
vi.mock('src/features/loop-player/player', () => ({createLoopPlayer: vi.fn()}))

class TestWorker {
  static current: TestWorker
  onmessage: ((event: {data: unknown}) => void) | null = null
  onerror: ((event: {message: string}) => void) | null = null
  postMessage = vi.fn()
  terminate = vi.fn()
  constructor() {
    TestWorker.current = this
  }
}

beforeEach(() => {
  vi.mocked(createLoopPlayer).mockImplementation((_url, onStatus, onReady, onPosition) => {
    loopPlayback.onPosition = onPosition
    loopPlayback.onStatus = onStatus
    onReady?.(loopPlayback.duration)
    return loopPlayback
  })
  vi.stubGlobal('Worker', TestWorker)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:sound-result')
      static revokeObjectURL = vi.fn()
    },
  )
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  loopPlayback.duration = 20
  loopPlayback.onPosition = undefined
  loopPlayback.onStatus = undefined
  vi.unstubAllGlobals()
})

it.each([1, 5, 10, 30, 60, 120])(
  'should generate the selected prompt for %s seconds, then expose playback and download',
  (seconds) => {
    render(() => <SoundGenerationPage />)
    fireEvent.click(screen.getByRole('button', {name: '파도'}))
    fireEvent.input(screen.getByRole('spinbutton', {name: /^길이/u}), {
      target: {value: String(seconds)},
    })
    fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
    const worker = TestWorker.current
    expect(worker.postMessage).toHaveBeenCalledWith({
      chunkNoiseMode: 'continuous',
      connectionSeconds: 4,
      negativePrompt: '',
      prompt: expect.stringContaining('ocean waves'),
      seconds,
    })
    expect(screen.getByRole('button', {name: '생성 중…'})).toBeDisabled()
    worker.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
    expect(screen.getByLabelText('생성한 환경음 재생')).toHaveAttribute('src', 'blob:sound-result')
    expect(screen.getByRole('link', {name: 'WAV 다운로드'})).toHaveAttribute(
      'download',
      'environment.wav',
    )
    expect(worker.terminate).toHaveBeenCalledOnce()
  },
)

it('should send the selected connection duration for extended generation', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '8'},
  })
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))

  expect(TestWorker.current.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({chunkNoiseMode: 'continuous', connectionSeconds: 8}),
  )
})

it('should send zero connection duration when connection is disabled', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('checkbox', {name: '연결 구간 사용'}))

  expect(screen.queryByRole('spinbutton', {name: /^연결 구간 \(초\)/u})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))

  expect(TestWorker.current.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({chunkNoiseMode: 'continuous', connectionSeconds: 0}),
  )
})

it('should send the selected chunk noise mode', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('radio', {name: '청크마다 같은 패턴 반복'}))
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))

  expect(TestWorker.current.postMessage).toHaveBeenCalledWith(
    expect.objectContaining({chunkNoiseMode: 'repeat'}),
  )
})

it('should use the selected connection for repeated playback', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '10'},
  })
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))

  expect(screen.getByRole('slider', {name: '크로스페이드 오디오 위치'})).toBeInTheDocument()
  expect(screen.getByText(/10초 연결/u)).toBeInTheDocument()
})

it.each([
  {paused: false, playbackState: 'playing'},
  {paused: true, playbackState: 'paused'},
])(
  'should preserve native position and $playbackState state when enabling repeat after metadata loads',
  ({paused}) => {
    render(() => <SoundGenerationPage />)
    fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
    TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
    const audio = screen.getByLabelText('생성한 환경음 재생')
    Object.defineProperty(audio, 'currentTime', {configurable: true, value: 7, writable: true})
    Object.defineProperty(audio, 'duration', {configurable: true, value: 20})
    Object.defineProperty(audio, 'paused', {configurable: true, value: paused})
    Object.defineProperty(audio, 'readyState', {configurable: true, value: 1})

    fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))

    expect(screen.getByText(/7\.0 \/ 20\.0초/u)).toBeInTheDocument()
    if (paused) {
      expect(loopPlayback.play).not.toHaveBeenCalled()
      expect(screen.getByRole('button', {name: '재생'})).toBeInTheDocument()
    } else {
      expect(loopPlayback.play).toHaveBeenCalledWith(4, false, 7)
      loopPlayback.onStatus?.('루프 재생 중', true)
      expect(screen.getByRole('button', {name: '일시정지'})).toBeInTheDocument()
    }
  },
)

it('should restore the confirmed repeat position when seeking fails', async () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(5)
  const position = screen.getByRole('slider', {name: '크로스페이드 오디오 위치'})
  fireEvent.input(position, {target: {value: '10'}})
  fireEvent.input(position, {target: {value: '15'}})
  loopPlayback.seek.mockRejectedValueOnce(new Error('seek failed'))

  fireEvent.change(position)

  await vi.waitFor(() => expect(loopPlayback.seek).toHaveBeenCalledWith(15))
  expect(position).toHaveValue('5')
  expect(screen.getByRole('button', {name: '재생'})).toBeInTheDocument()
  expect(screen.getByText('seek failed')).toBeInTheDocument()
})

it('should use a changed connection duration for a generated result', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '10'},
  })
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  fireEvent.click(screen.getByRole('button', {name: '재생'}))

  expect(loopPlayback.play).toHaveBeenCalledWith(10, false, 0)
})

it('should not carry a handoff from the previous result into a replacement result', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['first']), type: 'result'}})
  const audio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(audio, 'currentTime', {configurable: true, value: 7, writable: true})
  Object.defineProperty(audio, 'duration', {configurable: true, value: 20})
  Object.defineProperty(audio, 'paused', {configurable: true, value: false})
  Object.defineProperty(audio, 'readyState', {configurable: true, value: 1})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  expect(loopPlayback.play).toHaveBeenCalledWith(4, false, 7)
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(12)
  loopPlayback.play.mockClear()

  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['second']), type: 'result'}})

  expect(loopPlayback.play).not.toHaveBeenCalled()
  expect(screen.getByText(/0\.0 \/ 20\.0초/u)).toBeInTheDocument()
  expect(loopPlayback.close).toHaveBeenCalledOnce()
})

it('should preserve playback when connection mode changes during repeat playback', async () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  fireEvent.click(screen.getByRole('button', {name: '재생'}))
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(7)

  fireEvent.click(screen.getByRole('checkbox', {name: '연결 구간 사용'}))
  const audio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(audio, 'duration', {configurable: true, value: 20})
  Object.defineProperty(audio, 'readyState', {configurable: true, value: 1})
  fireEvent.loadedMetadata(audio)
  expect(audio).toHaveProperty('currentTime', 7)

  Object.defineProperty(audio, 'currentTime', {configurable: true, value: 9, writable: true})
  Object.defineProperty(audio, 'paused', {configurable: true, value: false})
  loopPlayback.play.mockClear()
  fireEvent.click(screen.getByRole('checkbox', {name: '연결 구간 사용'}))

  await vi.waitFor(() => expect(loopPlayback.play).toHaveBeenCalledWith(4, false, 9))
})

it('should preserve the paused native position when re-enabling connection mode', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  fireEvent.click(screen.getByRole('button', {name: '재생'}))
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(7)
  fireEvent.click(screen.getByRole('button', {name: '일시정지'}))
  fireEvent.click(screen.getByRole('checkbox', {name: '연결 구간 사용'}))

  const audio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(audio, 'currentTime', {configurable: true, value: 0, writable: true})
  Object.defineProperty(audio, 'duration', {configurable: true, value: 20})
  Object.defineProperty(audio, 'readyState', {configurable: true, value: 1})
  fireEvent.loadedMetadata(audio)
  Object.defineProperty(audio, 'currentTime', {configurable: true, value: 9, writable: true})
  Object.defineProperty(audio, 'paused', {configurable: true, value: true})
  loopPlayback.play.mockClear()

  fireEvent.click(screen.getByRole('checkbox', {name: '연결 구간 사용'}))

  expect(loopPlayback.play).not.toHaveBeenCalled()
  expect(screen.getByText(/9\.0 \/ 20\.0초/u)).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '재생'})).toBeInTheDocument()
})

it('should keep a pending handoff when re-enabling connection mode before native metadata loads', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  const initialAudio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(initialAudio, 'currentTime', {configurable: true, value: 7, writable: true})
  Object.defineProperty(initialAudio, 'duration', {configurable: true, value: 20})
  Object.defineProperty(initialAudio, 'paused', {configurable: true, value: false})
  Object.defineProperty(initialAudio, 'readyState', {configurable: true, value: 1})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  expect(loopPlayback.play).toHaveBeenCalledWith(4, false, 7)
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(12)

  fireEvent.click(screen.getByRole('checkbox', {name: '연결 구간 사용'}))

  const audio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(audio, 'currentTime', {configurable: true, value: 0, writable: true})
  Object.defineProperty(audio, 'duration', {configurable: true, value: Number.NaN})
  Object.defineProperty(audio, 'paused', {configurable: true, value: true})
  Object.defineProperty(audio, 'readyState', {configurable: true, value: 0})
  expect(loopPlayback.close).toHaveBeenCalledOnce()
  loopPlayback.play.mockClear()

  fireEvent.click(screen.getByRole('checkbox', {name: '연결 구간 사용'}))

  expect(loopPlayback.play).toHaveBeenCalledWith(4, false, 12)
  expect(screen.getByText(/12\.0 \/ 20\.0초/u)).toBeInTheDocument()
})

it('should keep a pending handoff when re-enabling repeat before native metadata loads', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  const initialAudio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(initialAudio, 'currentTime', {configurable: true, value: 7, writable: true})
  Object.defineProperty(initialAudio, 'duration', {configurable: true, value: 20})
  Object.defineProperty(initialAudio, 'paused', {configurable: true, value: false})
  Object.defineProperty(initialAudio, 'readyState', {configurable: true, value: 1})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  expect(loopPlayback.play).toHaveBeenCalledWith(4, false, 7)
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(12)

  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))

  const audio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(audio, 'currentTime', {configurable: true, value: 0, writable: true})
  Object.defineProperty(audio, 'duration', {configurable: true, value: Number.NaN})
  Object.defineProperty(audio, 'paused', {configurable: true, value: true})
  Object.defineProperty(audio, 'readyState', {configurable: true, value: 0})
  expect(loopPlayback.close).toHaveBeenCalledOnce()
  loopPlayback.play.mockClear()

  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))

  expect(loopPlayback.play).toHaveBeenCalledWith(4, false, 12)
  expect(screen.getByText(/12\.0 \/ 20\.0초/u)).toBeInTheDocument()
})

it('should keep a pending crossfade handoff when re-entering duration before native metadata loads', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  const initialAudio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(initialAudio, 'currentTime', {configurable: true, value: 7, writable: true})
  Object.defineProperty(initialAudio, 'duration', {configurable: true, value: 20})
  Object.defineProperty(initialAudio, 'paused', {configurable: true, value: false})
  Object.defineProperty(initialAudio, 'readyState', {configurable: true, value: 1})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  expect(loopPlayback.play).toHaveBeenCalledWith(4, false, 7)
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(12)

  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: ''},
  })

  const audio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(audio, 'currentTime', {configurable: true, value: 0, writable: true})
  Object.defineProperty(audio, 'duration', {configurable: true, value: Number.NaN})
  Object.defineProperty(audio, 'paused', {configurable: true, value: true})
  Object.defineProperty(audio, 'readyState', {configurable: true, value: 0})
  expect(loopPlayback.close).toHaveBeenCalledOnce()
  loopPlayback.play.mockClear()

  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '6'},
  })

  expect(loopPlayback.play).toHaveBeenCalledWith(6, false, 12)
  expect(screen.getByText(/12\.0 \/ 20\.0초/u)).toBeInTheDocument()
})

it('should resume at the native position when re-entering connection duration after clearing it', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  const initialAudio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(initialAudio, 'currentTime', {configurable: true, value: 7, writable: true})
  Object.defineProperty(initialAudio, 'paused', {configurable: true, value: false})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  expect(loopPlayback.play).toHaveBeenCalledWith(4, false, 7)
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(12)
  vi.spyOn(HTMLMediaElement.prototype, 'duration', 'get').mockReturnValue(20)
  vi.spyOn(HTMLMediaElement.prototype, 'readyState', 'get').mockReturnValue(1)

  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: ''},
  })

  const audio = screen.getByLabelText('생성한 환경음 재생')
  expect(screen.queryByRole('slider', {name: '크로스페이드 오디오 위치'})).not.toBeInTheDocument()
  expect(loopPlayback.close).toHaveBeenCalledOnce()
  expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
  Object.defineProperty(audio, 'currentTime', {configurable: true, value: 13})
  Object.defineProperty(audio, 'paused', {configurable: true, value: false})
  loopPlayback.play.mockClear()

  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '6'},
  })

  expect(loopPlayback.play).toHaveBeenCalledWith(6, false, 13)
  expect(screen.getByText(/13\.0 \/ 20\.0초/u)).toBeInTheDocument()
  loopPlayback.onStatus?.('루프 재생 중', true)
  expect(screen.getByRole('button', {name: '일시정지'})).toBeInTheDocument()
  expect(screen.getByText(/6초 연결/u)).toBeInTheDocument()
})

it('should apply a changed connection duration to active repeat playback', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  fireEvent.click(screen.getByRole('button', {name: '재생'}))
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.play.mockClear()
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '10'},
  })

  expect(loopPlayback.play).toHaveBeenCalledWith(10, false, 0)
})

it('should display and use the effective connection for a short result', () => {
  loopPlayback.duration = 5
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))

  expect(screen.getByText(/2.5초 연결/u)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', {name: '재생'}))

  expect(loopPlayback.play).toHaveBeenCalledWith(2.5, false, 0)
})

it('should disable generation for an invalid connection duration', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '60'},
  })

  expect(screen.getByRole('button', {name: '환경음 생성'})).toBeDisabled()
})

it.each([1, 3600])('should allow a request at the %s-second boundary', (seconds) => {
  render(() => <SoundGenerationPage />)
  fireEvent.input(screen.getByRole('spinbutton', {name: /^길이/u}), {
    target: {value: String(seconds)},
  })
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))

  expect(TestWorker.current.postMessage).toHaveBeenCalledWith(expect.objectContaining({seconds}))
})

it('should disable a duration and connection pair that exceeds the chunk limit', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.input(screen.getByRole('spinbutton', {name: /^길이/u}), {
    target: {value: '3600'},
  })
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '57'},
  })

  expect(screen.getByRole('button', {name: '환경음 생성'})).toBeDisabled()
})

it('should reject a fractional duration before starting a worker', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.input(screen.getByRole('spinbutton', {name: /^길이/u}), {target: {value: '1.5'}})
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))

  expect(screen.getByRole('alert')).toHaveTextContent('1–3,600초 사이의 정수')
})

it('should terminate actual work on stop and ignore a late completion', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  const worker = TestWorker.current
  fireEvent.click(screen.getByRole('button', {name: '중지'}))
  expect(worker.terminate).toHaveBeenCalledOnce()
  worker.onmessage?.({data: {blob: new Blob(['late']), type: 'result'}})
  expect(screen.queryByRole('link', {name: 'WAV 다운로드'})).toBeNull()
  expect(screen.getByRole('button', {name: '환경음 생성'})).toBeEnabled()
})

it('should show a model error and allow retry', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {message: '다운로드 실패', type: 'error'}})
  expect(screen.getByRole('alert')).toHaveTextContent('다운로드 실패')
  expect(screen.getByRole('button', {name: '환경음 생성'})).toBeEnabled()
})
