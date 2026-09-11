/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {SoundGenerationPage} from '../SoundGenerationPage'

vi.mock('@solidjs/meta', () => ({Title: () => null}))
vi.mock('@solidjs/router', () => ({
  A: (props: {href: string; children?: JSX.Element}) => <a href={props.href}>{props.children}</a>,
}))

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
  vi.stubGlobal('Worker', TestWorker)
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

it.each([1, 3600])('should allow a request at the %s-second boundary', (seconds) => {
  render(() => <SoundGenerationPage />)
  fireEvent.input(screen.getByRole('spinbutton', {name: /^길이/u}), {
    target: {value: String(seconds)},
  })
  fireEvent.click(screen.getByRole('button', {name: '환경음 생성'}))

  expect(TestWorker.current.postMessage).toHaveBeenCalledWith(expect.objectContaining({seconds}))
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
