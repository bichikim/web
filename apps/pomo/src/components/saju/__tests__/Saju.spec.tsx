/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {SajuReadingController, SajuReadingStatus} from 'src/features/saju/use-saju-reading'
import {Saju} from '../Saju'

afterEach(cleanup)

it('should show loading in the generation button without separate preparation messages', () => {
  const [status, setStatus] = createSignal<SajuReadingStatus>('idle')
  const cancel = vi.fn()
  const cancelDownload = vi.fn()
  const reading: SajuReadingController = {
    answer: () => '',
    cancel,
    cancelDownload,
    cancelDownloadConsent: vi.fn(),
    canRetry: () => false,
    downloadSize: () => '',
    error: () => null,
    progress: () => 42,
    retry: vi.fn(),
    startDownload: vi.fn(async () => {}),
    status,
    submit: vi.fn(),
  }
  render(() => <Saju reading={reading} />)

  expect(screen.getByRole('button', {name: '사주 풀이 생성'})).toBeEnabled()
  for (const busyStatus of ['checking', 'preparing', 'generating', 'downloading'] as const) {
    setStatus(busyStatus)
    const button = screen.getByRole('button', {name: '사주 풀이 중…'})
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('[aria-hidden="true"]')).toHaveClass('animate-spin')
  }
  expect(screen.queryByText('모델을 준비하고 있어요…')).not.toBeInTheDocument()
  expect(screen.queryByText('사주 풀이를 만들고 있어요…')).not.toBeInTheDocument()
  expect(screen.queryByText(/모델을 내려받는 중/u)).not.toBeInTheDocument()
  expect(screen.getByRole('progressbar', {name: '사주 풀이 모델 다운로드'})).toHaveValue(42)
  fireEvent.click(screen.getByRole('button', {name: '다운로드 취소'}))
  expect(cancelDownload).toHaveBeenCalledOnce()

  setStatus('generating')
  const cancelButton = screen.getByRole('button', {name: '취소'})
  expect(cancelButton.closest('form')).toBeInTheDocument()
  fireEvent.click(cancelButton)
  expect(cancel).toHaveBeenCalledOnce()
  setStatus('complete')
  expect(screen.getByRole('button', {name: '사주 풀이 생성'})).toBeEnabled()
})
