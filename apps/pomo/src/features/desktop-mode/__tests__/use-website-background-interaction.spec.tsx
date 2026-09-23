/** @vitest-environment jsdom */

import {afterEach, describe, expect, it, vi} from 'vitest'

import {forwardDesktopBackgroundMouseEvent} from '../runtime'
import {useWebsiteBackgroundInteraction} from '../use-website-background-interaction'

vi.mock('../runtime', () => ({forwardDesktopBackgroundMouseEvent: vi.fn()}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('useWebsiteBackgroundInteraction', () => {
  it('should forward only the pointer sequence received by the website layer', async () => {
    const interaction = useWebsiteBackgroundInteraction()
    const surface = document.createElement('div')
    const createPointerEvent = (overrides: Partial<PointerEvent>): PointerEvent =>
      ({
        altKey: false,
        button: 0,
        buttons: 0,
        clientX: 120,
        clientY: 80,
        ctrlKey: false,
        currentTarget: surface,
        detail: 1,
        metaKey: false,
        pointerId: 7,
        preventDefault: vi.fn(),
        shiftKey: false,
        stopPropagation: vi.fn(),
        ...overrides,
      }) as unknown as PointerEvent

    interaction.handlePointerDown(
      createPointerEvent({
        button: 0,
        clientX: 120,
        clientY: 80,
        detail: 1,
        pointerId: 7,
      }),
    )
    interaction.handlePointerMove(
      createPointerEvent({
        button: 0,
        buttons: 1,
        clientX: 140,
        clientY: 90,
        detail: 0,
        pointerId: 7,
      }),
    )
    interaction.handlePointerUp(
      createPointerEvent({
        button: 0,
        clientX: 140,
        clientY: 90,
        detail: 1,
        pointerId: 7,
      }),
    )

    await vi.waitFor(() => expect(forwardDesktopBackgroundMouseEvent).toHaveBeenCalledTimes(3))
    expect(
      vi.mocked(forwardDesktopBackgroundMouseEvent).mock.calls.map(([event]) => event.kind),
    ).toEqual(['down', 'dragged', 'up'])
    expect(interaction.handleContextMenu).toBe(interaction.handleClick)
  })

  it('should leave unsupported pointer buttons to the regular app event path', () => {
    const interaction = useWebsiteBackgroundInteraction()
    const event = {
      button: 5,
      pointerId: 7,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as PointerEvent

    interaction.handlePointerDown(event)

    expect(forwardDesktopBackgroundMouseEvent).not.toHaveBeenCalled()
  })

  it('should forward hover, pointer leave, and wheel input to the website layer', async () => {
    const interaction = useWebsiteBackgroundInteraction()
    const surface = document.createElement('div')
    const pointerEvent = (overrides: Partial<PointerEvent>): PointerEvent =>
      ({
        altKey: false,
        button: -1,
        buttons: 0,
        clientX: 120,
        clientY: 80,
        ctrlKey: false,
        currentTarget: surface,
        detail: 0,
        metaKey: false,
        pointerId: 7,
        preventDefault: vi.fn(),
        shiftKey: false,
        stopPropagation: vi.fn(),
        ...overrides,
      }) as unknown as PointerEvent
    const wheelEvent = {
      altKey: false,
      clientX: 120,
      clientY: 80,
      ctrlKey: true,
      deltaMode: 0,
      deltaX: 0,
      deltaY: 120,
      deltaZ: 0,
      metaKey: false,
      preventDefault: vi.fn(),
      shiftKey: false,
      stopPropagation: vi.fn(),
    } as unknown as WheelEvent

    interaction.handlePointerMove(pointerEvent({}))
    interaction.handlePointerLeave(pointerEvent({}))
    interaction.handleWheel(wheelEvent)

    await vi.waitFor(() => expect(forwardDesktopBackgroundMouseEvent).toHaveBeenCalledTimes(3))
    expect(
      vi.mocked(forwardDesktopBackgroundMouseEvent).mock.calls.map(([event]) => event.kind),
    ).toEqual(['moved', 'left', 'wheel'])
    expect(forwardDesktopBackgroundMouseEvent).toHaveBeenLastCalledWith(
      expect.objectContaining({deltaY: 120, kind: 'wheel'}),
    )
  })

  it('should preserve the active button when a secondary pointer is dragged or cancelled', async () => {
    const interaction = useWebsiteBackgroundInteraction()
    const surface = document.createElement('div')
    const createPointerEvent = (overrides: Partial<PointerEvent>): PointerEvent =>
      ({
        button: 2,
        buttons: 2,
        clientX: 120,
        clientY: 80,
        currentTarget: surface,
        pointerId: 9,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...overrides,
      }) as unknown as PointerEvent

    interaction.handlePointerDown(createPointerEvent({}))
    interaction.handlePointerMove(createPointerEvent({button: -1}))
    interaction.handlePointerCancel(createPointerEvent({button: -1, buttons: 0}))

    await vi.waitFor(() => expect(forwardDesktopBackgroundMouseEvent).toHaveBeenCalledTimes(3))
    expect(
      vi.mocked(forwardDesktopBackgroundMouseEvent).mock.calls.map(([event]) => event.button),
    ).toEqual([2, 2, 2])
  })

  it('should forward pointer cancellation without turning it into a release', async () => {
    const interaction = useWebsiteBackgroundInteraction()
    const surface = document.createElement('div')
    const createPointerEvent = (overrides: Partial<PointerEvent>): PointerEvent =>
      ({
        button: 0,
        buttons: 1,
        clientX: 120,
        clientY: 80,
        currentTarget: surface,
        detail: 1,
        pointerId: 7,
        preventDefault: vi.fn(),
        stopPropagation: vi.fn(),
        ...overrides,
      }) as unknown as PointerEvent

    interaction.handlePointerDown(createPointerEvent({}))
    interaction.handlePointerCancel(createPointerEvent({buttons: 0}))

    await vi.waitFor(() => expect(forwardDesktopBackgroundMouseEvent).toHaveBeenCalledTimes(2))
    expect(
      vi.mocked(forwardDesktopBackgroundMouseEvent).mock.calls.map(([value]) => value.kind),
    ).toEqual(['down', 'cancelled'])
  })
})
