/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import covers from '../../../public/music/ash-afternoon/covers.json'
import {SDesktopPreview} from '../SDesktopPreview'
import type SDesktopAlbum from '../SDesktopAlbum'

const renderer = vi.hoisted(() => ({
  presented: null as (() => void) | null,
}))
const renderAlbum = vi.hoisted(() => vi.fn())
vi.mock('@solidjs/start', () => ({
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
  expect(current.getAttribute('src')).toBe(covers.tracks[0]!.artwork)
  fireEvent.load(desktop.querySelector('img[aria-hidden="true"]')!)
  fireEvent.animationEnd(current)
  expect(current.getAttribute('src')).toBe(covers.tracks[0]!.artwork)
  renderer.presented?.()
  fireEvent.animationEnd(current)
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
    renderer.presented?.()
    fireEvent.animationEnd(current)
  }
  expect(screen.getByRole('img', {name: '노트북 앨범 배경'}).getAttribute('src')).toBe(
    covers.tracks[0]!.artwork,
  )
})
