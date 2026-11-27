/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createSignal, flush} from 'solid-js'
import covers from '../../../public/music/ash-afternoon/covers.json'
import {SDesktopPreview} from '../SDesktopPreview'
import type SDesktopAlbum from '../SDesktopAlbum'

const renderer = vi.hoisted(() => ({
  presented: null as (() => void) | null,
}))
const renderAlbum = vi.hoisted(() => vi.fn())
vi.mock(import('@solidjs/web'), async (importOriginal) => ({
  ...(await importOriginal()),
  clientOnly: vi.fn(() => renderAlbum),
}))

beforeEach(() => {
  renderAlbum.mockImplementation((props: Parameters<typeof SDesktopAlbum>[0]) => {
    renderer.presented = props.onPresented ?? null
    return null
  })
  vi.stubGlobal('matchMedia', () => ({
    addEventListener: vi.fn(),
    matches: false,
    removeEventListener: vi.fn(),
  }))
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

test('should use the looping video and retain scene pause control without mounting the cover slideshow', () => {
  render(() => <SDesktopPreview live playing={false} />)
  expect(screen.queryByRole('img', {name: '노트북 앨범 배경'})).toBeNull()
  expect(screen.getByLabelText('창가 라이브 배경').getAttribute('src')).toBe(
    '/wallpapers/window/loop.mp4',
  )
  expect(HTMLMediaElement.prototype.play).not.toHaveBeenCalled()
})

test('should show an automatic desktop example without background selection controls', () => {
  render(() => <SDesktopPreview />)
  const desktop = screen.getByRole('region', {name: 'Poffo Wallpaper 데스크톱 미리보기'})
  expect(within(desktop).queryAllByRole('button')).toHaveLength(0)
  const current = screen.getByRole('img', {name: '노트북 앨범 배경'})
  expect(current.getAttribute('src')).toBe(covers.tracks[0]!.artwork)
  fireEvent.animationEnd(current)
  flush()
  expect(current.getAttribute('src')).toBe(covers.tracks[0]!.artwork)
  fireEvent.load(desktop.querySelector('img[aria-hidden="true"]')!)
  flush()
  fireEvent.animationEnd(current)
  flush()
  expect(current.getAttribute('src')).toBe(covers.tracks[0]!.artwork)
  renderer.presented?.()
  flush()
  fireEvent.animationEnd(current)
  flush()
  expect(screen.getByRole('img', {name: '노트북 앨범 배경'}).getAttribute('src')).toBe(
    covers.tracks[1]!.artwork,
  )
})

test('should wrap the album at the last cover', () => {
  render(() => <SDesktopPreview />)
  const desktop = screen.getByRole('region', {name: 'Poffo Wallpaper 데스크톱 미리보기'})
  for (const cover of covers.tracks) {
    const current = screen.getByRole('img', {name: '노트북 앨범 배경'})
    expect(current.getAttribute('src')).toBe(cover.artwork)
    fireEvent.load(desktop.querySelector('img[aria-hidden="true"]')!)
    flush()
    renderer.presented?.()
    flush()
    fireEvent.animationEnd(current)
    flush()
  }
  expect(screen.getByRole('img', {name: '노트북 앨범 배경'}).getAttribute('src')).toBe(
    covers.tracks[0]!.artwork,
  )
})

test('should retain the current album image while the live wallpaper is displayed', () => {
  const [live, setLive] = createSignal(false)
  const [playing, setPlaying] = createSignal(true)
  render(() => <SDesktopPreview live={live()} playing={playing()} />)
  const desktop = screen.getByRole('region', {name: 'Poffo Wallpaper 데스크톱 미리보기'})
  fireEvent.load(desktop.querySelector('img[aria-hidden="true"]')!)
  flush()
  renderer.presented?.()
  flush()
  fireEvent.animationEnd(screen.getByRole('img', {name: '노트북 앨범 배경'}))
  flush()
  const current = screen.getByRole('img', {name: '노트북 앨범 배경'})
  setLive(true)
  flush()
  expect(current.isConnected).toBe(true)
  expect(screen.queryByRole('img', {name: '노트북 앨범 배경'})).toBeNull()
  setPlaying(false)
  flush()
  setLive(false)
  flush()
  expect(screen.getByRole('img', {name: '노트북 앨범 배경'})).toBe(current)
  expect(current.getAttribute('src')).toBe(covers.tracks[1]!.artwork)
  fireEvent.load(desktop.querySelector('img[aria-hidden="true"]')!)
  flush()
  renderer.presented?.()
  flush()
  fireEvent.animationEnd(current)
  flush()
  expect(screen.getByRole('img', {name: '노트북 앨범 배경'})).toBe(current)
  setPlaying(true)
  flush()
  fireEvent.animationEnd(current)
  flush()
  expect(screen.getByRole('img', {name: '노트북 앨범 배경'}).getAttribute('src')).toBe(
    covers.tracks[2]!.artwork,
  )
})
