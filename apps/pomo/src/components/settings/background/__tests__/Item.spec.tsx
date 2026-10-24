/** @vitest-environment jsdom */
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {createBackground} from 'src/features/background/__tests__/fixtures/controller'
import {Item} from '../Item'
vi.mock('../Content', () => ({
  Content: () => (
    <>
      <button>delete media</button>
      <button>inspect media</button>
    </>
  ),
}))
afterEach(() => vi.unstubAllGlobals())
it('should mount visible rows, retain a focused row offscreen, and release it after focus leaves', () => {
  let visibility!: IntersectionObserverCallback
  const disconnect = vi.fn()
  const configurations: IntersectionObserverInit[] = []
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: IntersectionObserverCallback, options: IntersectionObserverInit) {
        visibility = callback
        configurations.push(options)
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
  const row = screen.getByRole('listitem')
  expect(configurations).toEqual([{root: screen.getByRole('list'), rootMargin: '80px'}])
  expect(row.style.getPropertyValue('--item-height')).toBe('80px')
  const show = (isIntersecting: boolean) =>
    visibility(
      [
        {
          boundingClientRect: row.getBoundingClientRect(),
          intersectionRatio: isIntersecting ? 1 : 0,
          intersectionRect: row.getBoundingClientRect(),
          isIntersecting,
          rootBounds: null,
          target: row,
          time: 0,
        },
      ],
      {} as IntersectionObserver,
    )
  expect(screen.queryByRole('button', {name: 'delete media'})).not.toBeInTheDocument()
  show(true)
  fireEvent.focusIn(screen.getByRole('button', {name: 'delete media'}))
  show(false)
  expect(screen.getByRole('button', {name: 'delete media'})).toBeInTheDocument()
  fireEvent.focusOut(screen.getByRole('button', {name: 'delete media'}), {
    relatedTarget: screen.getByRole('button', {name: 'inspect media'}),
  })
  expect(screen.getByRole('button', {name: 'inspect media'})).toBeInTheDocument()
  fireEvent.focusOut(row, {relatedTarget: document.body})
  expect(screen.queryByRole('button', {name: 'delete media'})).not.toBeInTheDocument()
  show(true)
  expect(screen.getByRole('button', {name: 'delete media'})).toBeInTheDocument()
  view.unmount()
  expect(disconnect).toHaveBeenCalledOnce()
})

it('should measure every false entry before hiding content, including initial and repeated entries', () => {
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
  const row = screen.getByRole('listitem')
  const measurements: boolean[] = []
  let height = 94
  const bounds = row.getBoundingClientRect()
  const measure = vi.spyOn(row, 'getBoundingClientRect').mockImplementation(() => {
    measurements.push(screen.queryByRole('button', {name: 'delete media'}) !== null)
    return {...bounds, height}
  })
  const entry = (isIntersecting: boolean): IntersectionObserverEntry => ({
    boundingClientRect: bounds,
    intersectionRatio: isIntersecting ? 1 : 0,
    intersectionRect: bounds,
    isIntersecting,
    rootBounds: null,
    target: row,
    time: 0,
  })
  try {
    visibility([entry(false)], {} as IntersectionObserver)
    expect(row.style.getPropertyValue('--item-height')).toBe('94px')
    height = 112
    visibility([entry(false)], {} as IntersectionObserver)
    expect(row.style.getPropertyValue('--item-height')).toBe('112px')
    height = 138
    visibility([entry(true), entry(false), entry(false), entry(true)], {} as IntersectionObserver)
    expect(measurements).toEqual([false, false, true, false])
    expect(row.style.getPropertyValue('--item-height')).toBe('138px')
    expect(screen.getByRole('button', {name: 'delete media'})).toBeInTheDocument()
    view.unmount()
    visibility([entry(false)], {} as IntersectionObserver)
    expect(measure).toHaveBeenCalledTimes(4)
    expect(disconnect).toHaveBeenCalledOnce()
  } finally {
    measure.mockRestore()
    view.unmount()
  }
})
