/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {createMonitorWallpaper, type WallpaperContent} from '@winter-love/wallpaper/settings/model'
import type {WallpaperController} from '../../features/settings'
import type {WallpaperLibraryController} from '../../features/library'
import {SWebsiteSettings} from '../SWebsiteSettings'

afterEach(cleanup)
const setup = () => {
  const [content, setContent] = createSignal<WallpaperContent>({mode: 'website', url: null})
  const [history, setHistory] = createSignal([
    {url: 'https://example.com/', visitedAt: 2},
    {url: 'https://example.org/', visitedAt: 1},
  ])
  const defaults = createMonitorWallpaper('monitor')
  const controller: WallpaperController = {
    addMedia: vi.fn(async () => undefined),
    addPuppet: vi.fn(async () => undefined),
    busy: () => false,
    changeMode: vi.fn(async () => undefined),
    current: () => ({...defaults, content: content()}),
    dismissError: vi.fn(),
    error: () => null,
    hasHiddenMedia: () => false,
    items: () => [],
    loadMedia: vi.fn(),
    loadPuppet: vi.fn(),
    monitors: () => [],
    puppets: () => [],
    removeMedia: vi.fn(async () => undefined),
    restoreBuiltinMedia: vi.fn(async () => undefined),
    selectedId: () => 'monitor',
    selectMonitor: vi.fn(),
    setContent: vi.fn(async (next) => {
      setContent(next)
    }),
    setInteraction: vi.fn(async () => undefined),
    toggleMedia: vi.fn(async () => undefined),
    wallpapers: () => [],
  }
  const library: WallpaperLibraryController = {
    addWidget: vi.fn(async () => undefined),
    bindWidget: vi.fn(async () => undefined),
    configureSpeech: vi.fn(async () => undefined),
    configureTracking: vi.fn(async () => undefined),
    dismissError: vi.fn(),
    error: () => null,
    history,
    lastWebsite: () => 'https://example.com/',
    ready: () => true,
    removeVisit: vi.fn(async (url) => {
      setHistory((entries) => entries.filter((entry) => entry.url !== url))
    }),
    removeWidget: vi.fn(async () => undefined),
    setWidgetMotion: vi.fn(async () => undefined),
    trackWidget: vi.fn(async () => undefined),
    visit: vi.fn(async () => undefined),
    widgets: () => [],
  }
  render(() => <SWebsiteSettings controller={controller} library={library} />)
  return {controller, library}
}

it('should remember a committed website address for the selected monitor', async () => {
  const {controller, library} = setup()
  const input = screen.getByRole('textbox', {name: '웹사이트 주소'})
  fireEvent.input(input, {target: {value: 'https://example.net/'}})
  fireEvent.keyDown(input, {key: 'Enter'})
  await waitFor(() => expect(library.visit).toHaveBeenCalledWith('monitor', 'https://example.net/'))
  expect(controller.setContent).toHaveBeenCalledWith({mode: 'website', url: 'https://example.net/'})
})

it('should delete one history row while retaining the remembered address and other rows', async () => {
  const {controller, library} = setup()
  fireEvent.click(screen.getByText('방문 내역'))
  fireEvent.click(screen.getByRole('button', {name: 'https://example.com/ 내역 삭제'}))
  await waitFor(() =>
    expect(screen.queryByRole('button', {name: 'https://example.com/'})).toBeNull(),
  )
  expect(screen.getByRole('button', {name: 'https://example.org/'})).toBeVisible()
  expect(library.lastWebsite('monitor')).toBe('https://example.com/')
  expect(controller.setContent).not.toHaveBeenCalled()
})

it('should reopen an individual history address', async () => {
  const {controller, library} = setup()
  fireEvent.click(screen.getByText('방문 내역'))
  fireEvent.click(screen.getByRole('button', {name: 'https://example.org/'}))
  await waitFor(() => expect(library.visit).toHaveBeenCalledWith('monitor', 'https://example.org/'))
  expect(controller.setContent).toHaveBeenCalledWith({mode: 'website', url: 'https://example.org/'})
})

it('should save website CSS and script together only when applied and preserve them on URL changes', async () => {
  const {controller} = setup()
  fireEvent.click(screen.getByText('사용자 코드'))
  fireEvent.input(screen.getByRole('textbox', {name: '사용자 CSS'}), {
    target: {value: 'body { background: red; }'},
  })
  fireEvent.input(screen.getByRole('textbox', {name: '로드 완료 후 스크립트'}), {
    target: {value: 'document.title = "custom"'},
  })
  expect(controller.setContent).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', {name: '저장 후 새로고침'}))
  await waitFor(() =>
    expect(controller.setContent).toHaveBeenCalledWith({
      css: 'body { background: red; }',
      mode: 'website',
      script: 'document.title = "custom"',
      url: null,
    }),
  )
  const address = screen.getByRole('textbox', {name: '웹사이트 주소'})
  fireEvent.input(address, {target: {value: 'https://example.net/'}})
  fireEvent.keyDown(address, {key: 'Enter'})
  await waitFor(() =>
    expect(controller.setContent).toHaveBeenLastCalledWith({
      css: 'body { background: red; }',
      mode: 'website',
      script: 'document.title = "custom"',
      url: 'https://example.net/',
    }),
  )
})

it('should save independent start and DOM-ready scripts without replacing the existing load script', async () => {
  const {controller} = setup()
  fireEvent.click(screen.getByText('사용자 코드'))
  fireEvent.change(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), {
    target: {value: 'start'},
  })
  fireEvent.input(screen.getByRole('textbox', {name: '페이지 시작 전 스크립트'}), {
    target: {value: 'window.ready = true'},
  })
  fireEvent.change(screen.getByRole('combobox', {name: '스크립트 실행 시점'}), {
    target: {value: 'dom'},
  })
  fireEvent.input(screen.getByRole('textbox', {name: 'DOM 준비 후 스크립트'}), {
    target: {value: 'document.body.dataset.ready = "yes"'},
  })
  fireEvent.click(screen.getByRole('button', {name: '저장 후 새로고침'}))
  await waitFor(() =>
    expect(controller.setContent).toHaveBeenCalledWith({
      css: '',
      mode: 'website',
      script: '',
      scriptDom: 'document.body.dataset.ready = "yes"',
      scriptStart: 'window.ready = true',
      url: null,
    }),
  )
})
