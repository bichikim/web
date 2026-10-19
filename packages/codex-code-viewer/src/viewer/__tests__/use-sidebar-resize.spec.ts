import {createRoot, createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {useSidebarResize} from '../use-sidebar-resize'

describe('useSidebarResize', () => {
  const createResize = () => {
    const [available, setAvailable] = createSignal(800)
    const [visible, setVisible] = createSignal(true)
    return {
      resize: useSidebarResize({
        availableWidth: available,
        contentMinimum: () => 240,
        initialWidth: 288,
        minimum: () => 200,
        spacing: () => 6,
        visible,
      }),
      setAvailable,
      setVisible,
    }
  }
  it('should resize toward the pressed arrow and clamp at either panel minimum', () => {
    createRoot((dispose) => {
      const {resize} = createResize()
      expect(resize.width()).toBe(288)
      expect(resize.keyboard('ArrowLeft')).toBe(true)
      expect(resize.width()).toBe(304)
      resize.keyboard('ArrowRight')
      expect(resize.width()).toBe(288)
      resize.keyboard('Home')
      expect(resize.width()).toBe(200)
      resize.keyboard('ArrowRight')
      expect(resize.width()).toBe(200)
      resize.keyboard('End')
      expect(resize.width()).toBe(554)
      resize.keyboard('ArrowLeft')
      expect(resize.width()).toBe(554)
      expect(resize.keyboard('Tab')).toBe(false)
      dispose()
    })
  })
  it('should drag only the captured pointer and stop after release', () => {
    createRoot((dispose) => {
      const {resize} = createResize()
      resize.begin(1, 500)
      resize.move(2, 450)
      expect(resize.width()).toBe(288)
      resize.move(1, 450)
      expect(resize.width()).toBe(338)
      resize.move(1, 1000)
      expect(resize.width()).toBe(200)
      resize.move(1, -1000)
      expect(resize.width()).toBe(554)
      resize.end(2)
      expect(resize.dragging()).toBe(true)
      resize.end(1)
      resize.move(1, 500)
      expect(resize.width()).toBe(554)
      expect(resize.dragging()).toBe(false)
      dispose()
    })
  })
  it('should fit window changes without losing the preferred width', () => {
    createRoot((dispose) => {
      const {resize, setAvailable} = createResize()
      resize.keyboard('ArrowLeft')
      setAvailable(500)
      expect(resize.width()).toBe(254)
      setAvailable(320)
      expect(resize.width()).toBe(200)
      expect(resize.maximum()).toBe(200)
      setAvailable(800)
      expect(resize.width()).toBe(304)
      dispose()
    })
  })
  it('should end a drag when hidden and restore the chosen width when reopened', () => {
    const {dispose, resize, setVisible} = createRoot((dispose) => ({dispose, ...createResize()}))
    resize.begin(1, 500)
    resize.move(1, 450)
    setVisible(false)
    expect(resize.dragging()).toBe(false)
    resize.move(1, 400)
    setVisible(true)
    expect(resize.width()).toBe(338)
    dispose()
  })
})
