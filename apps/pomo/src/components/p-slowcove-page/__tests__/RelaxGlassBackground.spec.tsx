/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {RelaxGlassBackground} from '../RelaxGlassBackground'

const mocks = vi.hoisted(() => ({create: vi.fn(), report: vi.fn()}))

vi.mock('src/features/relax-glass-renderer', () => ({
  RelaxGlassRenderer: class {
    constructor() {
      Object.assign(this, mocks.create())
    }
  },
}))
vi.mock('src/features/client-error-reporter', () => ({reportClientError: mocks.report}))

afterEach(() => {
  cleanup()
  mocks.create.mockReset()
  mocks.report.mockReset()
})

const createRenderer = () => {
  const pending = Promise.withResolvers<void>()
  const instance = {
    destroy: vi.fn(),
    initialize: vi.fn(() => pending.promise),
    setDaylightPosition: vi.fn(),
    setDepthOffset: vi.fn(),
    setMistIntensity: vi.fn(),
    setRainEnabled: vi.fn(),
  }
  mocks.create.mockReturnValueOnce(instance)
  return {instance, pending}
}

it('should reveal the initialized canvas and update settings without replacing its renderer', async () => {
  const {instance, pending} = createRenderer()
  const [rainy, setRainy] = createSignal(false)
  const [mist, setMist] = createSignal(1)
  const [offset, setOffset] = createSignal({x: 0, y: 0})
  const view = render(() => (
    <RelaxGlassBackground
      backgroundSrc="/first.webp"
      depthSrc="/depth.webp"
      depthOffset={offset()}
      mistIntensity={mist()}
      weather={rainy() ? 'rainy' : 'sunny'}
    />
  ))
  // The fallback image is decorative inside aria-hidden content.
  expect(view.container.querySelector('img')).not.toBeNull()
  expect(instance.initialize).toHaveBeenCalledExactlyOnceWith('/first.webp', '/depth.webp')
  setRainy(true)
  setMist(0.4)
  setOffset({x: 0.2, y: -0.1})
  expect(instance.setRainEnabled).toHaveBeenLastCalledWith(true)
  expect(instance.setMistIntensity).toHaveBeenLastCalledWith(0.4)
  expect(instance.setDepthOffset).toHaveBeenLastCalledWith(0.2, -0.1)
  expect(mocks.create).toHaveBeenCalledOnce()

  pending.resolve()
  await pending.promise

  expect(view.container.querySelector('img')).toBeNull()
  expect(view.container.querySelector('canvas')).not.toHaveClass('invisible')
})

it('should ignore a replaced renderer completing while the current renderer is still loading', async () => {
  const first = createRenderer()
  const second = createRenderer()
  const [source, setSource] = createSignal('/first.webp')
  const view = render(() => <RelaxGlassBackground backgroundSrc={source()} />)
  const canvas = view.container.querySelector('canvas')
  setSource('/second.webp')
  expect(first.instance.destroy).toHaveBeenCalledOnce()
  expect(second.instance.initialize).toHaveBeenCalledExactlyOnceWith('/second.webp', undefined)

  first.pending.resolve()
  await first.pending.promise

  expect(view.container.querySelector('img')).not.toBeNull()
  expect(view.container.querySelector('canvas')).toBe(canvas)
  second.pending.resolve()
  await second.pending.promise
  expect(view.container.querySelector('img')).toBeNull()
  expect(mocks.report).not.toHaveBeenCalled()
})

it('should ignore a replaced renderer error and report the current renderer error', async () => {
  const first = createRenderer()
  const second = createRenderer()
  const [source, setSource] = createSignal('/first.webp')
  render(() => <RelaxGlassBackground backgroundSrc={source()} />)
  setSource('/second.webp')
  const obsoleteError = new Error('obsolete')
  first.pending.reject(obsoleteError)
  await first.pending.promise.catch(() => undefined)
  expect(mocks.report).not.toHaveBeenCalled()

  const currentError = new Error('current')
  second.pending.reject(currentError)
  await second.pending.promise.catch(() => undefined)

  expect(mocks.report).toHaveBeenCalledExactlyOnceWith(currentError, {
    feature: 'relax-glass-renderer',
    source: 'direct',
  })
})

it.each(['resolve', 'reject'] as const)(
  'should destroy immediately and ignore late %s after disposal',
  async (outcome) => {
    const {instance, pending} = createRenderer()
    const view = render(() => <RelaxGlassBackground />)

    view.unmount()

    expect(instance.destroy).toHaveBeenCalledOnce()
    if (outcome === 'resolve') {
      pending.resolve()
    } else {
      pending.reject(new Error('after disposal'))
    }
    await pending.promise.catch(() => undefined)
    expect(instance.destroy).toHaveBeenCalledOnce()
    expect(mocks.report).not.toHaveBeenCalled()
  },
)

it('should reset readiness and retain the canvas when a ready renderer is replaced', async () => {
  const first = createRenderer()
  const second = createRenderer()
  const [source, setSource] = createSignal('/first.webp')
  const view = render(() => <RelaxGlassBackground backgroundSrc={source()} />)
  const canvas = view.container.querySelector('canvas')
  first.pending.resolve()
  await first.pending.promise
  expect(view.container.querySelector('img')).toBeNull()

  setSource('/second.webp')

  expect(first.instance.destroy).toHaveBeenCalledOnce()
  expect(view.container.querySelector('img')).not.toBeNull()
  expect(view.container.querySelector('canvas')).toBe(canvas)
  second.pending.resolve()
  await second.pending.promise
  expect(view.container.querySelector('img')).toBeNull()
  expect(second.instance.destroy).not.toHaveBeenCalled()
})
