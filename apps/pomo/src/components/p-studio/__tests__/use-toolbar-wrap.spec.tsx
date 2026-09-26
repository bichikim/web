/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {createSignal, Show} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {useToolbarWrap} from '../use-toolbar-wrap'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should measure a late pomodoro and follow its removal and replacement', async () => {
  const observe = vi.fn()
  const disconnect = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = observe
      disconnect = disconnect
    },
  )
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function measureBounds(this: Element) {
      const width = this.classList.contains('toolbar')
        ? 280
        : this.classList.contains('pomo-pomodoro')
          ? 134
          : 44
      return new DOMRect(0, 0, width, 44)
    },
  )
  vi.stubGlobal('getComputedStyle', () => ({
    columnGap: '8px',
    cssFloat: 'left',
    marginRight: '8px',
  }))
  const [visible, setVisible] = createSignal(false)
  let wrapping: ReturnType<typeof useToolbarWrap> | undefined
  const view = render(() => {
    const [element, setElement] = createSignal<HTMLDivElement | null>(null)
    wrapping = useToolbarWrap(element, () => true)
    return (
      <div>
        <Show when={visible()}>
          <div class="pomo-pomodoro" data-testid="pomo-pomodoro" />
        </Show>
        <div class="toolbar" data-testid="toolbar">
          <div ref={setElement}>
            <div />
            <div />
            <div />
          </div>
        </div>
      </div>
    )
  })
  expect(wrapping?.()).toBe(false)
  setVisible(true)
  await Promise.resolve()
  const original = view.getByTestId('pomo-pomodoro')
  expect(original).not.toBeNull()
  expect(observe).toHaveBeenCalledWith(original)
  expect(wrapping?.()).toBe(true)

  observe.mockClear()
  setVisible(false)
  await Promise.resolve()
  expect(wrapping?.()).toBe(false)
  expect(observe).not.toHaveBeenCalledWith(original)

  setVisible(true)
  await Promise.resolve()
  const replacement = view.getByTestId('pomo-pomodoro')
  expect(replacement).not.toBe(original)
  expect(observe).toHaveBeenCalledWith(replacement)
  expect(wrapping?.()).toBe(true)
  disconnect.mockClear()
  view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})

it('should remeasure available space and added controls, then disconnect on unmount', () => {
  let resizeCallback = () => {}
  let mutationCallback = () => {}
  const disconnectResize = vi.fn()
  const disconnectMutation = vi.fn()
  const observeResize = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resizeCallback = callback
      }
      observe = observeResize
      disconnect = disconnectResize
    },
  )
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor(callback: () => void) {
        mutationCallback = callback
      }
      observe = vi.fn()
      disconnect = disconnectMutation
    },
  )
  let available = 300
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function measureBounds(this: Element) {
      const width = this.classList.contains('toolbar')
        ? available
        : this.classList.contains('pomo-pomodoro')
          ? 134
          : 44
      return new DOMRect(0, 0, width, 44)
    },
  )
  vi.stubGlobal('getComputedStyle', () => ({
    columnGap: '8px',
    cssFloat: 'left',
    marginRight: '8px',
  }))
  let wrapping: ReturnType<typeof useToolbarWrap> | undefined
  const view = render(() => {
    const [element, setElement] = createSignal<HTMLDivElement | null>(null)
    wrapping = useToolbarWrap(element, () => true)
    return (
      <div>
        <div class="pomo-pomodoro" data-testid="pomo-pomodoro" />
        <div class="toolbar" data-testid="toolbar">
          <div ref={setElement}>
            <div />
            <div />
            <div />
          </div>
        </div>
      </div>
    )
  })
  expect(wrapping?.()).toBe(false)
  available = 280
  resizeCallback()
  expect(wrapping?.()).toBe(true)
  available = 300
  resizeCallback()
  expect(wrapping?.()).toBe(false)
  const actions = view.getByTestId('toolbar').firstElementChild
  const control = document.createElement('div')
  actions?.append(control)
  mutationCallback()
  expect(observeResize).toHaveBeenCalledWith(control)
  expect(wrapping?.()).toBe(true)
  disconnectResize.mockClear()
  view.unmount()
  expect(disconnectResize).toHaveBeenCalledOnce()
  expect(disconnectMutation).toHaveBeenCalledOnce()
})

it('should observe only while enabled and reset wrapping when disabled', async () => {
  const observeResize = vi.fn()
  const disconnectResize = vi.fn()
  const observeMutation = vi.fn()
  const disconnectMutation = vi.fn()
  const createResizeObserver = vi.fn()
  const createMutationObserver = vi.fn()
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor() {
        createResizeObserver()
      }
      observe = observeResize
      disconnect = disconnectResize
    },
  )
  vi.stubGlobal(
    'MutationObserver',
    class {
      constructor() {
        createMutationObserver()
      }
      observe = observeMutation
      disconnect = disconnectMutation
    },
  )
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    function measureBounds(this: Element) {
      const width = this.classList.contains('toolbar')
        ? 280
        : this.classList.contains('pomo-pomodoro')
          ? 134
          : 44
      return new DOMRect(0, 0, width, 44)
    },
  )
  vi.stubGlobal('getComputedStyle', () => ({
    columnGap: '8px',
    cssFloat: 'left',
    marginRight: '8px',
  }))
  const [enabled, setEnabled] = createSignal(false)
  let wrapping: ReturnType<typeof useToolbarWrap> | undefined
  const view = render(() => {
    const [element, setElement] = createSignal<HTMLDivElement | null>(null)
    wrapping = useToolbarWrap(element, enabled)
    return (
      <div>
        <div class="pomo-pomodoro" />
        <div class="toolbar">
          <div ref={setElement}>
            <div />
            <div />
            <div />
          </div>
        </div>
      </div>
    )
  })

  expect(createResizeObserver).not.toHaveBeenCalled()
  expect(createMutationObserver).not.toHaveBeenCalled()
  expect(wrapping?.()).toBe(false)

  setEnabled(true)
  await Promise.resolve()
  expect(createResizeObserver).toHaveBeenCalledOnce()
  expect(createMutationObserver).toHaveBeenCalledOnce()
  expect(wrapping?.()).toBe(true)

  setEnabled(false)
  await Promise.resolve()
  expect(disconnectResize).toHaveBeenCalled()
  expect(disconnectMutation).toHaveBeenCalledOnce()
  expect(wrapping?.()).toBe(false)

  setEnabled(true)
  await Promise.resolve()
  expect(createResizeObserver).toHaveBeenCalledTimes(2)
  expect(createMutationObserver).toHaveBeenCalledTimes(2)
  expect(wrapping?.()).toBe(true)

  view.unmount()
  expect(disconnectMutation).toHaveBeenCalledTimes(2)
})
