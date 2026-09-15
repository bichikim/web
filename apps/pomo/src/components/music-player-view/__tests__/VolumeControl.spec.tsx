/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {VolumeControl} from '../VolumeControl'

import {installTooltipBrowser} from '../../tooltip/__tests__/support/browser'

describe('VolumeControl', () => {
  let browser: ReturnType<typeof installTooltipBrowser>
  beforeEach(() => {
    browser = installTooltipBrowser()
    vi.stubGlobal('CSS', {supports: () => false})
  })

  afterEach(() => {
    cleanup()
    browser.restore()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('should use only popover volume adjustment at every player width', () => {
    const view = render(() => <VolumeControl />)
    const {container} = view
    const inlineMute = container.querySelector('media-mute-button')
    const ranges = container.querySelectorAll<HTMLElement>('media-volume-range')
    const trigger = view.getByRole('button', {name: '음량 조절'})
    const popover = view.getByRole('dialog', {hidden: true, name: '음량 조절'})

    expect(inlineMute).toBeNull()
    expect(ranges).toHaveLength(1)
    expect(trigger).toHaveClass('grid')
    expect(trigger).not.toHaveClass('hidden', 'player-narrow:grid')
    expect(trigger).toHaveAttribute('aria-controls', popover?.id)
    expect(trigger).toHaveAttribute('popovertarget', popover?.id)
    expect(trigger?.style.getPropertyValue('--pomo-volume-popover-anchor')).toBe(`--${popover?.id}`)
    expect(trigger?.style.anchorName).toBe('')
    expect(trigger).toHaveClass('[anchor-name:var(--pomo-volume-popover-anchor)]')
    expect(trigger).toHaveAttribute('aria-label', '음량 조절')
    expect(trigger).not.toHaveAttribute('data-pomo-tooltip-trigger')
    expect(popover).toHaveAttribute('popover', 'auto')
    expect(popover).toHaveAttribute('role', 'dialog')
    expect(popover?.style.getPropertyValue('--pomo-volume-popover-anchor')).toBe(`--${popover?.id}`)
    expect(popover?.style.positionAnchor).toBe('')
    expect(popover).toHaveClass('[position-anchor:var(--pomo-volume-popover-anchor)]')
    expect(popover).toHaveClass('mt-1', 'p-2', '[position-area:bottom]')
    expect(ranges[0]).toHaveClass('h-6', 'min-w-24', 'w-24')
    expect(ranges[0]).toHaveClass('[--media-control-padding:0]')
    expect(ranges[0]).toHaveAttribute('autofocus')
  })

  it('should use the scene icon at the same visual size as the other controls', () => {
    const view = render(() => <VolumeControl sceneStyle="scribble" />)
    const triggerIcon = view
      .getByRole('button', {name: '음량 조절'})
      .querySelector('[aria-hidden="true"]')

    expect(triggerIcon).toHaveClass('size-6', 'flex-none')
  })

  it('should open the popover only after the volume trigger is selected', () => {
    const view = render(() => <VolumeControl />)
    const trigger = view.getByRole('button', {name: '음량 조절'})
    const popover = view.getByRole('dialog', {hidden: true, name: '음량 조절'})

    const showPopover = vi.fn()
    Object.defineProperty(popover, 'showPopover', {value: showPopover})
    vi.spyOn(popover, 'matches').mockReturnValue(false)

    expect(showPopover).not.toHaveBeenCalled()
    fireEvent.click(trigger)
    expect(showPopover).toHaveBeenCalledOnce()
  })

  it('should keep an open popover during resize', () => {
    const triggerStyle = document.createElement('div').style
    triggerStyle.display = 'grid'
    vi.spyOn(window, 'getComputedStyle').mockReturnValue(triggerStyle)

    const view = render(() => <VolumeControl />)
    const popover = view.getByRole('dialog', {hidden: true, name: '음량 조절'})

    const hidePopover = vi.fn()
    Object.defineProperty(popover, 'hidePopover', {value: hidePopover})
    vi.spyOn(popover, 'matches').mockReturnValue(true)

    fireEvent(window, new Event('resize'))

    expect(hidePopover).not.toHaveBeenCalled()
  })
})
