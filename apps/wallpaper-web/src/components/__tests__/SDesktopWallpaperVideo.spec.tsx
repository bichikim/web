/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {SDesktopWallpaperVideo} from '../SDesktopWallpaperVideo'

const preference = Object.assign(new EventTarget(), {matches: false})
const play = vi.fn(async () => undefined)
const pause = vi.fn()

beforeEach(() => {
  preference.matches = false
  vi.stubGlobal('matchMedia', () => preference)
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false)
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(pause)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

test('should play the local silent inline wallpaper on a loop', () => {
  render(() => <SDesktopWallpaperVideo />)
  const video = screen.getByLabelText<HTMLVideoElement>('창가 라이브 배경')
  expect(video.getAttribute('src')).toBe('/wallpapers/window/loop.mp4')
  expect(video.loop).toBe(true)
  expect(video.muted).toBe(true)
  expect(video.playsInline).toBe(true)
  expect(play).toHaveBeenCalledOnce()
})

test('should pause during scene transitions and resume the same video afterward', () => {
  const [playing, setPlaying] = createSignal(false)
  render(() => <SDesktopWallpaperVideo playing={playing()} />)
  const video = screen.getByLabelText('창가 라이브 배경')
  expect(play).not.toHaveBeenCalled()
  setPlaying(true)
  expect(play).toHaveBeenCalledOnce()
  setPlaying(false)
  expect(screen.getByLabelText('창가 라이브 배경')).toBe(video)
  expect(pause).toHaveBeenCalled()
})

test('should pause in a hidden tab and stop responding after disposal', () => {
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
  const view = render(() => <SDesktopWallpaperVideo />)
  expect(play).not.toHaveBeenCalled()
  hidden.mockReturnValue(false)
  document.dispatchEvent(new Event('visibilitychange'))
  expect(play).toHaveBeenCalledOnce()
  view.unmount()
  play.mockClear()
  document.dispatchEvent(new Event('visibilitychange'))
  expect(play).not.toHaveBeenCalled()
})

test('should respect changes to reduced motion without reloading the video', () => {
  preference.matches = true
  render(() => <SDesktopWallpaperVideo />)
  expect(play).not.toHaveBeenCalled()
  preference.matches = false
  preference.dispatchEvent(new Event('change'))
  expect(play).toHaveBeenCalledOnce()
  preference.matches = true
  preference.dispatchEvent(new Event('change'))
  expect(pause).toHaveBeenCalled()
})
