/** @vitest-environment jsdom */

import {cleanup, fireEvent} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import {
  getAddedAlbumTracks,
  getProgressRanges,
  getStopAlbumPreview,
  renderMusicPlayerView,
} from './music-player-view.test-support'

describe('MusicPlayerView', () => {
  afterEach(() => cleanup())

  it('should render the current track artwork only in the expanded player', () => {
    const collapsedResult = renderMusicPlayerView({expanded: false})

    expect(collapsedResult.container.querySelector('.pomo-player__artwork')).toBeNull()

    cleanup()

    const expandedResult = renderMusicPlayerView()
    const artwork = expandedResult.container.querySelector('.pomo-player__artwork')

    expect(artwork).toBeInstanceOf(HTMLImageElement)
    expect(artwork?.getAttribute('src')).toBe('/audio/artwork/one.jpg')
    expect(artwork?.getAttribute('alt')).toBe('')
  })

  it('should hide failed artwork requests', () => {
    const result = renderMusicPlayerView()
    const artwork = result.container.querySelector('.pomo-player__artwork')

    if (!(artwork instanceof HTMLImageElement)) {
      throw new TypeError('Expected the current track artwork to be rendered')
    }

    fireEvent.error(artwork)

    expect(artwork.hidden).toBe(true)
  })

  it('should forward album and expanded player control events', () => {
    const onAlbumAdd = vi.fn()
    const onAlbumClear = vi.fn()
    const onAudioElement = vi.fn()
    const onExpandedChange = vi.fn()
    const onNextTrack = vi.fn()
    const onPreviewEnd = vi.fn()
    const onPreviewStart = vi.fn()
    const onPreviousTrack = vi.fn()
    const onRepeatModeChange = vi.fn()
    const onShuffleChange = vi.fn()
    const onTrackSelect = vi.fn()
    const result = renderMusicPlayerView({
      onAlbumAdd,
      onAlbumClear,
      onAudioElement,
      onExpandedChange,
      onNextTrack,
      onPreviewEnd,
      onPreviewStart,
      onPreviousTrack,
      onRepeatModeChange,
      onShuffleChange,
      onTrackSelect,
    })
    const expandButton = result.container.querySelector('[data-player-utility="expand"]')
    const modeButtons = result.container.querySelectorAll('.pomo-player__modes button')
    const transportButtons = result.container.querySelectorAll('.pomo-player__transport button')
    const trackButtons = result.container.querySelectorAll('button.pomo-player__track')

    if (
      !(expandButton instanceof HTMLButtonElement) ||
      modeButtons.length !== 3 ||
      transportButtons.length !== 2 ||
      trackButtons.length !== 2
    ) {
      throw new TypeError('Expected the Pomo player controls to be rendered')
    }

    fireEvent.click(result.getByRole('button', {name: '앨범 추가'}))
    fireEvent.click(result.getByTestId('album-clear'))
    fireEvent.click(result.getByTestId('album-preview-start'))
    fireEvent.click(result.getByTestId('album-preview-end'))
    fireEvent.click(expandButton)
    fireEvent.click(modeButtons[0]!)
    fireEvent.click(modeButtons[1]!)
    fireEvent.click(modeButtons[2]!)
    fireEvent.click(transportButtons[0]!)
    fireEvent.click(transportButtons[1]!)
    fireEvent.click(trackButtons[1]!)

    expect(onAlbumAdd).toHaveBeenCalledWith(getAddedAlbumTracks())
    expect(onAudioElement.mock.calls[0]?.[0]).toBe(result.container.querySelector('audio'))
    expect(result.getByTestId('album-track-count')).toHaveTextContent('2')
    expect(onAlbumClear).toHaveBeenCalledOnce()
    expect(onPreviewStart).toHaveBeenCalledWith(getStopAlbumPreview())
    expect(onPreviewEnd).toHaveBeenCalledOnce()
    expect(onExpandedChange).toHaveBeenCalledOnce()
    expect(onRepeatModeChange).toHaveBeenNthCalledWith(1, 'repeat-all')
    expect(onRepeatModeChange).toHaveBeenNthCalledWith(2, 'repeat-one')
    expect(onShuffleChange).toHaveBeenCalledOnce()
    expect(onPreviousTrack).toHaveBeenCalledOnce()
    expect(onNextTrack).toHaveBeenCalledOnce()
    expect(onTrackSelect).toHaveBeenCalledWith(1)

    cleanup()

    const withoutAlbumAdd = renderMusicPlayerView()

    expect(() =>
      fireEvent.click(withoutAlbumAdd.getByRole('button', {name: '앨범 추가'})),
    ).not.toThrow()
  })

  it('should show audio levels and fallback labels for an absent current track', () => {
    const idleResult = renderMusicPlayerView({currentTrack: null, levels: [25, 75]})
    const idleLevels = idleResult.container.querySelectorAll('.pomo-level')
    const summaryLabels = idleResult.container.querySelectorAll(
      '.pomo-player__title .pomo-overflow-marquee',
    )

    expect(idleLevels).toHaveLength(2)
    expect(idleLevels[0]?.getAttribute('style')).toContain('height: 25%')
    expect(idleLevels[0]?.getAttribute('style')).toContain('opacity: 0.34')
    expect(summaryLabels[0]?.textContent).toContain(m.player_fallback_title())
    expect(summaryLabels[1]?.textContent).toContain(m.player_fallback_artist())

    cleanup()

    const playingResult = renderMusicPlayerView({isPlaying: true, levels: [50]})
    const playingLevel = playingResult.container.querySelector('.pomo-level')

    expect(playingLevel?.getAttribute('style')).toContain('height: 50%')
    expect(playingLevel?.getAttribute('style')).toContain('opacity: 0.76')
  })

  it('should keep the collapsed player layers visually present but inactive', () => {
    const result = renderMusicPlayerView({expanded: false})
    const controller = result.container.querySelector('media-controller')
    const playerBase = result.container.querySelector('.pomo-player__base')
    const visualizerFrame = result.container.querySelector('.pomo-player__visualizer-frame')
    const expandedFrame = result.container.querySelector('.pomo-player__expanded-frame')
    const expandedInner = result.container.querySelector('.pomo-player__expanded-inner')

    for (const element of [controller, playerBase, visualizerFrame, expandedFrame, expandedInner]) {
      expect(element).toBeInstanceOf(HTMLElement)
    }

    expect(controller?.classList.contains('overflow-hidden')).toBe(true)
    expect(controller?.classList.contains('overflow-visible')).toBe(false)
    expect(controller?.classList.contains('pb-0.5')).toBe(true)
    expect(playerBase?.classList.contains('rounded-panel')).toBe(true)
    expect(playerBase?.classList.contains('bg-player-surface')).toBe(true)
    expect(visualizerFrame?.classList.contains('overflow-hidden')).toBe(true)
    expect(visualizerFrame?.classList.contains('rounded-panel')).toBe(true)
    expect(expandedFrame?.classList.contains('grid-rows-[0fr]')).toBe(true)
    expect(expandedFrame?.classList.contains('is-expanded')).toBe(false)
    expect(expandedFrame?.getAttribute('aria-hidden')).toBe('true')
    expect(Reflect.get(expandedFrame ?? {}, 'inert')).toBe(true)
    expect(expandedInner?.classList.contains('opacity-0')).toBe(true)
    expect(expandedInner?.classList.contains('pointer-events-none')).toBe(true)
    expect(expandedInner?.classList.contains('overflow-x-clip')).toBe(true)
    expect(expandedInner?.classList.contains('overflow-y-auto')).toBe(true)
    expect(expandedInner?.classList.contains('overscroll-contain')).toBe(true)
    expect(expandedInner?.classList.contains('is-expanded')).toBe(false)
  })

  it('should disable both progress ranges while collapsed', () => {
    const result = renderMusicPlayerView({expanded: false})
    const {collapsedRange, expandedRange} = getProgressRanges(result.container)

    expect(result.container.querySelectorAll('media-time-range')).toHaveLength(2)
    expect(collapsedRange.classList.contains('flex')).toBe(true)
    expect(collapsedRange.classList.contains('absolute')).toBe(true)
    expect(collapsedRange.classList.contains('inset-0')).toBe(true)
    expect(collapsedRange.classList.contains('h-full')).toBe(true)
    expect(collapsedRange.classList.contains('w-full')).toBe(true)
    expect(collapsedRange.classList.contains('pointer-events-none')).toBe(true)
    expect(collapsedRange.classList.contains('cursor-default')).toBe(true)
    expect(collapsedRange.classList.contains('[--media-cursor:default]')).toBe(true)
    expect(collapsedRange.classList.contains('is-hidden')).toBe(false)
    expect(collapsedRange.hasAttribute('disabled')).toBe(true)
    expect(collapsedRange.getAttribute('aria-hidden')).toBe('true')
    expect(collapsedRange.classList.contains('[--media-range-track-height:100%]')).toBe(true)
    expect(
      collapsedRange.classList.contains(
        '[--media-range-bar-color:var(--pomo-color-player-progress)]',
      ),
    ).toBe(true)
    expect(
      collapsedRange.classList.contains('[--media-time-range-buffered-color:transparent]'),
    ).toBe(true)
    expect(collapsedRange.classList.contains('[--media-range-track-background:transparent]')).toBe(
      true,
    )
    expect(collapsedRange.classList.contains('[--media-range-padding:0px]')).toBe(true)
    expect(collapsedRange.classList.contains('[--media-range-thumb-opacity:0]')).toBe(true)
    expect(collapsedRange.classList.contains('[&.is-hidden]:opacity-0')).toBe(true)
    expect(collapsedRange.classList.contains('motion-reduce:transition-none')).toBe(true)

    expect(expandedRange.hasAttribute('disabled')).toBe(true)
    expect(expandedRange.classList.contains('is-expanded')).toBe(false)
    expect(expandedRange.classList.contains('pointer-events-none')).toBe(true)
    expect(expandedRange.classList.contains('cursor-default')).toBe(true)
    expect(expandedRange.classList.contains('[--media-cursor:default]')).toBe(true)
    expect(expandedRange.getAttribute('aria-hidden')).toBe('true')
    expect(expandedRange.getAttribute('aria-label')).toBe('재생 위치 조절')
    expect(expandedRange.getAttribute('title')).toBe('재생 위치 조절')
    expect(collapsedRange.hasAttribute('title')).toBe(false)
  })

  it('should activate only the expanded progress range while expanded', () => {
    const result = renderMusicPlayerView()
    const controller = result.container.querySelector('media-controller')
    const visualizerFrame = result.container.querySelector('.pomo-player__visualizer-frame')
    const expandedFrame = result.container.querySelector('.pomo-player__expanded-frame')
    const expandedInner = result.container.querySelector('.pomo-player__expanded-inner')
    const {collapsedRange, expandedRange} = getProgressRanges(result.container)

    expect(controller?.classList.contains('overflow-hidden')).toBe(false)
    expect(controller?.classList.contains('overflow-visible')).toBe(true)
    expect(controller?.classList.contains('pb-0.5')).toBe(true)
    expect(visualizerFrame?.classList.contains('rounded-panel')).toBe(false)
    expect(visualizerFrame?.classList.contains('rounded-t-panel')).toBe(true)
    expect(collapsedRange.classList.contains('is-hidden')).toBe(true)
    expect(collapsedRange.hasAttribute('disabled')).toBe(true)
    expect(expandedFrame?.classList.contains('is-expanded')).toBe(true)
    expect(expandedFrame?.getAttribute('aria-hidden')).toBeNull()
    expect(Reflect.get(expandedFrame ?? {}, 'inert')).toBe(false)
    expect(expandedInner?.classList.contains('is-expanded')).toBe(true)
    expect(expandedRange.hasAttribute('disabled')).toBe(false)
    expect(expandedRange.classList.contains('is-expanded')).toBe(true)
    expect(expandedRange.classList.contains('pointer-events-none')).toBe(false)
    expect(expandedRange.classList.contains('cursor-default')).toBe(false)
    expect(expandedRange.classList.contains('[--media-cursor:default]')).toBe(false)
    expect(expandedRange.getAttribute('aria-hidden')).toBeNull()
    expect(expandedRange.classList.contains('[&.is-expanded]:h-0.5')).toBe(true)
    expect(expandedRange.classList.contains('overflow-visible')).toBe(true)
    expect(expandedRange.classList.contains('-mx-2')).toBe(true)
    expect(expandedRange.classList.contains('w-[calc(100%+1rem)]')).toBe(true)
    expect(expandedRange.parentElement).toBe(controller)
    expect(expandedFrame?.contains(expandedRange)).toBe(false)
    expect(
      expandedRange.classList.contains('[--media-range-bar-color:var(--pomo-color-foreground)]'),
    ).toBe(true)
    expect(
      expandedRange.classList.contains(
        '[--media-time-range-buffered-color:var(--pomo-color-muted-foreground)]',
      ),
    ).toBe(true)
    expect(
      expandedRange.classList.contains(
        '[--media-range-track-background:var(--pomo-color-range-track)]',
      ),
    ).toBe(true)
    expect(expandedRange.classList.contains('hover:[--media-range-thumb-opacity:1]')).toBe(true)
    expect(expandedRange.classList.contains('focus-within:[--media-range-thumb-opacity:1]')).toBe(
      true,
    )
  })

  it('should replace the regular frame only in scribble style', () => {
    const originalResult = renderMusicPlayerView()
    const originalBase = originalResult.container.querySelector('.pomo-player__base')
    const originalController = originalResult.container.querySelector('media-controller')

    expect(originalResult.container.querySelector('.pomo-player__scribble-border')).toBeNull()
    expect(
      originalController?.classList.contains('[mask-image:var(--pomo-player-scribble-mask)]'),
    ).toBe(false)
    expect(originalController?.classList.contains('rounded-panel')).toBe(true)
    expect(originalController?.classList.contains('rounded-none')).toBe(false)
    expect(originalBase?.classList.contains('border-border')).toBe(true)
    expect(originalBase?.classList.contains('border-transparent')).toBe(false)

    cleanup()
    const scribbleResult = renderMusicPlayerView({sceneStyle: 'scribble'})
    const scribbleBase = scribbleResult.container.querySelector('.pomo-player__base')
    const scribbleBorder = scribbleResult.container.querySelector('.pomo-player__scribble-border')
    const scribbleFrame = scribbleResult.container.querySelector('.pomo-player-frame')
    const scribbleController = scribbleResult.container.querySelector('media-controller')

    expect(scribbleBorder).toBeInstanceOf(SVGElement)
    expect(scribbleBorder?.getAttribute('aria-hidden')).toBe('true')
    expect(scribbleBorder?.querySelectorAll('path')).toHaveLength(2)
    expect(scribbleBorder?.querySelectorAll('path')[0]?.getAttribute('stroke-width')).toBe('6')
    expect(scribbleBorder?.querySelectorAll('path')[1]?.getAttribute('stroke-width')).toBe('3')
    expect(scribbleBorder?.parentElement).toBe(scribbleFrame)
    expect(scribbleController?.contains(scribbleBorder)).toBe(false)
    expect(
      scribbleController?.classList.contains('[mask-image:var(--pomo-player-scribble-mask)]'),
    ).toBe(true)
    expect(
      (scribbleController as HTMLElement).style.getPropertyValue('--pomo-player-scribble-mask'),
    ).toContain('data:image/svg+xml')
    expect(scribbleController?.classList.contains('rounded-none')).toBe(true)
    expect(scribbleController?.classList.contains('rounded-panel')).toBe(false)
    expect(scribbleBase?.classList.contains('border-transparent')).toBe(true)
    expect(scribbleBase?.classList.contains('border-border')).toBe(false)
  })

  it('should replace player controls only in scribble style', () => {
    const originalResult = renderMusicPlayerView()

    expect(originalResult.container.querySelector('.i-tabler-player-play')).toBeInstanceOf(
      HTMLElement,
    )
    expect(originalResult.container.querySelector('.i-pomo-scribble\\:play')).toBeNull()
    expect(originalResult.container.querySelector('.i-tabler-album')).toBeInstanceOf(HTMLElement)
    expect(originalResult.container.querySelector('.i-pomo-scribble\\:album')).toBeNull()
    expect(
      originalResult.container.querySelectorAll('.pomo-player__play-scribble-frame svg'),
    ).toHaveLength(0)

    cleanup()
    const scribbleResult = renderMusicPlayerView({sceneStyle: 'scribble'})

    expect(scribbleResult.container.querySelector('.i-pomo-scribble\\:play')).toBeInstanceOf(
      HTMLElement,
    )
    expect(scribbleResult.container.querySelector('.i-pomo-scribble\\:repeat')).toBeInstanceOf(
      HTMLElement,
    )
    expect(scribbleResult.container.querySelector('.i-pomo-scribble\\:shuffle')).toBeInstanceOf(
      HTMLElement,
    )
    expect(scribbleResult.container.querySelector('.i-pomo-scribble\\:album')).toBeInstanceOf(
      HTMLElement,
    )
    expect(scribbleResult.container.querySelector('.i-tabler-player-play')).toBeNull()
    expect(scribbleResult.container.querySelector('.i-tabler-album')).toBeNull()
    expect(
      scribbleResult.container.querySelectorAll('.pomo-player__play-scribble-frame svg'),
    ).toHaveLength(2)
  })

  it('should constrain expanded content and keep compact controls in one row', () => {
    const result = renderMusicPlayerView()
    const controller = result.container.querySelector('media-controller') as HTMLElement
    const expandedFrame = result.container.querySelector(
      '.pomo-player__expanded-frame',
    ) as HTMLElement
    const expandedInner = result.container.querySelector(
      '.pomo-player__expanded-inner',
    ) as HTMLElement
    const expandedPanel = result.container.querySelector('.pomo-player__expanded') as HTMLElement
    const controls = result.container.querySelector(
      '.pomo-player__expanded-controls',
    ) as HTMLElement
    const playlist = result.container.querySelector('.pomo-player__playlist') as HTMLElement
    const track = result.container.querySelector('.pomo-player__track') as HTMLElement
    const modes = result.container.querySelector('.pomo-player__modes') as HTMLElement
    const transport = result.container.querySelector('.pomo-player__transport') as HTMLElement
    const volumeGroup = result.container.querySelector('.pomo-player__volume-group') as HTMLElement

    for (const element of [
      controller,
      expandedFrame,
      expandedInner,
      expandedPanel,
      controls,
      playlist,
      track,
      modes,
      transport,
      volumeGroup,
    ]) {
      expect(element).toBeInstanceOf(HTMLElement)
    }

    expect(controller.classList.contains('flex')).toBe(true)
    expect(controller.classList.contains('h-full')).toBe(true)
    expect(controller.classList.contains('max-h-full')).toBe(true)
    expect(expandedFrame.classList.contains('min-w-0')).toBe(true)
    expect(expandedFrame.classList.contains('flex-1')).toBe(true)
    expect(expandedFrame.classList.contains('overflow-hidden')).toBe(true)
    expect(
      expandedFrame.classList.contains(
        '[&.is-expanded]:h-[calc(100cqh_-_var(--pomo-player-summary-space))]',
      ),
    ).toBe(true)
    expect(expandedInner.classList.contains('min-w-0')).toBe(true)
    expect(expandedInner.classList.contains('w-full')).toBe(true)
    expect(expandedInner.classList.contains('flex-col')).toBe(true)
    expect(expandedPanel.classList.contains('box-border')).toBe(true)
    expect(expandedPanel.classList.contains('w-full')).toBe(true)
    expect(expandedPanel.classList.contains('flex-1')).toBe(true)
    expect(controls.classList.contains('grid-cols-[1fr_auto_1fr]')).toBe(true)
    expect(
      controls.classList.contains('player-compact:grid-cols-[max-content_max-content_max-content]'),
    ).toBe(true)
    expect(controls.classList.contains('player-compact:justify-evenly')).toBe(true)
    expect(controls.classList.contains('player-compact:gap-1')).toBe(true)
    expect(controls.classList.contains('px-1')).toBe(true)
    expect(expandedPanel.classList.contains('player-compact:pt-2')).toBe(true)
    expect(playlist.classList.contains('min-h-0')).toBe(true)
    expect(playlist.classList.contains('flex-1')).toBe(true)
    expect(playlist.classList.contains('player-compact:mt-2')).toBe(true)
    expect(playlist.classList.contains('player-compact:max-h-none')).toBe(true)
    expect(track.classList.contains('player-compact:gap-2')).toBe(true)
    expect(track.classList.contains('player-compact:px-2')).toBe(true)
    expect(track.classList.contains('player-compact:py-1.5')).toBe(true)
    expect(modes.classList.contains('gap-0.5')).toBe(true)
    expect(modes.classList.contains('p-1')).toBe(true)
    expect(modes.classList.contains('player-narrow:gap-0')).toBe(true)
    expect(modes.classList.contains('player-narrow:p-0.5')).toBe(true)
    expect(modes.querySelector('.h-5.w-px')).toHaveClass('player-narrow:mx-0')
    expect(transport.classList.contains('gap-1')).toBe(true)
    expect(transport.classList.contains('player-compact:col-span-2')).toBe(false)
    expect(volumeGroup.classList.contains('player-compact:row-start-2')).toBe(false)
  })
})
