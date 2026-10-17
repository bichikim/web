/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it, vi} from 'vitest'

import {DownloadStatus} from '../DownloadStatus'

it('should cap displayed progress as it updates and keep cancellation available', () => {
  const [progress, setProgress] = createSignal(42)
  const onCancel = vi.fn()
  render(() => <DownloadStatus kind="text" onCancel={onCancel} progress={progress()} />)

  const status = screen.getByRole('status')
  const progressBar = screen.getByRole('progressbar')
  const fill = status.querySelector('[style*="--download-progress"]')
  expect(status).toHaveTextContent('모델 다운로드 중 · 42%')
  expect(progressBar).toHaveAttribute('aria-valuenow', '42')
  expect(fill?.getAttribute('style')).toContain('42%')

  setProgress(133)
  expect(screen.getByRole('status')).toBe(status)
  expect(status).toHaveTextContent('모델 다운로드 중 · 100%')
  expect(status).not.toHaveTextContent('133%')
  expect(progressBar).toHaveAttribute('aria-valuenow', '100')
  expect(fill?.getAttribute('style')).toContain('100%')

  setProgress(-25)
  expect(status).toHaveTextContent('모델 다운로드 중 · 0%')
  expect(progressBar).toHaveAttribute('aria-valuenow', '0')
  expect(fill?.getAttribute('style')).toContain('0%')

  fireEvent.click(screen.getByRole('button', {name: '다운로드 취소'}))
  expect(onCancel).toHaveBeenCalledOnce()
})

it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
  'should show non-finite progress as indeterminate (%s)',
  (progress) => {
    render(() => <DownloadStatus kind="voice" onCancel={vi.fn()} progress={progress} />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('음성 모델 다운로드 중')
    expect(status).not.toHaveTextContent('%')
    const progressBar = screen.getByRole('progressbar')
    expect(progressBar).not.toHaveAttribute('aria-valuenow')
    expect(status.querySelector('[data-indeterminate]')).toBeInTheDocument()
  },
)
