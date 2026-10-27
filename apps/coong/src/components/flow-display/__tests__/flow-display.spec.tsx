/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'
import {createRoot, createSignal, onCleanup, onMount} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {SFlowDisplay} from '../SFlowDisplay'
import {useResizeObserver} from '../resize-observer'

const Content = (props: {onMount: () => void; onCleanup: () => void}) => {
  onMount(() => props.onMount())
  onCleanup(() => props.onCleanup())
  return <strong>child</strong>
}

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

  it.each([{parentWidths: [300, 100, 300]}, {parentWidths: [100, 300, 100]}])(
    'should update overflow after resizing only the parent: $parentWidths',
    ({parentWidths}) => {
      let parentWidth = parentWidths[0]
      // jsdom은 레이아웃을 측정하지 않아 폭을 대체하고, 실제 viewport 회귀는 별도로 검증한다.
      vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => parentWidth)
      vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 200, 10),
      )
      const view = render(() => (
        <div>
          <SFlowDisplay move speed={2} data-testid="flow" tabindex={0}>
            unchanged title
          </SFlowDisplay>
        </div>
      ))
      const flow = view.getByTestId('flow')
      const text = flow.firstElementChild
      flow.focus()
      for (const nextWidth of parentWidths) {
        parentWidth = nextWidth
        globalThis.dispatchEvent(new Event('resize'))
        const overflowing = parentWidth < 200
        expect(flow.classList.contains('animate-slide-text')).toBe(overflowing)
        expect(flow.children).toHaveLength(overflowing ? 2 : 1)
        expect(flow.style.animationDuration).toBe(overflowing ? '4s' : '0s')
        expect(view.getByTestId('flow')).toBe(flow)
        expect(flow.firstElementChild).toBe(text)
        expect(document.activeElement).toBe(flow)
      }
    },
  )

  it('should update marquee and duration when text changes without a window resize', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(150)
    // Measure the rendered text so measuring before the DOM update cannot pass.
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function measureText(this: HTMLElement) {
        return new DOMRect(0, 0, (this.textContent?.length ?? 0) * 10, 10)
      },
    )
    const [label, setLabel] = createSignal('short')
    const view = render(() => (
      <div>
        <SFlowDisplay move speed={2} data-testid="flow" tabindex={0}>
          {label()}
        </SFlowDisplay>
      </div>
    ))
    const flow = view.getByTestId('flow')
    const text = flow.firstElementChild
    flow.focus()

    for (const title of [
      'short',
      'a much longer title',
      'an even longer overflowing title',
      'exactly fifteen',
      'short',
    ]) {
      setLabel(title)
      const overflowing = title.length * 10 > 150
      expect(flow.children).toHaveLength(overflowing ? 2 : 1)
      expect(flow.classList.contains('animate-slide-text')).toBe(overflowing)
      expect(flow.style.animationDuration).toBe(overflowing ? `${title.length / 5}s` : '0s')
      expect([...flow.children].every((child) => child.textContent === title)).toBe(true)
      expect(view.getByTestId('flow')).toBe(flow)
      expect(flow.firstElementChild).toBe(text)
      expect(document.activeElement).toBe(flow)
    }
  })

  it('should measure the latest text only after movement is enabled', () => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(150)
    const measureText = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function measureText(this: HTMLElement) {
        return new DOMRect(0, 0, (this.textContent?.length ?? 0) * 10, 10)
      })
    const [label, setLabel] = createSignal('short')
    const [move, setMove] = createSignal(false)
    const view = render(() => (
      <div>
        <SFlowDisplay move={move()} data-testid="flow">
          {label()}
        </SFlowDisplay>
      </div>
    ))
    const flow = view.getByTestId('flow')
    setLabel('a much longer title')
    expect(flow.children).toHaveLength(1)
    expect(measureText).not.toHaveBeenCalled()
    setMove(true)
    expect(flow.children).toHaveLength(2)
    expect(flow.style.animationDuration).toBe('1.9s')
    setMove(false)
    const measured = measureText.mock.calls.length
    setLabel('short')
    expect(flow.children).toHaveLength(1)
    expect(flow.style.animationDuration).toBe('0s')
    expect(measureText).toHaveBeenCalledTimes(measured)
    setMove(true)
    expect(flow.children).toHaveLength(1)
    const beforeUnmount = measureText.mock.calls.length
    view.unmount()
    setLabel('a much longer title')
    expect(measureText).toHaveBeenCalledTimes(beforeUnmount)
  })

  it('should retain no-op measurements, react to move and speed, and stop measuring after cleanup', () => {
    let parentWidth = 100
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => parentWidth)
    const measureText = vi
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue(new DOMRect(0, 0, 200, 10))
    const [move, setMove] = createSignal(false)
    const [speed, setSpeed] = createSignal(2)
    const view = render(() => (
      <div>
        <SFlowDisplay move={move()} speed={speed()} data-testid="flow" tabindex={0}>
          unchanged title
        </SFlowDisplay>
      </div>
    ))
    const flow = view.getByTestId('flow')
    const text = flow.firstElementChild
    expect(measureText).not.toHaveBeenCalled()
    globalThis.dispatchEvent(new Event('resize'))
    expect(measureText).not.toHaveBeenCalled()
    setMove(true)
    expect(flow.children).toHaveLength(2)
    expect(flow.style.animationDuration).toBe('4s')
    const duplicate = flow.lastElementChild
    flow.focus()
    const measuredBeforeResize = measureText.mock.calls.length
    globalThis.dispatchEvent(new Event('resize'))
    expect(measureText.mock.calls.length).toBeGreaterThan(measuredBeforeResize)
    expect(flow.lastElementChild).toBe(duplicate)
    const measuredBeforeSpeed = measureText.mock.calls.length
    setSpeed(1)
    expect(flow.style.animationDuration).toBe('2s')
    expect(measureText).toHaveBeenCalledTimes(measuredBeforeSpeed)
    setMove(false)
    expect(flow.children).toHaveLength(1)
    expect(flow.style.animationDuration).toBe('0s')
    globalThis.dispatchEvent(new Event('resize'))
    expect(measureText).toHaveBeenCalledTimes(measuredBeforeSpeed)
    parentWidth = 300
    setMove(true)
    expect(flow.children).toHaveLength(1)
    expect(flow.style.animationDuration).toBe('0s')
    expect(flow.firstElementChild).toBe(text)
    expect(document.activeElement).toBe(flow)
    const measuredBeforeUnmount = measureText.mock.calls.length
    view.unmount()
    globalThis.dispatchEvent(new Event('resize'))
    expect(measureText).toHaveBeenCalledTimes(measuredBeforeUnmount)
  })

  it('should mount and clean up JSX children only for the displayed copies', () => {
    let parentWidth = 300
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => parentWidth)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(0, 0, 200, 10),
    )
    const mount = vi.fn()
    const cleanup = vi.fn()
    const view = render(() => (
      <div>
        <SFlowDisplay move data-testid="flow">
          <Content onMount={mount} onCleanup={cleanup} />
        </SFlowDisplay>
      </div>
    ))
    expect(screen.getAllByText('child')).toHaveLength(1)
    expect(mount).toHaveBeenCalledOnce()
    parentWidth = 100
    globalThis.dispatchEvent(new Event('resize'))
    expect(screen.getAllByText('child')).toHaveLength(2)
    expect(mount).toHaveBeenCalledTimes(2)
    parentWidth = 300
    globalThis.dispatchEvent(new Event('resize'))
    expect(screen.getAllByText('child')).toHaveLength(1)
    expect(cleanup).toHaveBeenCalledOnce()
    view.unmount()
    expect(cleanup).toHaveBeenCalledTimes(2)
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
