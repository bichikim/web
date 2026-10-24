/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'
import {HwpDocumentPanel} from '../Panel'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should show the iframe page count and follow page count changes', () => {
  const [pageCount, setPageCount] = createSignal<number | null>(3)
  render(() => (
    <HwpDocumentPanel
      directPageCount={() => null}
      directPageIndex={() => 0}
      errorMessage={() => null}
      isBusy={() => false}
      isReady={() => true}
      onExampleOpen={vi.fn()}
      onFileChange={vi.fn()}
      onPageChange={vi.fn()}
      onViewerModeChange={vi.fn()}
      pageCount={pageCount}
      pageSvg={() => null}
      statusMessage={() => '준비됨'}
      viewerMode={() => 'iframe'}
      viewerHost={vi.fn()}
    />
  ))
  expect(screen.getByText('3페이지 · iframe 안에서 페이지를 이동할 수 있어요')).toBeVisible()
  setPageCount(5)
  expect(screen.getByText('5페이지 · iframe 안에서 페이지를 이동할 수 있어요')).toBeVisible()
  setPageCount(null)
  expect(screen.queryByText(/페이지 · iframe/)).not.toBeInTheDocument()
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
