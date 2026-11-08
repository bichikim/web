/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {PTooltipContent, PTooltipProvider} from '../../tooltip'
import {installTooltipBrowser} from '../../tooltip/__tests__/support/browser'
import {PlayButton} from '../PlayButton'
import {CLASSES} from '../styles'

describe.each([false, true])('PlayButton (large: %s)', (large) => {
  let browser: ReturnType<typeof installTooltipBrowser>

  beforeEach(() => {
    browser = installTooltipBrowser()
    vi.stubGlobal('CSS', {supports: () => false})
  })

  afterEach(() => {
    cleanup()
    browser.restore()
    vi.useRealTimers()
  })

  it('should preserve media classes, slots and native tooltip suppression without a wrapper', () => {
    const onPause = vi.fn()
    const result = render(() => <PlayButton hasTrack large={large} onPause={onPause} />)
    const button = result.getByLabelText('재생')

    expect(result.container.children).toHaveLength(1)
    expect(button.tagName).toBe('MEDIA-PLAY-BUTTON')
    expect(button.className).toBe(
      `${CLASSES.playerPlay} ${large ? CLASSES.playerPlayLarge : 'shrink-0'}`,
    )
    expect(button).toHaveAttribute('notooltip', '')
    expect(Reflect.get(button, 'disabled')).toBe(false)
    expect(button).not.toHaveAttribute('aria-busy')
    expect(button.children).toHaveLength(2)
    expect(button.querySelector('[slot="play"]')).toHaveClass('i-tabler-player-play', 'size-6')
    expect(button.querySelector('[slot="pause"]')).toHaveClass('i-tabler-player-pause', 'size-6')
    fireEvent.click(button)
    expect(onPause).not.toHaveBeenCalled()
  })

  it('should update the media accessible name and active tooltip without replacing the control', () => {
    const [playing, setPlaying] = createSignal(false)
    const result = render(() => (
      <PTooltipProvider>
        <PlayButton hasTrack isPlaying={playing()} large={large} />
      </PTooltipProvider>
    ))
    const button = result.getByLabelText('재생')
    browser.setVisibleFocus(button)
    fireEvent.focus(button)
    expect(button).toHaveAttribute('title', '재생')
    setPlaying(true)
    expect(result.getByLabelText('일시 정지')).toBe(button)
    expect(button).toHaveAttribute('title', '일시 정지')
    setPlaying(false)
    expect(result.getByLabelText('재생')).toBe(button)
    expect(button).toHaveAttribute('title', '재생')
    fireEvent.blur(button)
    expect(button).not.toHaveAttribute('title')
  })

  it.each([false, true])(
    'should disable media only for an absent track (hasTrack: %s)',
    (hasTrack) => {
      const result = render(() => <PlayButton hasTrack={hasTrack} large={large} />)
      expect(Reflect.get(result.getByLabelText('재생'), 'disabled')).toBe(!hasTrack)
    },
  )

  it('should update track availability and scribble slots on the existing media control', () => {
    const [hasTrack, setTrack] = createSignal(false)
    const [scribble, setScribble] = createSignal(false)
    const result = render(() => (
      <PlayButton
        hasTrack={hasTrack()}
        large={large}
        sceneStyle={scribble() ? 'scribble' : 'original'}
      />
    ))
    const button = result.getByLabelText('재생')
    expect(Reflect.get(button, 'disabled')).toBe(true)
    setTrack(true)
    setScribble(true)
    expect(result.getByLabelText('재생')).toBe(button)
    expect(Reflect.get(button, 'disabled')).toBe(false)
    expect(button.querySelector('[slot="play"]')).toHaveClass('i-pomo-scribble:play')
    expect(button.querySelector('[slot="pause"]')).toHaveClass('i-pomo-scribble:pause')
    setTrack(false)
    expect(Reflect.get(button, 'disabled')).toBe(true)
  })

  it.each([
    [false, false],
    [false, true],
    [true, false],
    [true, true],
  ])(
    'should gate preparation cancellation by track and callback (%s, %s)',
    (hasTrack, callback) => {
      const onPause = vi.fn()
      const result = render(() => (
        <PlayButton
          hasTrack={hasTrack}
          isPreparing
          large={large}
          onPause={callback ? onPause : undefined}
        />
      ))
      const button = result.getByRole('button', {name: '일시 정지'})

      expect(result.container.children).toHaveLength(1)
      expect(button).toHaveAttribute('type', 'button')
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button.className).toBe(
        `${CLASSES.playerPlay} ${large ? `${CLASSES.playerPlayLarge} ` : ''}` +
          'relative grid shrink-0 place-items-center rounded-full border-0 p-0',
      )
      expect(button.children).toHaveLength(1)
      expect(button.firstElementChild).toHaveClass('i-tabler-player-pause', 'size-6')
      expect(button.firstElementChild).not.toHaveAttribute('slot')
      expect(button.hasAttribute('disabled')).toBe(!hasTrack || !callback)
      fireEvent.click(button)
      expect(onPause).toHaveBeenCalledTimes(hasTrack && callback ? 1 : 0)
    },
  )

  it('should read replacement and removed callbacks on the mounted preparing button', () => {
    const first = vi.fn()
    const second = vi.fn()
    const [callback, setCallback] = createSignal<(() => void) | undefined>(first)
    const result = render(() => (
      <PlayButton hasTrack isPreparing large={large} onPause={callback()} />
    ))
    const button = result.getByRole('button', {name: '일시 정지'})
    fireEvent.click(button)
    setCallback(() => second)
    expect(result.getByRole('button', {name: '일시 정지'})).toBe(button)
    fireEvent.click(button)
    expect(first).toHaveBeenCalledOnce()
    expect(second).toHaveBeenCalledOnce()
    setCallback(undefined)
    expect(button).toBeDisabled()
    fireEvent.click(button)
    expect(second).toHaveBeenCalledOnce()
  })

  it('should hand the tooltip target between both branches and clean detached targets', () => {
    const [preparing, setPreparing] = createSignal(false)
    const result = render(() => (
      <PTooltipProvider>
        <PlayButton hasTrack isPreparing={preparing()} large={large} onPause={vi.fn()} />
      </PTooltipProvider>
    ))
    const media = result.getByLabelText('재생')
    browser.setVisibleFocus(media)
    fireEvent.focus(media)
    expect(media).toHaveAttribute('title', '재생')
    setPreparing(true)
    const preparingButton = result.getByRole('button', {name: '일시 정지'})
    expect(media.isConnected).toBe(false)
    expect(media).not.toHaveAttribute('title')
    expect(preparingButton).toHaveAttribute('title', '일시 정지')
    setPreparing(false)
    const resumed = result.getByLabelText('재생')
    expect(resumed.tagName).toBe('MEDIA-PLAY-BUTTON')
    expect(resumed).toHaveAttribute('title', '재생')
    expect(preparingButton.isConnected).toBe(false)
    expect(preparingButton).not.toHaveAttribute('title')
    result.unmount()
    expect(resumed).not.toHaveAttribute('title')
  })

  it('should cancel tooltip opening on leave, pointer down, blur and disposal', () => {
    vi.useFakeTimers()
    const result = render(() => (
      <PTooltipProvider>
        <PlayButton hasTrack large={large} />
      </PTooltipProvider>
    ))
    const button = result.getByLabelText('재생')
    fireEvent.pointerEnter(button)
    vi.advanceTimersByTime(399)
    expect(button).not.toHaveAttribute('title')
    fireEvent.pointerLeave(button)
    vi.advanceTimersByTime(1)
    expect(button).not.toHaveAttribute('title')
    fireEvent.pointerEnter(button)
    vi.advanceTimersByTime(400)
    expect(button).toHaveAttribute('title', '재생')
    fireEvent.pointerDown(button)
    expect(button).not.toHaveAttribute('title')
    browser.setVisibleFocus(button)
    fireEvent.focus(button)
    expect(button).toHaveAttribute('title', '재생')
    fireEvent.blur(button)
    expect(button).not.toHaveAttribute('title')
    fireEvent.pointerEnter(button)
    result.unmount()
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(400)
    expect(button).not.toHaveAttribute('title')
  })

  it('should retarget the shared popover description and release it on disposal', () => {
    vi.stubGlobal('CSS', {supports: () => true})
    const [preparing, setPreparing] = createSignal(false)
    const result = render(() => (
      <PTooltipProvider>
        <PlayButton hasTrack isPreparing={preparing()} large={large} onPause={vi.fn()} />
        <PTooltipContent />
      </PTooltipProvider>
    ))
    const media = result.getByLabelText('재생')
    browser.setVisibleFocus(media)
    fireEvent.focus(media)
    const tooltip = screen.getByRole('tooltip')
    expect(media).toHaveAttribute('aria-describedby', tooltip.id)
    expect(tooltip).toHaveTextContent('재생')
    setPreparing(true)
    const native = result.getByRole('button', {name: '일시 정지'})
    expect(media).not.toHaveAttribute('aria-describedby')
    browser.setVisibleFocus(native)
    fireEvent.focus(native)
    expect(native).toHaveAttribute('aria-describedby', tooltip.id)
    expect(tooltip).toHaveTextContent('일시 정지')
    setPreparing(false)
    const restored = result.getByLabelText('재생')
    expect(native).not.toHaveAttribute('aria-describedby')
    browser.setVisibleFocus(restored)
    fireEvent.focus(restored)
    expect(restored).toHaveAttribute('aria-describedby', tooltip.id)
    result.unmount()
    expect(restored).not.toHaveAttribute('aria-describedby')
    expect(tooltip.isConnected).toBe(false)
  })
})
