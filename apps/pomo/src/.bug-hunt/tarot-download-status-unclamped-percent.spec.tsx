/** @vitest-environment jsdom */
import {render, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import {DownloadStatus} from '../components/tarot/DownloadStatus'

it('should cap tarot model download progress at 100% in status text and progress controls', () => {
  render(() => <DownloadStatus kind="text" onCancel={vi.fn()} progress={133} />)

  expect(screen.getByRole('status')).toHaveTextContent('100%')
  expect(screen.getByRole('status')).not.toHaveTextContent('133%')
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
})
