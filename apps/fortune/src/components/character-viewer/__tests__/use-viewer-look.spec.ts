/** @vitest-environment jsdom */
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useViewerLook} from '../use-viewer-look'

const createLook = () => {
  const viewport = document.createElement('div')
  vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(new DOMRect(0, 0, 1000, 600))
  const onLook = vi.fn()
  return {look: useViewerLook({onLook, viewport: () => viewport}), onLook}
}

const pointer = (clientX: number, pointerType = 'mouse') =>
  Object.assign(new MouseEvent('pointermove', {clientX, clientY: 300}), {
    pointerType,
  }) as PointerEvent

afterEach(() => vi.restoreAllMocks())

describe('useViewerLook', () => {
  it('should follow the mouse across the viewport by default', () => {
    const {look, onLook} = createLook()
    look.handleLook(pointer(999))
    expect(look.following()).toBe(true)
    expect(onLook).toHaveBeenLastCalledWith({x: 1, y: 0})
  })

  it.each([-1, 0, 1] as const)(
    'should hold direction %s through mouse movement and leaving',
    (x) => {
      const {look, onLook} = createLook()
      look.turnHead(x)
      look.handleLook(pointer(500))
      look.clearLook()
      expect(look.following()).toBe(false)
      expect(look.direction()).toBe(x)
      expect(onLook).toHaveBeenCalledExactlyOnceWith({x, y: 0})
    },
  )

  it('should freeze the current target when following is turned off', () => {
    const {look, onLook} = createLook()
    look.handleLook(pointer(750))
    look.toggleFollowing()
    look.handleLook(pointer(1))
    look.clearLook()
    expect(look.following()).toBe(false)
    expect(onLook).toHaveBeenCalledExactlyOnceWith({x: 0.5, y: 0})
  })

  it('should resume following after a fixed direction and recenter on leaving', () => {
    const {look, onLook} = createLook()
    look.turnHead(-1)
    look.toggleFollowing()
    look.handleLook(pointer(999))
    expect(look.following()).toBe(true)
    expect(look.direction()).toBeNull()
    expect(onLook).toHaveBeenLastCalledWith({x: 1, y: 0})
    look.clearLook()
    expect(onLook).toHaveBeenLastCalledWith({x: 0, y: 0})
  })

  it('should ignore touch gestures', () => {
    const {look, onLook} = createLook()
    look.handleLook(pointer(999, 'touch'))
    expect(onLook).not.toHaveBeenCalled()
  })
})
