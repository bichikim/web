/** @vitest-environment jsdom */

import {cleanup, fireEvent, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createSignal} from 'solid-js'

import * as m from '@paraglide/message'
import {
  getAddedAlbumTracks,
  getPlayerFrame,
  getPlayerShell,
  getProgressRanges,
  getStopAlbumPreview,
  renderMusicPlayerView,
} from '../../__tests__/music-player-view.test-support.tsx'

import {installTooltipBrowser} from '../../tooltip/__tests__/support/browser'

const hasIcon = (icons: readonly HTMLElement[], className: string) =>
  icons.some((icon) => icon.classList.contains(className))

const getHTMLElement = (element: Element | null | undefined) => {
  if (!(element instanceof HTMLElement)) {
    throw new TypeError('Expected an HTML element to be rendered')
  }

  return element
}

describe('MusicPlayerView', () => {
  let browser: ReturnType<typeof installTooltipBrowser>
  beforeEach(() => {
    browser = installTooltipBrowser()
    vi.stubGlobal('CSS', {supports: () => false})
  })

  afterEach(() => {
    cleanup()
    browser.restore()
  })

  it.each([false, true])(
    'should update every playback tooltip with the playback state (expanded: %s)',
    (expanded) => {
      const [isPlaying, setPlaying] = createSignal(false)
      const result = renderMusicPlayerView({
        expanded,
        get isPlaying() {
          return isPlaying()
        },
      })
      const buttons = result.container.querySelectorAll<HTMLElement>('media-play-button')
      expect(buttons).toHaveLength(2)
      for (const button of buttons) {
        browser.setVisibleFocus(button)
        fireEvent.focus(button)
        expect(button).toHaveAttribute('title', '재생')
      }
      setPlaying(true)
      for (const button of buttons) {
        expect(button).toHaveAttribute('title', '일시 정지')
      }
      setPlaying(false)
      for (const button of buttons) {
        browser.setVisibleFocus(button)
        fireEvent.focus(button)
        expect(button).toHaveAttribute('title', '재생')
      }
    },
  )

  it('should render the current track artwork only in the expanded player', () => {
    const collapsedResult = renderMusicPlayerView({expanded: false})

    expect(collapsedResult.container.querySelector('img')).toBeNull()

    cleanup()

    const expandedResult = renderMusicPlayerView()
    const artwork = expandedResult.container.querySelector('img')

    expect(artwork).toBeInstanceOf(HTMLImageElement)
    expect(artwork?.getAttribute('src')).toBe('/audio/artwork/one.jpg')
    expect(artwork?.getAttribute('alt')).toBe('')
  })

  it('should forward album and expanded player control events', () => {
    const onAlbumAdd = vi.fn()
    const onAlbumClear = vi.fn()
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
      onExpandedChange,
      onNextTrack,
      onPreviewEnd,
      onPreviewStart,
      onPreviousTrack,
      onRepeatModeChange,
      onShuffleChange,
      onTrackSelect,
    })
    const expandButton = result.getByRole('button', {name: '플레이어 접기'})
    const repeatModeGroup = result.getByRole('group', {name: m.player_repeat_mode()})
    const repeatModeButtons = within(repeatModeGroup).getAllByRole('button')
    const shuffleButton = result.getByRole('button', {name: m.player_shuffle()})
    const transportButtons = [
      result.getByRole('button', {name: m.player_previous()}),
      result.getByRole('button', {name: m.player_next()}),
    ]
    const trackButtons = within(result.getByRole('list')).getAllByRole('button')

    if (
      repeatModeButtons.length !== 2 ||
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
    fireEvent.click(repeatModeButtons[0]!)
    fireEvent.click(repeatModeButtons[1]!)
    fireEvent.click(shuffleButton)
    fireEvent.click(transportButtons[0])
    fireEvent.click(transportButtons[1])
    fireEvent.click(trackButtons[1]!)

    expect(onAlbumAdd).toHaveBeenCalledWith(getAddedAlbumTracks())
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

  it('should disable each transport direction independently', () => {
    const result = renderMusicPlayerView({
      canNavigateNextTrack: false,
      canNavigatePreviousTrack: true,
    })

    expect(result.getByRole('button', {name: '이전 곡'})).not.toBeDisabled()
    expect(result.getByRole('button', {name: '다음 곡'})).toBeDisabled()
  })

  it('should show audio levels and fallback labels for an absent current track', () => {
    const idleResult = renderMusicPlayerView({currentTrack: null, levels: [25, 75]})
    const idleLevels = idleResult.getByLabelText(m.player_audio_levels()).querySelectorAll('span')
    const summaryTitle = getHTMLElement(
      idleResult.container.querySelector('[data-pomo-player-title]'),
    )
    const summaryLabels = summaryTitle.querySelectorAll(':scope > p > span')

    expect(idleLevels).toHaveLength(2)
    expect(idleLevels[0]?.getAttribute('style')).toContain('--pomo-level-height: 25%')
    expect(idleLevels[0]?.classList.contains('[height:var(--pomo-level-height)]')).toBe(true)
    expect((idleLevels[0] as HTMLElement | undefined)?.style.height).toBe('')
    expect(idleLevels[0]?.classList.contains('opacity-34')).toBe(true)
    expect(idleLevels[0]?.getAttribute('style')).not.toContain('opacity')
    expect(summaryLabels[0]?.textContent).toContain(m.player_fallback_title())
    expect(summaryLabels[1]?.textContent).toContain(m.player_fallback_artist())

    cleanup()

    const playingResult = renderMusicPlayerView({isPlaying: true, levels: [50]})
    const playingLevel = playingResult.getByLabelText(m.player_audio_levels()).querySelector('span')

    expect(playingLevel?.getAttribute('style')).toContain('--pomo-level-height: 50%')
    expect(playingLevel?.classList.contains('[height:var(--pomo-level-height)]')).toBe(true)
    expect((playingLevel as HTMLElement | null)?.style.height).toBe('')
    expect(playingLevel?.classList.contains('opacity-76')).toBe(true)
    expect(playingLevel?.getAttribute('style')).not.toContain('opacity')
  })

  it('should show next-track preparation without presenting a paused player', () => {
    const onPause = vi.fn()
    const result = renderMusicPlayerView({
      isPlaying: true,
      isPreparing: true,
      levels: [50],
      onPause,
    })

    const status = result.getByRole('status')
    const playbackControls = result.getAllByRole('button', {name: m.player_pause()})
    const level = result.getByLabelText(m.player_audio_levels()).querySelector('span')

    expect(status).toHaveTextContent(m.player_next_track_preparing())
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(playbackControls).toHaveLength(2)
    expect(playbackControls[0]).toHaveAttribute('aria-busy', 'true')
    for (const control of playbackControls) {
      expect(control.querySelector('.i-tabler-loader-2')).toBeNull()
    }
    expect(level).toHaveClass('opacity-76')
    expect(getPlayerShell(result.container)).toHaveAttribute('data-preparing', 'true')

    fireEvent.click(playbackControls[0]!)

    expect(onPause).toHaveBeenCalledOnce()
  })

  it('should keep the collapsed player layers visually present but inactive', () => {
    const result = renderMusicPlayerView({expanded: false})
    const controller = getPlayerShell(result.container)
    const playerBase = controller.firstElementChild
    const visualizerFrame = controller.children[1]
    const {expandedRange} = getProgressRanges(result.container)
    const expandedFrame = expandedRange.nextElementSibling
    const expandedInner = expandedFrame?.firstElementChild

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
    expect(expandedFrame).toHaveClass('h-0', 'flex-none')
    expect(expandedFrame).not.toHaveClass('flex-1')
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

  it('should allow native desktop surfaces to disable backdrop blur', () => {
    const webResult = renderMusicPlayerView()
    const webBase = webResult.getByTestId('player-background')

    expect(webBase).toHaveClass('backdrop-blur-surface')

    cleanup()

    const desktopResult = renderMusicPlayerView({backdropBlur: false})
    const desktopBase = desktopResult.getByTestId('player-background')

    expect(desktopBase).not.toHaveClass('backdrop-blur-surface')
    expect(desktopBase).toHaveClass('bg-player-surface')
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
    expect(collapsedRange.classList.contains('[--media-range-padding:0rem]')).toBe(true)
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
    expect(expandedRange.hasAttribute('title')).toBe(false)
    expect(collapsedRange.hasAttribute('title')).toBe(false)
  })

  it('should activate only the expanded progress range while expanded', () => {
    const result = renderMusicPlayerView()
    const controller = getPlayerShell(result.container)
    const visualizerFrame = controller.children[1]
    const {collapsedRange, expandedRange} = getProgressRanges(result.container)
    const expandedFrame = expandedRange.nextElementSibling
    const expandedInner = expandedFrame?.firstElementChild

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
    const originalController = getPlayerShell(originalResult.container)
    const originalBase = originalController.firstElementChild
    const originalFrame = getPlayerFrame(originalResult.container)

    expect(originalFrame.querySelector('svg')).toBeNull()
    expect(originalController.classList.contains('pomo-scribble-mask')).toBe(false)
    expect(originalController.classList.contains('rounded-panel')).toBe(true)
    expect(originalController.classList.contains('rounded-none')).toBe(false)
    expect(originalBase?.classList.contains('border-border')).toBe(true)
    expect(originalBase?.classList.contains('border-transparent')).toBe(false)

    cleanup()
    const scribbleResult = renderMusicPlayerView({sceneStyle: 'scribble'})
    const scribbleController = getPlayerShell(scribbleResult.container)
    const scribbleBase = scribbleController.firstElementChild
    const scribbleFrame = getPlayerFrame(scribbleResult.container)
    const scribbleBorder = scribbleFrame?.lastElementChild

    expect(scribbleBorder).toBeInstanceOf(SVGElement)
    expect(scribbleBorder?.getAttribute('aria-hidden')).toBe('true')
    expect(scribbleBorder?.querySelectorAll('path')).toHaveLength(2)
    expect(scribbleBorder?.querySelectorAll('path')[0]?.getAttribute('stroke-width')).toBe('6')
    expect(scribbleBorder?.querySelectorAll('path')[1]?.getAttribute('stroke-width')).toBe('3')
    expect(scribbleBorder?.parentElement).toBe(scribbleFrame)
    expect(scribbleController.contains(scribbleBorder)).toBe(false)
    expect(scribbleController.classList.contains('pomo-scribble-mask')).toBe(true)
    expect(scribbleController).not.toHaveAttribute('style')
    expect(scribbleController?.classList.contains('rounded-none')).toBe(true)
    expect(scribbleController?.classList.contains('rounded-panel')).toBe(false)
    expect(scribbleBase?.classList.contains('border-transparent')).toBe(true)
    expect(scribbleBase?.classList.contains('border-border')).toBe(false)
  })

  it('should replace player controls only in scribble style', () => {
    const originalResult = renderMusicPlayerView()
    const originalFrame = getPlayerFrame(originalResult.container)
    const originalIcons = Array.from(
      getPlayerShell(originalResult.container).querySelectorAll<HTMLElement>(
        'span[aria-hidden="true"]',
      ),
    )

    expect(hasIcon(originalIcons, 'i-tabler-player-play')).toBe(true)
    expect(hasIcon(originalIcons, 'i-pomo-scribble:play')).toBe(false)
    expect(hasIcon(originalIcons, 'i-tabler-album')).toBe(true)
    expect(hasIcon(originalIcons, 'i-pomo-scribble:album')).toBe(false)
    expect(originalFrame.querySelectorAll('svg')).toHaveLength(0)

    cleanup()
    const scribbleResult = renderMusicPlayerView({sceneStyle: 'scribble'})
    const scribbleFrame = getPlayerFrame(scribbleResult.container)
    const scribbleIcons = Array.from(
      getPlayerShell(scribbleResult.container).querySelectorAll<HTMLElement>(
        'span[aria-hidden="true"]',
      ),
    )

    expect(hasIcon(scribbleIcons, 'i-pomo-scribble:play')).toBe(true)
    expect(hasIcon(scribbleIcons, 'i-pomo-scribble:repeat')).toBe(true)
    expect(hasIcon(scribbleIcons, 'i-pomo-scribble:shuffle')).toBe(true)
    expect(hasIcon(scribbleIcons, 'i-pomo-scribble:album')).toBe(true)
    expect(hasIcon(scribbleIcons, 'i-tabler-player-play')).toBe(false)
    expect(hasIcon(scribbleIcons, 'i-tabler-album')).toBe(false)
    expect(
      [...(scribbleFrame?.querySelectorAll('svg') ?? [])].filter(
        (svg) => svg.parentElement !== scribbleFrame,
      ),
    ).toHaveLength(2)
  })

  it('should constrain expanded content and keep compact controls in one row', () => {
    const result = renderMusicPlayerView()
    const controller = getPlayerShell(result.container)
    const {expandedRange} = getProgressRanges(result.container)
    const expandedFrame = getHTMLElement(expandedRange.nextElementSibling)
    const expandedInner = getHTMLElement(expandedFrame.firstElementChild)
    const expandedPanel = getHTMLElement(expandedInner.firstElementChild)
    const controls = getHTMLElement(expandedPanel.firstElementChild)
    const playlist = result.getByRole('list')
    const track = within(playlist).getAllByRole('button')[0]
    const modes = getHTMLElement(
      result.getByRole('group', {name: m.player_repeat_mode()}).parentElement,
    )
    const transport = getHTMLElement(
      result.getByRole('button', {name: m.player_previous()}).parentElement,
    )
    const volumeGroup = getHTMLElement(
      result.getByRole('button', {name: m.player_volume()}).parentElement,
    )

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
    expect(expandedFrame.classList.contains('flex-none')).toBe(true)
    expect(expandedFrame.classList.contains('flex-1')).toBe(false)
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
    const separator = Array.from(modes.querySelectorAll('span')).find((element) =>
      element.classList.contains('w-[0.0625rem]'),
    )
    expect(separator).toHaveClass('player-narrow:mx-0')
    expect(transport.classList.contains('gap-1')).toBe(true)
    expect(transport.classList.contains('player-compact:col-span-2')).toBe(false)
    expect(volumeGroup.classList.contains('player-compact:row-start-2')).toBe(false)
  })
})
