/** @vitest-environment jsdom */

import {cleanup, fireEvent, render} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'

import type {PSceneStyle} from '../../features/focus-room-animation'
import type {PTrack} from '../../features/focus-room-audio'
import * as m from '@paraglide/message'
import type {PAlbumLibraryProps} from '../PAlbumLibrary'
import {MusicPlayerView} from '../MusicPlayerView'

vi.mock('media-chrome', () => ({}))

const albumLibraryMocks = vi.hoisted(() => ({
  addedTracks: [
    {
      artist: 'Album Artist',
      durationSeconds: 1,
      id: 'album-track',
      source: '/album-track.mp3',
      title: 'Album Track',
    },
  ] as const,
  stopPreview: vi.fn(),
}))

vi.mock('../PAlbumLibrary', () => ({
  PAlbumLibrary: (props: PAlbumLibraryProps) => (
    <>
      <button
        aria-label="앨범 추가"
        data-player-utility="album"
        onClick={() => props.onAddTracks(albumLibraryMocks.addedTracks)}
        title="앨범 추가"
        type="button"
      >
        <span
          aria-hidden="true"
          class={props.sceneStyle === 'scribble' ? 'i-pomo-scribble:album' : 'i-tabler-album'}
        />
      </button>
      <button
        data-testid="album-clear"
        onClick={() => props.onClearTracks?.()}
        title="재생목록 모두 비우기"
        type="button"
      >
        재생목록 모두 비우기
      </button>
      <button
        data-testid="album-preview-start"
        onClick={() => props.onPreviewStart?.(albumLibraryMocks.stopPreview)}
        title="미리듣기 시작"
        type="button"
      >
        미리듣기 시작
      </button>
      <button
        data-testid="album-preview-end"
        onClick={() => props.onPreviewEnd?.()}
        title="미리듣기 종료"
        type="button"
      >
        미리듣기 종료
      </button>
      <span data-testid="album-track-count">{props.tracks.length}</span>
    </>
  ),
}))

const TRACKS = [
  {
    artist: 'Artist',
    artworkUrl: '/audio/artwork/one.jpg',
    durationSeconds: 1,
    id: 'one',
    source: '/one.mp3',
    title: 'One',
  },
  {artist: 'Artist', durationSeconds: 1, id: 'two', source: '/two.mp3', title: 'Two'},
] as const

interface RenderMusicPlayerViewOptions {
  readonly currentTrack?: PTrack | null
  readonly expanded?: boolean
  readonly isPlaying?: boolean
  readonly levels?: readonly number[]
  readonly onAlbumAdd?: (tracks: readonly PTrack[]) => void
  readonly onAlbumClear?: () => void
  readonly onAudioElement?: (element: HTMLAudioElement) => void
  readonly onExpandedChange?: () => void
  readonly onNextTrack?: () => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly onPreviousTrack?: () => void
  readonly onRepeatModeChange?: (mode: 'repeat-all' | 'repeat-one') => void
  readonly onShuffleChange?: () => void
  readonly onTrackSelect?: (index: number) => void
  readonly sceneStyle?: PSceneStyle
}

const renderMusicPlayerView = (options: RenderMusicPlayerViewOptions = {}) =>
  render(() => (
    <MusicPlayerView
      currentIndex={0}
      currentTrack={options.currentTrack === null ? undefined : (options.currentTrack ?? TRACKS[0])}
      expanded={options.expanded ?? true}
      isPlaying={options.isPlaying ?? false}
      levels={options.levels ?? []}
      onAudioElement={options.onAudioElement ?? vi.fn()}
      onAlbumAdd={options.onAlbumAdd}
      onAlbumClear={options.onAlbumClear}
      onExpandedChange={options.onExpandedChange ?? vi.fn()}
      onNextTrack={options.onNextTrack ?? vi.fn()}
      onPreviewEnd={options.onPreviewEnd}
      onPreviewStart={options.onPreviewStart}
      onPreviousTrack={options.onPreviousTrack ?? vi.fn()}
      onRepeatModeChange={options.onRepeatModeChange ?? vi.fn()}
      onShuffleChange={options.onShuffleChange ?? vi.fn()}
      onTrackSelect={options.onTrackSelect ?? vi.fn()}
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

    expect(onAlbumAdd).toHaveBeenCalledWith(albumLibraryMocks.addedTracks)
    expect(onAudioElement).toHaveBeenCalledWith(result.container.querySelector('audio'))
    expect(result.getByTestId('album-track-count')).toHaveTextContent('2')
    expect(onAlbumClear).toHaveBeenCalledOnce()
    expect(onPreviewStart).toHaveBeenCalledWith(albumLibraryMocks.stopPreview)
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
    ).toHaveLength(1)
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
    const collapsedResult = renderMusicPlayerView({expanded: false})
    const summaryPlayButton = collapsedResult.container.querySelector('.pomo-player__play--summary')

    if (!(summaryPlayButton instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo summary play button to be rendered')
    }

    expect(summaryPlayButton.classList.contains('[&:hover]:translate-y-[-1px]')).toBe(false)
    expect(summaryPlayButton.classList.contains('[transition:filter_160ms_ease]')).toBe(true)

    cleanup()

    const expandedResult = renderMusicPlayerView()
    const expandedPlayButton = expandedResult.container.querySelector('.pomo-player__play--large')

    if (!(expandedPlayButton instanceof HTMLElement)) {
      throw new TypeError('Expected the Pomo expanded play button to be rendered')
    }

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
