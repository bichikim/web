import '@unocss/reset/tailwind.css'
import 'media-chrome'
import {cleanup, render} from '@solidjs/testing-library'
import {createComponent, createSignal, type Setter} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {commands, page, server, userEvent} from 'vitest/browser'
import {PlaybackControls} from './fixtures/playback-controls'

declare module 'vitest/browser' {
  interface BrowserCommands {
    getUtilityStyles: (content: string) => Promise<string>
  }
}

let stylesheet: HTMLStyleElement | undefined
const SUMMARY_SIZE = 44
const EXPANDED_SIZE = 52
const PREPARATION_CYCLES = 3
const CONTROL_NAMES = ['Summary', 'Expanded'] as const
type ControlName = (typeof CONTROL_NAMES)[number]

beforeEach(() => localStorage.clear())
afterEach(() => {
  cleanup()
  stylesheet?.remove()
  stylesheet = undefined
  vi.restoreAllMocks()
})

const applyStyles = async () => {
  stylesheet = document.createElement('style')
  stylesheet.textContent = await commands.getUtilityStyles(
    `${document.body.outerHTML} w-64 w-120 i-tabler-player-pause`,
  )
  document.head.append(stylesheet)
}

const getControl = (name: ControlName) => {
  const group = page.getByRole('group', {exact: true, name}).element()
  const control = group.querySelector('media-play-button, button[aria-busy="true"]')
  if (!(control instanceof HTMLElement)) {
    throw new TypeError(`Expected ${name} playback control`)
  }
  return control
}

const getController = () => {
  const fixture = page.getByRole('group', {exact: true, name: 'Playback fixture'}).element()
  const controller = fixture.querySelector('media-controller')
  if (!(controller instanceof HTMLElement)) {
    throw new TypeError('Expected the production media controller')
  }
  return controller
}

const getAudio = () => {
  const audio = getController().querySelector('audio')
  if (!(audio instanceof HTMLAudioElement)) {
    throw new TypeError('Expected the production audio element')
  }
  return audio
}

const baselineLabel = () => {
  const label = page
    .getByTestId('media-label-baseline')
    .element()
    .querySelector('media-play-button')
    ?.getAttribute('aria-label')
  if (label === null || label === undefined || label === '') {
    throw new TypeError('Expected the original media label binding')
  }
  return label
}

const getSlot = (control: HTMLElement, name: 'play' | 'pause') => {
  const slot = control.shadowRoot?.querySelector(`slot[name="${name}"]`)
  if (!(slot instanceof HTMLSlotElement)) {
    throw new TypeError(`Expected the registered media ${name} slot`)
  }
  return slot
}

const assertPlaybackState = async (playing: boolean) => {
  await expect.poll(() => getAudio().paused).toBe(!playing)
  await expect
    .poll(() =>
      CONTROL_NAMES.every((name) => {
        const control = getControl(name)
        return (
          control.tagName === 'MEDIA-PLAY-BUTTON' &&
          control.hasAttribute('mediapaused') === !playing &&
          control.getAttribute('aria-label') === baselineLabel()
        )
      }),
    )
    .toBe(true)
  for (const name of CONTROL_NAMES) {
    const control = getControl(name)
    expect(control).toHaveAccessibleName(baselineLabel())
    expect(control).toHaveAttribute('notooltip', '')
    const play = getSlot(control, 'play')
    const pause = getSlot(control, 'pause')
    expect(play.assignedElements()).toEqual([control.querySelector('[slot="play"]')])
    expect(pause.assignedElements()).toEqual([control.querySelector('[slot="pause"]')])
    expect(getComputedStyle(play).display === 'none').toBe(playing)
    expect(getComputedStyle(pause).display === 'none').toBe(!playing)
  }
}

const awaitMediaReady = async () => {
  const audio = getAudio()
  expect(Reflect.get(getController(), 'media')).toBe(audio)
  await expect.poll(() => audio.readyState).toBeGreaterThanOrEqual(audio.HAVE_METADATA)
  expect(audio.currentSrc).toMatch(/^blob:/u)
  await assertPlaybackState(false)
  return audio
}

const clickPlayback = async (name: ControlName) => {
  await page
    .getByRole('group', {exact: true, name})
    .getByRole('button', {exact: true, name: baselineLabel()})
    .click()
}

