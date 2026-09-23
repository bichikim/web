/** @vitest-environment jsdom */

import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({setStored: vi.fn(), useStorage: vi.fn()}))
vi.mock('@winter-love/solid-use', () => ({useStorage: mocks.useStorage}))

import {useRestoreScroll} from '../index'

describe('useRestoreScroll', () => {
  beforeEach(() => vi.clearAllMocks())

  it.each([
    [0.25, 200],
    [Number.NaN, 400],
  ])('should restore ratio %s and persist JSX scroll events', (ratio, position) => {
    mocks.useStorage.mockReturnValue([() => ratio, mocks.setStored])
    const view = render(() => {
      const [element, setElement] = createSignal<HTMLElement | null>(null)
      const scroll = useRestoreScroll(element)
      return (
        <div
          ref={(element) => {
            Object.defineProperties(element, {
              clientWidth: {configurable: true, value: 200},
              scrollWidth: {configurable: true, value: 1000},
            })
            setElement(element)
          }}
          onScroll={scroll.onScroll}
        />
      )
    })
    const element = view.container.firstElementChild as HTMLDivElement
    expect(element.scrollLeft).toBe(position)
    element.scrollLeft = 400
    fireEvent.scroll(element)
    expect(mocks.setStored).toHaveBeenCalledWith(0.5)
  })
})
