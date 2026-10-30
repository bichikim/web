/** @vitest-environment jsdom */
import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {batch, createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {resolveStoryFrame} from '../../features/desktop-story/frame'
import {SDesktopStory} from '../SDesktopStory'
import {SDesktopPreview} from '../SDesktopPreview'

vi.mock('../SDesktopPreview', () => ({SDesktopPreview: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should demonstrate a live Poffo wallpaper in the wallpaper chapter laptop', () => {
  const [frame, setFrame] = createSignal({
    ...resolveStoryFrame({distance: 1.8, height: 900, width: 1440}),
    transitioning: true,
  })
  render(() => <SDesktopStory frame={frame()} />)
  expect(screen.getByRole('heading', {name: /CHANGE.*THE VIEW/})).toBeDefined()
  expect(screen.getByText('움직이는 배경화면도 추가하세요.')).toBeDefined()
  expect(screen.getByText(/사진·동영상, 웹사이트와 라이브 배경/)).toBeDefined()
  const preview = vi.mocked(SDesktopPreview).mock.calls[0]![0]
  expect(preview.live).toBe(true)
  expect(preview.playing).toBe(false)
  setFrame({...frame(), transitioning: false})
  expect(preview.playing).toBe(true)
})

test('should not restart a masked chapter entrance after the wipe completes', () => {
  const [animated, setAnimated] = createSignal(false)
  const [frame, setFrame] = createSignal({
    ...resolveStoryFrame({distance: 1, height: 900, width: 1440}),
    transitioning: true,
  })
  render(() => <SDesktopStory animated={animated()} frame={frame()} />)
  const title = screen.getByRole('heading', {name: /YOUR.*DESKTOP/})
  const line = within(title).getByText('YOUR', {exact: true})
  expect(line.classList.contains('animate-story-title')).toBe(false)
  batch(() => {
    setAnimated(true)
    setFrame({...frame(), transitioning: false})
  })
  expect(within(title).getByText('YOUR', {exact: true})).toBe(line)
  expect(line.classList.contains('animate-story-title')).toBe(false)
  setFrame(resolveStoryFrame({distance: 1.8, height: 900, width: 1440}))
  expect(
    within(screen.getByRole('heading', {name: /CHANGE.*THE VIEW/}))
      .getByText('CHANGE', {exact: true})
      .classList.contains('animate-story-title'),
  ).toBe(true)
})

test('should introduce Codex speech after details and retain the final download chapter', () => {
  const [frame, setFrame] = createSignal(
    resolveStoryFrame({distance: 5.5, height: 900, width: 1440}),
  )
  render(() => <SDesktopStory frame={frame()} />)
  expect(screen.getByRole('heading', {name: /HELLO,.*CODEX/})).toBeDefined()
  expect(screen.getByRole('complementary', {name: 'Codex 연결 예시'})).toBeDefined()
  setFrame(resolveStoryFrame({distance: 7, height: 900, width: 1440}))
  expect(screen.queryByRole('complementary', {name: 'Codex 연결 예시'})).toBeNull()
  expect(screen.getByRole('button', {name: /앱 다운로드/})).toBeDefined()
})