const tooltipText = (control: HTMLElement) => {
  const description = control.getAttribute('aria-describedby')
  return description === null
    ? control.getAttribute('title')
    : document.getElementById(description)?.textContent
}

const focusPlayback = async (control: HTMLElement) => {
  await userEvent.keyboard(server.browser === 'webkit' ? '{Alt>}{Tab}{/Alt}' : '{Tab}')
  control.focus()
  expect(document.activeElement).toBe(control)
}

const cancelPreparation = async (name: ControlName, setPreparing: Setter<boolean>) => {
  await clickPlayback(name)
  await assertPlaybackState(true)
  const media = getControl(name)
  await focusPlayback(media)
  await expect.poll(() => tooltipText(media)).toContain('일시 정지')
  setPreparing(true)
  const cancel = page
    .getByRole('group', {exact: true, name})
    .getByRole('button', {name: '일시 정지'})
  await expect.element(cancel).toBeVisible()
  const native = getControl(name)
  expect(native).toHaveAttribute('aria-busy', 'true')
  expect(native).toHaveAccessibleName('일시 정지')
  expect(media.isConnected).toBe(false)
  expect(media).not.toHaveAttribute('aria-describedby')
  expect(media).not.toHaveAttribute('title')
  await focusPlayback(native)
  await expect.poll(() => tooltipText(native)).toContain('일시 정지')
  await userEvent.keyboard('{Enter}')
  await assertPlaybackState(false)
  expect(native.isConnected).toBe(false)
  expect(native).not.toHaveAttribute('aria-describedby')
  expect(native).not.toHaveAttribute('title')
  const restored = getControl(name)
  await focusPlayback(restored)
  await expect.poll(() => tooltipText(restored)).toContain('재생')
}

it.each(CONTROL_NAMES)(
  'should synchronize %s requests, native audio, accessible names and visible slots',
  async (name) => {
    const onPause = vi.fn()
    render(() => createComponent(PlaybackControls, {onPause}))
    await applyStyles()
    const audio = await awaitMediaReady()
    const play = vi.spyOn(audio, 'play')
    const pause = vi.spyOn(audio, 'pause')
    const media = getControl(name)
    const dispatch = vi.spyOn(media, 'dispatchEvent')
    await clickPlayback(name)
    await assertPlaybackState(true)
    expect(play).toHaveBeenCalledOnce()
    expect(dispatch.mock.calls.some(([event]) => event.type === 'mediaplayrequest')).toBe(true)
    getControl(name).focus()
    await userEvent.keyboard('{Enter}')
    await assertPlaybackState(false)
    expect(pause).toHaveBeenCalledOnce()
    expect(dispatch.mock.calls.some(([event]) => event.type === 'mediapauserequest')).toBe(true)
    expect(onPause).not.toHaveBeenCalled()
  },
)

it.each(CONTROL_NAMES)(
  'should cancel %s preparation repeatedly and retarget tooltip and accessibility state',
  async (name) => {
    const [preparing, setPreparing] = createSignal(false)
    const onPause = vi.fn(() => setPreparing(false))
    const view = render(() =>
      createComponent(PlaybackControls, {
        get isPreparing() {
          return preparing()
        },
        onPause,
      }),
    )
    await applyStyles()
    const audio = await awaitMediaReady()
    await cancelPreparation(name, setPreparing)
    await cancelPreparation(name, setPreparing)
    await cancelPreparation(name, setPreparing)
    expect(onPause).toHaveBeenCalledTimes(PREPARATION_CYCLES)
    const final = getControl(name)
    const controller = getController()
    view.unmount()
    expect(final).not.toHaveAttribute('aria-describedby')
    expect(final).not.toHaveAttribute('title')
    expect(controller.isConnected).toBe(false)
    expect(audio.paused).toBe(true)
    expect(audio).not.toHaveAttribute('src')
    expect(document.querySelector('[role="tooltip"]')).toBeNull()
  },
)

