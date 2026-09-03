import {fireEvent, render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {VolumeControl} from '../VolumeControl'

describe('VolumeControl', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('moves volume adjustment into a popover on narrow players', () => {
    const {container} = render(() => <VolumeControl />)
    const inlineMute = container.querySelector('media-mute-button')
    const ranges = container.querySelectorAll('media-volume-range')
    const trigger = container.querySelector<HTMLButtonElement>(
      '.pomo-player__volume-popover-trigger',
    )
    const popover = container.querySelector<HTMLElement>('.pomo-player__volume-popover')

    expect(inlineMute).toHaveClass('player-narrow:hidden')
    expect(ranges[0]).toHaveClass('player-narrow:hidden')
    expect(trigger).toHaveClass('hidden', 'player-narrow:grid')
    expect(trigger).toHaveAttribute('aria-controls', popover?.id)
    expect(trigger).toHaveAttribute('popovertarget', popover?.id)
    expect(trigger?.style.getPropertyValue('--pomo-volume-popover-anchor')).toBe(`--${popover?.id}`)
    expect(trigger?.style.anchorName).toBe('')
    expect(trigger).toHaveClass('[anchor-name:var(--pomo-volume-popover-anchor)]')
    expect(popover).toHaveAttribute('popover', 'auto')
    expect(popover).toHaveAttribute('role', 'dialog')
    expect(popover?.style.getPropertyValue('--pomo-volume-popover-anchor')).toBe(`--${popover?.id}`)
    expect(popover?.style.positionAnchor).toBe('')
    expect(popover).toHaveClass('[position-anchor:var(--pomo-volume-popover-anchor)]')
    expect(popover).toHaveClass('mt-1', 'p-2', '[position-area:bottom]')
    expect(ranges[1]).toHaveClass('pomo-player__volume-popover-range', 'h-6', 'min-w-24', 'w-24')
    expect(ranges[1]).toHaveClass('[--media-control-padding:0]')
    expect(ranges[1]).toHaveAttribute('autofocus')
  })

  it('uses the scene icon at the same visual size as the other controls', () => {
    const {container} = render(() => <VolumeControl sceneStyle="scribble" />)
    const triggerIcon = container.querySelector(
      '.pomo-player__volume-popover-trigger .i-pomo-scribble\\:volume-medium',
    )

    expect(triggerIcon).toHaveClass('size-6')
  })

  it('opens the popover only after the volume trigger is selected', () => {
    const {container} = render(() => <VolumeControl />)
    const trigger = container.querySelector<HTMLButtonElement>(
      '.pomo-player__volume-popover-trigger',
    )
    const popover = container.querySelector<HTMLElement>('.pomo-player__volume-popover')

    if (trigger === null || popover === null) {
      throw new Error('Expected the volume trigger and popover.')
    }

    const showPopover = vi.fn()
    Object.defineProperty(popover, 'showPopover', {value: showPopover})
    vi.spyOn(popover, 'matches').mockReturnValue(false)

    expect(showPopover).not.toHaveBeenCalled()
    fireEvent.click(trigger)
    expect(showPopover).toHaveBeenCalledOnce()
  })

  it('closes an open popover when the narrow trigger becomes hidden', () => {
    const triggerStyle = document.createElement('div').style
    triggerStyle.display = 'none'
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(triggerStyle)
    const removeEventListener = vi.spyOn(window, 'removeEventListener')

    const {container, unmount} = render(() => <VolumeControl />)
    const popover = container.querySelector<HTMLElement>('.pomo-player__volume-popover')

    if (popover === null) {
      throw new Error('Expected the volume popover.')
    }

    const hidePopover = vi.fn()
    Object.defineProperty(popover, 'hidePopover', {value: hidePopover})
    vi.spyOn(popover, 'matches').mockReturnValue(true)

    fireEvent(window, new Event('resize'))

    expect(hidePopover).toHaveBeenCalledOnce()
    unmount()
    expect(removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('keeps an open popover when the narrow trigger remains visible during resize', () => {
    const triggerStyle = document.createElement('div').style
    triggerStyle.display = 'grid'
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(triggerStyle)

    const {container} = render(() => <VolumeControl />)
    const popover = container.querySelector<HTMLElement>('.pomo-player__volume-popover')

    if (popover === null) {
      throw new Error('Expected the volume popover.')
    }

    const hidePopover = vi.fn()
    Object.defineProperty(popover, 'hidePopover', {value: hidePopover})
    vi.spyOn(popover, 'matches').mockReturnValue(true)

    fireEvent(window, new Event('resize'))

    expect(hidePopover).not.toHaveBeenCalled()
  })
})
