/** @vitest-environment jsdom */

import {cleanup, render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import type {PSceneStyle} from '../../features/focus-room-animation'
import {MusicPlayerView} from '../MusicPlayerView'

vi.mock('media-chrome', () => ({}))

const TRACKS = [
  {artist: 'Artist', durationSeconds: 1, id: 'one', source: '/one.mp3', title: 'One'},
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

interface RenderMusicPlayerViewOptions {
  readonly expanded?: boolean
  readonly sceneStyle?: PSceneStyle
}

const renderMusicPlayerView = (options: RenderMusicPlayerViewOptions = {}) =>
  render(() => (
    <MusicPlayerView
      currentIndex={0}
      currentTrack={TRACKS[0]}
      expanded={options.expanded ?? true}
      isPlaying={false}
      levels={[]}
      onAudioElement={vi.fn()}
      onExpandedChange={vi.fn()}
      onNextTrack={vi.fn()}
      onPreviousTrack={vi.fn()}
      onRepeatModeChange={vi.fn()}
      onShuffleChange={vi.fn()}
      onTrackSelect={vi.fn()}
      repeatMode="repeat-all"
      sceneStyle={options.sceneStyle ?? 'original'}
      shuffleEnabled={true}
      tracks={TRACKS}
    />
  ))

const getProgressRanges = (container: HTMLElement) => {
  const collapsedRange = container.querySelector('.pomo-player__progress--collapsed')
  const expandedRange = container.querySelector('.pomo-player__progress--expanded')

  if (!(collapsedRange instanceof HTMLElement) || !(expandedRange instanceof HTMLElement)) {
    throw new TypeError('Expected both Pomo progress ranges to be rendered')
  }

  return {collapsedRange, expandedRange}
}

describe('MusicPlayerView', () => {
  afterEach(() => cleanup())

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
    expect(collapsedRange.classList.contains('[--media-range-bar-color:rgb(0_0_0_/_25%)]')).toBe(
      true,
    )
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

  it('should use native titles for every player button', () => {
    const result = renderMusicPlayerView()
    const controller = result.container.querySelector('media-controller')

    if (!(controller instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo media controller to be rendered')
    }

    const buttons = controller.querySelectorAll('button, media-play-button, media-mute-button')
    const mediaButtons = controller.querySelectorAll('media-play-button, media-mute-button')

    expect(buttons.length).toBeGreaterThan(0)
    for (const button of buttons) {
      expect(button.getAttribute('title')?.trim()).toBeTruthy()
    }
    for (const button of mediaButtons) {
      expect(button.hasAttribute('notooltip')).toBe(true)
    }
    expect(controller.querySelector('media-mute-button')?.getAttribute('title')).toBe(
      '음소거 켜기/끄기',
    )
    expect(
      controller.querySelector('[aria-label="앨범 추가"]')?.getAttribute('data-player-utility'),
    ).toBe('album')
    expect(
      controller.querySelector('[aria-label="플레이어 접기"]')?.getAttribute('data-player-utility'),
    ).toBe('expand')
  })

  it('should keep the summary play button stationary on hover', () => {
    const result = renderMusicPlayerView()
    const summaryPlayButton = result.container.querySelector('.pomo-player__play--summary')
    const expandedPlayButton = result.container.querySelector('.pomo-player__play--large')

    if (
      !(summaryPlayButton instanceof HTMLElement) ||
      !(expandedPlayButton instanceof HTMLElement)
    ) {
      throw new TypeError('Expected the Pomo play buttons to be rendered')
    }

    expect(summaryPlayButton.classList.contains('[&:hover]:translate-y-[-1px]')).toBe(false)
    expect(summaryPlayButton.classList.contains('[transition:filter_160ms_ease]')).toBe(true)
    expect(expandedPlayButton.classList.contains('[&:hover]:translate-y-[-1px]')).toBe(true)
    expect(
      expandedPlayButton.classList.contains('[transition:transform_160ms_ease,_filter_160ms_ease]'),
    ).toBe(true)
  })

  it('should marquee the current track labels in the summary and playlist', () => {
    const result = renderMusicPlayerView()
    const summaryMarquees = result.container.querySelectorAll(
      '.pomo-player__title .pomo-overflow-marquee',
    )
    const currentTrackMarquees = result.container.querySelectorAll(
      ".pomo-player__track[aria-current='true'] .pomo-overflow-marquee",
    )
    const idleTrackMarquees = result.container.querySelectorAll(
      ".pomo-player__track:not([aria-current='true']) .pomo-overflow-marquee",
    )

    expect(summaryMarquees).toHaveLength(2)
    expect(currentTrackMarquees).toHaveLength(2)
    expect(idleTrackMarquees).toHaveLength(0)
    expect(currentTrackMarquees[0]?.hasAttribute('tabindex')).toBe(false)
    expect(currentTrackMarquees[1]?.hasAttribute('tabindex')).toBe(false)
    expect(
      result.container
        .querySelector(".pomo-player__track[aria-current='true']")
        ?.classList.contains('group'),
    ).toBe(true)
  })

  it('should reveal the volume thumb only while interacting with the range', () => {
    const result = renderMusicPlayerView()
    const muteButton = result.container.querySelector('media-mute-button')
    const volumeRange = result.container.querySelector('media-volume-range')
    const volumeGroup = result.container.querySelector('.pomo-player__volume-group')

    if (
      !(muteButton instanceof HTMLElement) ||
      !(volumeRange instanceof HTMLElement) ||
      !(volumeGroup instanceof HTMLElement)
    ) {
      throw new TypeError('Expected the Pomo volume controls to be rendered')
    }

    expect(volumeGroup.classList.contains('gap-0')).toBe(true)
    expect(muteButton.classList.contains('size-10')).toBe(true)
    expect(muteButton.classList.contains('player-compact:size-9')).toBe(true)
    expect(muteButton.classList.contains('[--media-control-padding:0.625rem]')).toBe(true)
    expect(volumeRange.classList.contains('pomo-player__volume')).toBe(true)
    expect(volumeRange.classList.contains('max-sm:hidden')).toBe(false)
    expect(volumeRange.getAttribute('aria-label')).toBe('음량 조절')
    expect(volumeRange.getAttribute('title')).toBe('음량 조절')
    expect(volumeRange.classList.contains('w-[clamp(3rem,_18cqi,_4.75rem)]')).toBe(true)
    expect(volumeRange.classList.contains('[--media-range-padding-left:0.25rem]')).toBe(true)
    expect(volumeRange.classList.contains('[--media-range-padding-right:0.25rem]')).toBe(true)
    expect(volumeRange.classList.contains('[--media-range-thumb-opacity:0]')).toBe(true)
    expect(volumeRange.classList.contains('hover:[--media-range-thumb-opacity:1]')).toBe(true)
    expect(volumeRange.classList.contains('focus-within:[--media-range-thumb-opacity:1]')).toBe(
      true,
    )
    expect(
      volumeRange.classList.contains('motion-reduce:[--media-range-thumb-transition:none]'),
    ).toBe(true)
  })

  it('should constrain and wrap expanded controls on narrow screens', () => {
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
    expect(
      controls.classList.contains('player-compact:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]'),
    ).toBe(true)
    expect(controls.classList.contains('player-compact:px-0')).toBe(true)
    expect(expandedPanel.classList.contains('player-compact:pt-2')).toBe(true)
    expect(playlist.classList.contains('min-h-0')).toBe(true)
    expect(playlist.classList.contains('flex-1')).toBe(true)
    expect(playlist.classList.contains('player-compact:mt-2')).toBe(true)
    expect(track.classList.contains('player-compact:gap-2')).toBe(true)
    expect(track.classList.contains('player-compact:px-2')).toBe(true)
    expect(track.classList.contains('player-compact:py-2')).toBe(true)
    expect(transport.classList.contains('player-compact:col-span-2')).toBe(true)
    expect(volumeGroup.classList.contains('player-compact:row-start-2')).toBe(true)
  })
})