it.each(CONTROL_NAMES)(
  'should reject pointer and keyboard activation of disabled %s controls',
  async (name) => {
    const [hasTrack, setTrack] = createSignal(false)
    const [preparing, setPreparing] = createSignal(false)
    const onPause = vi.fn()
    render(() =>
      createComponent(PlaybackControls, {
        get hasTrack() {
          return hasTrack()
        },
        get isPreparing() {
          return preparing()
        },
        onPause,
      }),
    )
    await applyStyles()
    const media = getControl(name)
    expect(media).toBeInstanceOf(customElements.get('media-play-button')!)
    expect(media).toHaveAttribute('disabled')
    expect(media.tabIndex).toBe(-1)
    const dispatch = vi.spyOn(media, 'dispatchEvent')
    const play = vi.spyOn(getAudio(), 'play')
    // Force sends pointer input past runner checks so the element's own gate is exercised.
    await page
      .getByRole('group', {exact: true, name})
      .getByRole('button', {
        exact: true,
        name: media.getAttribute('aria-label')!,
      })
      .click({force: true})
    const keydown = vi.fn<(event: KeyboardEvent) => void>()
    media.addEventListener('keydown', keydown, {once: true})
    media.focus()
    expect(document.activeElement).toBe(media)
    await userEvent.keyboard('{Enter}')
    expect(keydown).toHaveBeenCalledOnce()
    expect(keydown.mock.calls[0]?.[0].isTrusted).toBe(true)
    expect(dispatch.mock.calls.some(([event]) => event.type === 'mediaplayrequest')).toBe(false)
    expect(play).not.toHaveBeenCalled()
    expect(getAudio().paused).toBe(true)
    setPreparing(true)
    const native = page
      .getByRole('group', {exact: true, name})
      .getByRole('button', {name: '일시 정지'})
    await expect.element(native).toBeDisabled()
    await native.click({force: true})
    const previousFocus = document.activeElement
    getControl(name).focus()
    expect(document.activeElement).toBe(previousFocus)
    expect(document.activeElement).not.toBe(getControl(name))
    await userEvent.keyboard('{Enter}')
    expect(onPause).not.toHaveBeenCalled()
    setPreparing(false)
    setTrack(true)
    await awaitMediaReady()
    await clickPlayback(name)
    await assertPlaybackState(true)
    expect(play).toHaveBeenCalledOnce()
  },
)

const assertPlaybackLayout = async (setCompact: Setter<boolean>) => {
  const summary = getControl('Summary')
  const expanded = getControl('Expanded')
  expect(summary.parentElement?.tagName).toBe('SPAN')
  expect(summary.parentElement?.parentElement).toHaveAttribute('data-player-play-summary-frame', '')
  expect(expanded.parentElement?.tagName).toBe('SPAN')
  expect(expanded.parentElement).toHaveClass('player-compact:hidden')
  for (const control of [summary, expanded]) {
    expect(control.nextElementSibling?.tagName.toLowerCase()).toBe('svg')
    expect(control.parentElement?.children).toHaveLength(2)
    const pauseIcon = control.querySelector('[slot="pause"]') ?? control.firstElementChild
    expect(pauseIcon).toHaveClass('i-pomo-scribble:pause')
  }
  await expect.poll(() => summary.getBoundingClientRect().width).toBe(SUMMARY_SIZE)
  await expect.poll(() => expanded.getBoundingClientRect().width).toBe(EXPANDED_SIZE)
  setCompact(true)
  await expect.poll(() => getComputedStyle(expanded.parentElement!).display).toBe('none')
  expect(summary.getBoundingClientRect().width).toBe(SUMMARY_SIZE)
  setCompact(false)
  await expect.poll(() => expanded.getBoundingClientRect().width).toBe(EXPANDED_SIZE)
}

it('should preserve both scribble wrappers, sizes and compact hiding across preparation', async () => {
  const [preparing, setPreparing] = createSignal(false)
  const [compact, setCompact] = createSignal(false)
  render(() =>
    createComponent(PlaybackControls, {
      get compact() {
        return compact()
      },
      get isPreparing() {
        return preparing()
      },
      sceneStyle: 'scribble',
    }),
  )
  await applyStyles()
  await awaitMediaReady()
  await assertPlaybackLayout(setCompact)
  setPreparing(true)
  await assertPlaybackLayout(setCompact)
  setPreparing(false)
  await assertPlaybackState(false)
  await assertPlaybackLayout(setCompact)
})
