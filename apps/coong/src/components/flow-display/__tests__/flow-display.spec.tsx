/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {SFlowDisplay} from '../SFlowDisplay'
import {useResizeObserver} from '../resize-observer'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('SFlowDisplay', () => {
  it('should duplicate overflowing text and derive animation duration', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 10,
      left: 0,
      right: 200,
      toJSON: vi.fn(),
      top: 0,
      width: 200,
      x: 0,
      y: 0,
    })

    render(() => (
      <div>
        <SFlowDisplay move speed={2} data-testid="flow">
          long title
        </SFlowDisplay>
      </div>
    ))

    expect(screen.getAllByText('long title')).toHaveLength(2)
    expect(screen.getByTestId('flow')).toHaveClass('animate-slide-text')
    expect(screen.getByTestId('flow')).toHaveStyle({'animation-duration': '4s'})
  })

  it('should render a single static copy when movement is disabled', () => {
    render(() => <SFlowDisplay>short title</SFlowDisplay>)

    expect(screen.getAllByText('short title')).toHaveLength(1)
  })
})

describe('useResizeObserver', () => {
  it('should observe the target and disconnect on cleanup', () => {
    const observe = vi.fn()
    const disconnect = vi.fn()
    class ResizeObserverMock {
      readonly disconnect = disconnect
      readonly observe = observe
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock)
    const target = document.createElement('div')

    const dispose = createRoot((disposeRoot) => {
      useResizeObserver(target, vi.fn())
      return disposeRoot
    })

    expect(observe).toHaveBeenCalledWith(target)
    dispose()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
