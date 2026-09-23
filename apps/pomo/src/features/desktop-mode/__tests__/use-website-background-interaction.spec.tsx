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
})
