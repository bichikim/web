import {vi} from 'vitest'

/** Installs the browser capabilities used by tooltip DOM tests. */
export const installTooltipBrowser = () => {
  const visibleFocus = new WeakSet<HTMLElement>()
  const {matches} = HTMLElement.prototype
  const focus = vi
    .spyOn(HTMLElement.prototype, 'matches')
    .mockImplementation(function matchesFocus(this: HTMLElement, selector) {
      return selector === ':focus-visible' ? visibleFocus.has(this) : matches.call(this, selector)
    })
  const descriptors = new Map(
    ['showPopover', 'hidePopover'].map((name) => [
      name,
      Object.getOwnPropertyDescriptor(HTMLElement.prototype, name),
    ]),
  )
  vi.stubGlobal('CSS', {supports: () => true})
  vi.stubGlobal('PointerEvent', MouseEvent)
  for (const name of descriptors.keys()) {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      value: vi.fn(),
    })
  }

  return {
    restore: () => {
      focus.mockRestore()
      vi.unstubAllGlobals()
      for (const [name, descriptor] of descriptors) {
        if (descriptor === undefined) {
          Reflect.deleteProperty(HTMLElement.prototype, name)
        } else {
          Object.defineProperty(HTMLElement.prototype, name, descriptor)
        }
      }
    },
    setVisibleFocus: (element: HTMLElement) => {
      visibleFocus.add(element)
    },
  }
}
