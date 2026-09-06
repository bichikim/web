/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {HwpDocumentPanel} from '../Panel'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should render parsed SVG pages and forward page navigation', () => {
  const onPageChange = vi.fn()
  const view = render(() => (
    <HwpDocumentPanel
      directPageCount={() => 2}
      directPageIndex={() => 0}
      errorMessage={() => null}
      isBusy={() => false}
      isReady={() => true}
      onExampleOpen={vi.fn()}
      onFileChange={vi.fn()}
      onPageChange={onPageChange}
      onViewerModeChange={vi.fn()}
      pageCount={() => null}
      pageSvg={() => '<svg xmlns="http://www.w3.org/2000/svg"><text>문서 내용</text></svg>'}
      statusMessage={() => '준비됨'}
      viewerMode={() => 'direct'}
      viewerHost={vi.fn()}
    />
  ))
  expect(view.container.querySelector('svg')).toHaveTextContent('문서 내용')
  expect(screen.getByRole('button', {name: '이전'})).toBeDisabled()
  fireEvent.click(screen.getByRole('button', {name: '다음'}))
  expect(onPageChange).toHaveBeenCalledWith(1)
})
