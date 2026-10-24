/** @vitest-environment jsdom */
import {loopPlayback, TestWorker} from './sound-generation'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {SoundGenerationPage} from '../SoundGenerationPage'

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

it('should stop showing playback when seeking cancels a pending connection restart', async () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  fireEvent.click(screen.getByRole('button', {name: '재생'}))
  await vi.waitFor(() => expect(loopPlayback.play).toHaveBeenCalledOnce())
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(7)

  const restart = Promise.withResolvers<boolean>()
  loopPlayback.play.mockReturnValueOnce(restart.promise)
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '10'},
  })
  await vi.waitFor(() => expect(loopPlayback.play).toHaveBeenCalledWith(10, false, 7))

  const position = screen.getByRole('slider', {name: '크로스페이드 오디오 위치'})
  fireEvent.input(position, {target: {value: '15'}})
  fireEvent.change(position)
  await vi.waitFor(() => expect(loopPlayback.seek).toHaveBeenCalledWith(15))
  restart.resolve(false)

  expect(await screen.findByRole('button', {name: '재생'})).toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '일시정지'})).not.toBeInTheDocument()
  expect(screen.getByText('재생 준비 완료')).toBeInTheDocument()
})

it('should preserve a media error reported while a connection restart is pending', async () => {
  render(() => <SoundGenerationPage />)
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))
  TestWorker.current.onmessage?.({data: {blob: new Blob(['wav']), type: 'result'}})
  fireEvent.click(screen.getByRole('checkbox', {name: '반복 재생'}))
  fireEvent.click(screen.getByRole('button', {name: '재생'}))
  await vi.waitFor(() => expect(loopPlayback.play).toHaveBeenCalledOnce())
  loopPlayback.onStatus?.('루프 재생 중', true)
  loopPlayback.onPosition?.(7)

  const restart = Promise.withResolvers<boolean>()
  loopPlayback.play.mockReturnValueOnce(restart.promise)
  fireEvent.input(screen.getByRole('spinbutton', {name: /^연결 구간 \(초\)/u}), {
    target: {value: '10'},
  })
  await vi.waitFor(() => expect(loopPlayback.play).toHaveBeenCalledWith(10, false, 7))

  const errorMessage = '이 오디오 파일을 재생할 수 없습니다.'
  loopPlayback.onStatus?.(errorMessage, false)
  expect(screen.getByText(errorMessage)).toBeInTheDocument()
  restart.resolve(false)
  await restart.promise

  expect(screen.getByText(errorMessage)).toBeInTheDocument()
  expect(screen.getByRole('button', {name: '재생'})).toBeInTheDocument()
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
