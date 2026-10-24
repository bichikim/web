/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import {createEmptyDocument} from '../../player'
import {createPlayerFixture} from '../../editor/__tests__/fixtures/player'
import {RuntimePage} from '../RuntimePage'

const mocks = vi.hoisted(() => ({createPlayer: vi.fn()}))
vi.mock('../../player', async (original) => ({
  ...(await original<typeof import('../../player')>()),
  createPlayer: mocks.createPlayer,
}))
vi.mock('../graph/MappingGraph', () => ({MappingGraph: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  sessionStorage.clear()
  localStorage.clear()
})

test.each(['studio', 'viewer'] as const)(
  'should retain the %s camera during panel resizing and allow explicit fitting afterward',
  async (mode) => {
    const observers = new Map<Element, ResizeObserverCallback>()
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(readonly callback: ResizeObserverCallback) {}
        observe = (element: Element) => observers.set(element, this.callback)
        disconnect = vi.fn()
      },
    )
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(480)
    mocks.createPlayer.mockResolvedValue(createPlayerFixture())
    const view = render(() => (
      <RuntimePage mode={mode} loadInitialDocument={async () => createEmptyDocument()} />
    ))
    const viewport = await view.findByRole('region', {name: '모델 보기'})
    await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledOnce())
    fireEvent.click(view.getByRole('button', {name: '화면 맞춤'}))
    const zoom = viewport.style.getPropertyValue('--camera-zoom')
    const x = viewport.style.getPropertyValue('--camera-x')
    const y = viewport.style.getPropertyValue('--camera-y')
    const divider = view.getByRole('separator', {
      name: mode === 'studio' ? '모델·그래프 너비 조절' : '모델·도구 너비 조절',
    })
    fireEvent.keyDown(divider, {key: 'ArrowLeft'})
    vi.spyOn(viewport, 'clientWidth', 'get').mockReturnValue(320)
    observers.get(viewport)!([], {} as ResizeObserver)
    expect(viewport.style.getPropertyValue('--camera-zoom')).toBe(zoom)
    expect(viewport.style.getPropertyValue('--camera-x')).toBe(x)
    expect(viewport.style.getPropertyValue('--camera-y')).toBe(y)
    expect(mocks.createPlayer).toHaveBeenCalledOnce()
    fireEvent.click(view.getByRole('button', {name: '화면 맞춤'}))
    expect(Number(viewport.style.getPropertyValue('--camera-zoom'))).toBeCloseTo(0.5)
  },
)
