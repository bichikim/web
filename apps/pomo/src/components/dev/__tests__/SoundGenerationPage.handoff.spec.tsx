/** @vitest-environment jsdom */
import {loopPlayback, TestWorker} from './sound-generation'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {SoundGenerationPage} from '../SoundGenerationPage'

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

it.each([
  {
    initialPaused: false,
    nextPaused: true,
    nextPosition: 13,
    transition: 'playing to paused',
  },
  {
    initialPaused: true,
    nextPaused: false,
    nextPosition: 11,
    transition: 'paused to playing',
  },
])(
  'should use native playback state changed while repeat is enabled with a blank duration ($transition)',
  ({initialPaused, nextPaused, nextPosition}) => {
    render(() => <SoundGenerationPage />)
    fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
    TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
    const audio = screen.getByLabelText('생성한 환경음 재생')
    Object.defineProperty(audio, 'currentTime', {configurable: true, value: 7, writable: true})
    Object.defineProperty(audio, 'duration', {configurable: true, value: 20})
    Object.defineProperty(audio, 'paused', {configurable: true, value: initialPaused})
    Object.defineProperty(audio, 'readyState', {configurable: true, value: 1})

    fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
      target: {value: ''},
    })
    fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))

    expect(screen.queryByRole('slider', {name: '크로스페이드 오디오 위치'})).not.toBeInTheDocument()
    Object.defineProperty(audio, 'currentTime', {
      configurable: true,
      value: nextPosition,
      writable: true,
    })
    Object.defineProperty(audio, 'paused', {configurable: true, value: nextPaused})
    fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
      target: {value: '6'},
    })

    expect(screen.getByText(new RegExp(`${nextPosition}\\.0 / 20\\.0초`, 'u'))).toBeInTheDocument()
    if (nextPaused) {
      expect(loopPlayback.play).not.toHaveBeenCalled()
      expect(screen.getByRole('button', {name: '재생'})).toBeInTheDocument()
    } else {
      expect(loopPlayback.play).toHaveBeenCalledWith(6, false, nextPosition)
      loopPlayback.onStatus?.('루프 재생 중', true)
      expect(screen.getByRole('button', {name: '일시정지'})).toBeInTheDocument()
    }
  },
)

it('should refresh native playback after connection is toggled while repeat has a blank duration', () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  const initialAudio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(initialAudio, 'currentTime', {configurable: true, value: 7, writable: true})
  Object.defineProperty(initialAudio, 'duration', {configurable: true, value: 20})
  Object.defineProperty(initialAudio, 'paused', {configurable: true, value: true})
  Object.defineProperty(initialAudio, 'readyState', {configurable: true, value: 1})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: ''},
  })

  const audio = screen.getByLabelText('생성한 환경음 재생')
  Object.defineProperty(audio, 'duration', {configurable: true, value: 20})
  Object.defineProperty(audio, 'readyState', {configurable: true, value: 1})
  fireEvent.click(screen.getByRole('checkbox', {name: '연결 구간 사용'}))
  fireEvent.click(screen.getByRole('checkbox', {name: '연결 구간 사용'}))

  Object.defineProperty(audio, 'currentTime', {configurable: true, value: 13, writable: true})
  Object.defineProperty(audio, 'paused', {configurable: true, value: false})
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '6'},
  })

  expect(loopPlayback.play).toHaveBeenCalledWith(6, false, 13)
  expect(screen.getByText(/13\.0 \/ 20\.0초/u)).toBeInTheDocument()
  loopPlayback.onStatus?.('루프 재생 중', true)
  expect(screen.getByRole('button', {name: '일시정지'})).toBeInTheDocument()
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
