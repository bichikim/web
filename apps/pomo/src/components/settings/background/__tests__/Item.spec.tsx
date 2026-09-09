/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {Item} from '../Item'
vi.mock('../Content', () => ({Content: () => <button>delete media</button>}))
afterEach(() => vi.unstubAllGlobals())
it('should mount visible rows, retain a focused row offscreen, and release it after focus leaves', () => {
  let visibility!: IntersectionObserverCallback
  const disconnect = vi.fn()
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback) {
        visibility = callback
      }
      observe() {}
      disconnect = disconnect
    },
  )
  const view = render(() => (
    <ol>
      <Item
        item={{id: 'one', kind: 'photo', name: 'Photo', size: 1}}
        background={createBackground()}
      />
    </ol>
  ))
  const row = view.container.querySelector('li')!
  const show = (isIntersecting: boolean) =>
    visibility(
      [
        {
          boundingClientRect: row.getBoundingClientRect(),
          isIntersecting,
          intersectionRatio: isIntersecting ? 1 : 0,
          target: row,
          intersectionRect: row.getBoundingClientRect(),
          rootBounds: null,
          time: 0,
        },
      ],
      {} as IntersectionObserver,
    )
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  show(true)
  fireEvent.focusIn(screen.getByRole('button'))
  show(false)
  expect(screen.getByRole('button')).toBeInTheDocument()
  fireEvent.focusOut(row, {relatedTarget: document.body})
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  show(true)
  expect(screen.getByRole('button')).toBeInTheDocument()
  view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})
