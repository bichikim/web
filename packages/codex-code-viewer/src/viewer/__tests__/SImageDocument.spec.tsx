/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createRoot} from 'solid-js'
import {SImageDocument} from '../SImageDocument'
import {ViewStateContext} from '../view-state/context'
import {useSessionViewState} from '../use-session-view-state'

describe('SImageDocument', () => {
  let disposeState: (() => void) | undefined
  beforeEach(() => {
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(320)
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(200)
  })
  afterEach(() => {
    cleanup()
    disposeState?.()
    disposeState = undefined
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  const setup = () => {
    render(() => <SImageDocument src="blob:image" path="sample.png" />)
    const image = screen.getByRole('img', {name: 'sample.png'})
    Object.defineProperties(image, {naturalHeight: {value: 400}, naturalWidth: {value: 800}})
    fireEvent.load(image)
    const viewport = screen.getByRole('region', {name: '이미지 확대 및 이동'})
    Object.assign(viewport, {
      hasPointerCapture: () => true,
      releasePointerCapture: vi.fn(),
      setPointerCapture: vi.fn(),
    })
    return {
      image,
      input: screen.getByRole<HTMLInputElement>('spinbutton', {name: '이미지 배율 (%)'}),
      viewport,
    }
  }
  it('should restore zoom and pan when an image view is recreated', () => {
    const state = createRoot((dispose) => {
      disposeState = dispose
      return useSessionViewState({
        selection: () => null,
        session: () => ({
          document: {
            lines: [],
            location: {column: 1, line: 1, path: 'sample.png'},
            revision: 'one',
            source: '',
          },
          session: 'one',
          workspace: '/project',
        }),
      })
    })
    const mount = () =>
      render(() => (
        <ViewStateContext.Provider value={state}>
          <SImageDocument src="blob:image" path="sample.png" />
        </ViewStateContext.Provider>
      ))
    const load = () => {
      const image = screen.getByRole('img', {name: 'sample.png'})
      Object.defineProperties(image, {naturalHeight: {value: 400}, naturalWidth: {value: 800}})
      fireEvent.load(image)
    }
    const first = mount()
    load()
    const input = screen.getByRole<HTMLInputElement>('spinbutton', {name: '이미지 배율 (%)'})
    fireEvent.input(input, {target: {value: '200'}})
    fireEvent.blur(input)
    const viewport = screen.getByRole('region', {name: '이미지 확대 및 이동'})
    fireEvent.keyDown(viewport, {key: 'ArrowRight'})
    const x = viewport.style.getPropertyValue('--image-x')
    first.unmount()
    mount()
    load()
    expect(screen.getByRole<HTMLInputElement>('spinbutton', {name: '이미지 배율 (%)'}).value).toBe(
      '200',
    )
    expect(
      screen.getByRole('region', {name: '이미지 확대 및 이동'}).style.getPropertyValue('--image-x'),
    ).toBe(x)
  })

  it('should commit a typed percentage and restore fit mode without zooming while typing', () => {
    const {input} = setup()
    expect(input.value).toBe('40')
    fireEvent.input(input, {target: {value: '200'}})
    expect(screen.getByRole('button', {name: '화면에 맞춤'}).getAttribute('aria-pressed')).toBe(
      'true',
    )
    fireEvent.keyDown(input, {key: 'Enter'})
    expect(input.value).toBe('200')
    expect(screen.getByRole('button', {name: '화면에 맞춤'}).getAttribute('aria-pressed')).toBe(
      'false',
    )
    fireEvent.input(input, {target: {value: ''}})
    fireEvent.blur(input)
    expect(input.value).toBe('200')
    fireEvent.click(screen.getByRole('button', {name: '화면에 맞춤'}))
    expect(input.value).toBe('40')
  })
  it('should use trackpad zoom events without letting the browser zoom the page', () => {
    const {input, viewport} = setup()
    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      clientX: 160,
      clientY: 100,
      ctrlKey: true,
      deltaY: -100,
    })
    fireEvent(viewport, wheel)
    expect(wheel.defaultPrevented).toBe(true)
    expect(Number(input.value)).toBeGreaterThan(40)
    expect(screen.getByRole('button', {name: '화면에 맞춤'}).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })
  it('should zoom with two touch pointers and stop the pinch when a pointer is lifted', () => {
    const {input, viewport} = setup()
    const pointer = (type: string, pointerId: number, clientX: number) =>
      Object.assign(new MouseEvent(type, {bubbles: true, button: 0, clientX, clientY: 100}), {
        pointerId,
        pointerType: 'touch',
      })
    fireEvent(viewport, pointer('pointerdown', 1, 100))
    fireEvent(viewport, pointer('pointerdown', 2, 200))
    fireEvent(viewport, pointer('pointermove', 2, 300))
    expect(input.value).toBe('80')
    expect(viewport.setPointerCapture).toHaveBeenCalledWith(1)
    expect(viewport.setPointerCapture).toHaveBeenCalledWith(2)
    fireEvent(viewport, pointer('pointerup', 2, 300))
    fireEvent(viewport, pointer('pointermove', 2, 400))
    expect(input.value).toBe('80')
    fireEvent(viewport, pointer('pointercancel', 1, 100))
    expect(viewport.getAttribute('data-dragging')).toBe('false')
  })
  it('should capture drags only when image movement is possible and stop after cancellation', () => {
    const {input, viewport} = setup()
    const pointer = (type: string, clientX: number) =>
      Object.assign(new MouseEvent(type, {bubbles: true, button: 0, clientX, clientY: 100}), {
        pointerId: 1,
        pointerType: 'mouse',
      })
    fireEvent(viewport, pointer('pointerdown', 100))
    expect(viewport.setPointerCapture).not.toHaveBeenCalled()
    fireEvent.input(input, {target: {value: '200'}})
    fireEvent.blur(input)
    fireEvent(viewport, pointer('pointerdown', 100))
    expect(viewport.setPointerCapture).toHaveBeenCalledWith(1)
    fireEvent(viewport, pointer('pointermove', 150))
    const x = viewport.style.getPropertyValue('--image-x')
    expect(viewport.getAttribute('data-dragging')).toBe('true')
    fireEvent(viewport, pointer('pointercancel', 150))
    expect(viewport.getAttribute('data-dragging')).toBe('false')
    fireEvent(viewport, pointer('pointermove', 200))
    expect(viewport.style.getPropertyValue('--image-x')).toBe(x)
  })
})
