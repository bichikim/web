/** @vitest-environment jsdom */
import {describe, expect, test} from 'vitest'
import {createAutoMeshDismissal} from '../create-auto-mesh-dismissal'

const pointer = (pointerType: string) =>
  Object.assign(new MouseEvent('pointerdown', {bubbles: true, composed: true}), {
    pointerType,
  }) as PointerEvent

const outside = (originalEvent: PointerEvent) =>
  new CustomEvent('interactOutside.pointerDownOutside', {
    cancelable: true,
    detail: {isContextMenu: false, originalEvent},
  })

describe('createAutoMeshDismissal', () => {
  test('should retain the original internal touch after its composed path is cleared', () => {
    const dismissal = createAutoMeshDismissal(() => undefined)
    const touch = pointer('touch')
    const surface = document.createElement('div')
    surface.addEventListener('pointerdown', () => dismissal.onPointerDown(touch))
    surface.dispatchEvent(touch)
    expect(touch.composedPath()).toEqual([])
    const event = outside(touch)
    dismissal.onPointerDownOutside(event)
    expect(event.defaultPrevented).toBe(true)
    expect(touch.defaultPrevented).toBe(false)
  })

  test('should leave a different touch and subsequent outside mouse dismissible', () => {
    const dismissal = createAutoMeshDismissal(() => undefined)
    dismissal.onPointerDown(pointer('touch'))
    const touch = outside(pointer('touch'))
    const mouse = outside(pointer('mouse'))
    dismissal.onPointerDownOutside(touch)
    dismissal.onPointerDownOutside(mouse)
    expect(touch.defaultPrevented).toBe(false)
    expect(mouse.defaultPrevented).toBe(false)
  })

  test('should not share internal touch events between dialog instances', () => {
    const first = createAutoMeshDismissal(() => undefined)
    const second = createAutoMeshDismissal(() => undefined)
    const touch = pointer('touch')
    first.onPointerDown(touch)
    const event = outside(touch)
    second.onPointerDownOutside(event)
    expect(event.defaultPrevented).toBe(false)
  })

  test('should retain an internal shadow mouse during document capture', () => {
    const host = document.createElement('div')
    const shadow = host.attachShadow({mode: 'open'})
    const surface = document.createElement('div')
    shadow.append(surface)
    document.body.append(host)
    const dismissal = createAutoMeshDismissal(() => surface)
    const mouse = pointer('mouse')
    const event = outside(mouse)
    const handlePointer = () => dismissal.onPointerDownOutside(event)
    document.addEventListener('pointerdown', handlePointer, {capture: true, once: true})
    surface.dispatchEvent(mouse)
    expect(event.defaultPrevented).toBe(true)
    expect(mouse.defaultPrevented).toBe(false)
    host.remove()
  })

  test('should preserve the light DOM pointer dismissal contract', () => {
    const surface = document.createElement('div')
    const dismissal = createAutoMeshDismissal(() => surface)
    const event = outside(pointer('mouse'))
    dismissal.onPointerDownOutside(event)
    expect(event.defaultPrevented).toBe(false)
  })
})
