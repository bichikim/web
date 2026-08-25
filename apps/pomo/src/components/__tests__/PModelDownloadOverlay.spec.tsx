/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {beforeEach, expect, it, vi} from 'vitest'

import {
  type ModelDownloadController,
  type ModelDownloadRuntime,
  PModelDownloadProvider,
  useModelDownload,
} from '../../features/model-download'
import type {TextModelDownloadResponse} from '../../features/model-download/text-client'
import {PModelDownloadOverlay} from '../PModelDownloadOverlay'

const routerMocks = vi.hoisted(() => ({pathname: '/account'}))

vi.mock('@solidjs/router', () => ({
  useLocation: () => ({
    get pathname() {
      return routerMocks.pathname
    },
  }),
}))

beforeEach(() => {
  routerMocks.pathname = '/account'
})

it('should show global progress and cancel the active Worker', async () => {
  const captured: {
    download?: ModelDownloadController
    onResponse?: (response: TextModelDownloadResponse) => void
  } = {}
  const client = {dispose: vi.fn(), prepare: vi.fn()}
  const runtime: ModelDownloadRuntime = {
    createTextClient: (options) => {
      captured.onResponse = options.onResponse
      return client
    },
    createVoiceClient: () => {
      throw new Error('음성 client를 만들면 안 됩니다.')
    },
  }
  const CaptureDownload = () => {
    captured.download = useModelDownload()
    return <PModelDownloadOverlay />
  }

  render(() => (
    <PModelDownloadProvider runtime={runtime}>
      <CaptureDownload />
    </PModelDownloadProvider>
  ))

  const activeDownload = captured.download

  if (activeDownload === undefined) {
    throw new Error('모델 다운로드 controller가 준비되지 않았습니다.')
  }

  const result = activeDownload.startTextModel('gemma-4-e2b')

  const onResponse = captured.onResponse

  if (onResponse === undefined) {
    throw new Error('모델 다운로드 client가 생성되지 않았습니다.')
  }

  onResponse({files: [], loadedBytes: 42, percentage: 42, totalBytes: 100, type: 'loading'})

  const status = screen.getByRole('status')
  expect(status.textContent).toContain('Gemma 4 E2B 모델 받는 중 · 42%')
  expect(status.parentElement?.classList.contains('right-4')).toBe(true)
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('42')
  fireEvent.click(screen.getByRole('button', {name: '취소'}))

  await expect(result).resolves.toEqual({status: 'cancelled'})
  expect(client.dispose).toHaveBeenCalledTimes(1)
  expect(screen.queryByRole('status')).toBeNull()
})

it('should leave the Pomo home status to the scene toolbar', () => {
  routerMocks.pathname = '/ko/'
  const runtime: ModelDownloadRuntime = {
    createTextClient: () => ({dispose: vi.fn(), prepare: vi.fn()}),
    createVoiceClient: () => {
      throw new Error('음성 client를 만들면 안 됩니다.')
    },
  }
  let download: ModelDownloadController | undefined
  const CaptureDownload = () => {
    download = useModelDownload()
    return <PModelDownloadOverlay />
  }

  render(() => (
    <PModelDownloadProvider runtime={runtime}>
      <CaptureDownload />
    </PModelDownloadProvider>
  ))
  download?.startTextModel('gemma-4-e2b')

  expect(download?.state().status).toBe('loading')
  expect(screen.queryByRole('status')).toBeNull()
})

it('should keep the global download UI hidden on the dialogue page', () => {
  routerMocks.pathname = '/dialogue'
  const runtime: ModelDownloadRuntime = {
    createTextClient: () => ({dispose: vi.fn(), prepare: vi.fn()}),
    createVoiceClient: () => {
      throw new Error('음성 client를 만들면 안 됩니다.')
    },
  }
  let download: ModelDownloadController | undefined
  const CaptureDownload = () => {
    download = useModelDownload()
    return <PModelDownloadOverlay />
  }

  render(() => (
    <PModelDownloadProvider runtime={runtime}>
      <CaptureDownload />
    </PModelDownloadProvider>
  ))
  download?.startTextModel('gemma-4-e2b')

  expect(download?.state().status).toBe('loading')
  expect(screen.queryByRole('status')).toBeNull()
  expect(screen.queryByRole('progressbar')).toBeNull()
})
