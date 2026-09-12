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
    wrapping = useToolbarWrap(element)
    return (
      <div>
        <Show when={visible()}>
          <div class="pomo-pomodoro" />
        </Show>
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
  expect(wrapping?.()).toBe(false)
  setVisible(true)
  await Promise.resolve()
  const original = view.container.querySelector('.pomo-pomodoro')
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
  const replacement = view.container.querySelector('.pomo-pomodoro')
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
    wrapping = useToolbarWrap(element)
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
  expect(wrapping?.()).toBe(false)
  available = 280
  resizeCallback()
  expect(wrapping?.()).toBe(true)
  available = 300
  resizeCallback()
  expect(wrapping?.()).toBe(false)
  const actions = view.container.querySelector('.toolbar')?.firstElementChild
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
