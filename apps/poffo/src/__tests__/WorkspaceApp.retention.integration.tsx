/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDemoDocument, createEmptyDocument} from '@winter-love/puppet/player'
import {WorkspaceApp} from '../WorkspaceApp'
import {navigateWorkspace} from '../navigate-workspace'
import {createPlayerFixture} from './fixtures/player'
const mocks = vi.hoisted(() => ({
  createPlayer: vi.fn(),
  prepare: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}))
vi.mock('@winter-love/puppet/player', async (original) => ({
  ...(await original<typeof import('@winter-love/puppet/player')>()),
  createPlayer: mocks.createPlayer,
}))
vi.mock('../runtime/graph/MappingGraph', () => ({MappingGraph: vi.fn()}))
const player = createPlayerFixture()
beforeEach(() => {
  vi.stubEnv('DEV', true)
  history.replaceState({}, '', '/editor?session=retained&motion=idle')
  localStorage.clear()
  sessionStorage.clear()
  vi.mocked(player.getRenderingInfo).mockReturnValue({antialiasing: 'ssaa', renderer: 'webgl'})
  mocks.createPlayer.mockResolvedValue(player)
  mocks.read.mockResolvedValue(createDemoDocument())
  mocks.write.mockResolvedValue(undefined)
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(640)
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(480)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

test('should retain the same header, view and player through editor viewer studio and editor navigation', async () => {
  const load = vi.fn(async () => createDemoDocument())
  const view = render(() => (
    <WorkspaceApp
      loadInitialDocument={load}
      session={{
        listRecoveries: async () => [],
        loadRecovery: async () => null,
        read: mocks.read,
        write: mocks.write,
      }}
    />
  ))
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledTimes(1))
  const region = view.getByRole('region', {name: '모델 보기'})
  const header = view.getByRole('main').querySelector('header')
  const canvas = region.querySelector('canvas')
  expect(canvas).not.toBeNull()
  await waitFor(() => expect(player.pause).toHaveBeenCalled())
  const destroy = vi.mocked(player.destroy).mock.calls.length
  fireEvent.click(view.getByRole('button', {name: '보기 설정'}))
  fireEvent.input(view.getByRole('spinbutton', {name: '보기 X'}), {target: {value: '80'}})
  fireEvent.blur(view.getByRole('spinbutton', {name: '보기 X'}))
  fireEvent.click(view.getByRole('button', {name: '보기 설정'}))
  const camera = region.style.getPropertyValue('--camera-x')
  fireEvent.click(view.getByRole('button', {name: 'Viewer'}))
  await waitFor(() => expect(location.pathname).toBe('/viewer'))
  await waitFor(() => expect(view.getByRole('button', {name: '일시정지'})).toBeEnabled(), {
    timeout: 10000,
  })
  expect(view.getByRole('main').querySelector('header')).toBe(header)
  expect(view.getByRole('region', {name: '모델 보기'})).toBe(region)
  expect(region.querySelector('canvas')).toBe(canvas)
  expect(view.queryByLabelText('메시 정점 편집 영역')).not.toBeInTheDocument()
  expect(region.style.getPropertyValue('--camera-x')).toBe(camera)
  mocks.createPlayer.mock.calls[0]![0].onFrame({duration: 9, motionId: 'idle-deform', time: 2.5})
  fireEvent.click(view.getByRole('link', {name: 'Studio'}))
  await waitFor(() =>
    expect(view.getByRole('complementary', {name: 'Studio 운용 설정'})).toBeInTheDocument(),
  )
  expect(view.getByRole('main').querySelector('header')).toBe(header)
  expect(region.querySelector('canvas')).toBe(canvas)
  fireEvent.click(view.getByRole('link', {name: 'Editor'}))
  await waitFor(() => expect(view.getByRole('button', {name: '모델링'})).toBeInTheDocument())
  expect(view.getByRole('main').querySelector('header')).toBe(header)
  expect(view.getByRole('region', {name: '모델 보기'})).toBe(region)
  expect(region.querySelector('canvas')).toBe(canvas)
  expect(view.getByLabelText('메시 정점 편집 영역')).toBeInTheDocument()
  const save = new KeyboardEvent('keydown', {cancelable: true, ctrlKey: true, key: 's'})
  globalThis.dispatchEvent(save)
  expect(save.defaultPrevented).toBe(false)
  expect(region.style.getPropertyValue('--camera-x')).toBe(camera)
  fireEvent.click(view.getByRole('button', {name: 'Viewer'}))
  await waitFor(() => expect(view.getByRole('button', {name: '일시정지'})).toBeEnabled())
  expect(player.seek).toHaveBeenCalledWith(2.5)
  expect(mocks.write).not.toHaveBeenCalled()
  expect(mocks.read).toHaveBeenCalledTimes(1)
  expect(mocks.createPlayer).toHaveBeenCalledTimes(1)
  expect(player.destroy).toHaveBeenCalledTimes(destroy)
  expect(load).not.toHaveBeenCalled()
  view.unmount()
  expect(player.destroy).toHaveBeenCalledTimes(destroy + 1)
})

test('should ignore legacy session selectors and retain the shared model and player', async () => {
  const view = render(() => (
    <WorkspaceApp
      loadInitialDocument={async () => createDemoDocument()}
      session={{
        listRecoveries: async () => [],
        loadRecovery: async () => null,
        read: mocks.read,
        write: mocks.write,
      }}
    />
  ))
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(player.pause).toHaveBeenCalled())
  const canvas = view.getByRole('region', {name: '모델 보기'}).querySelector('canvas')
  navigateWorkspace('/viewer?session=another-model&motion=idle')
  await waitFor(() => expect(view.getByRole('button', {name: '일시정지'})).toBeEnabled())
  expect(mocks.read).toHaveBeenCalledTimes(1)
  expect(mocks.createPlayer).toHaveBeenCalledTimes(1)
  expect(player.destroy).not.toHaveBeenCalled()
  expect(view.getByRole('region', {name: '모델 보기'}).querySelector('canvas')).toBe(canvas)
})

test('should apply a runtime model import to the retained editor before returning', async () => {
  const view = render(() => (
    <WorkspaceApp
      loadInitialDocument={async () => createDemoDocument()}
      session={{
        listRecoveries: async () => [],
        loadRecovery: async () => null,
        read: mocks.read,
        write: mocks.write,
      }}
    />
  ))
  await waitFor(() => expect(player.pause).toHaveBeenCalled())
  fireEvent.click(view.getByRole('button', {name: 'Viewer'}))
  await waitFor(() => expect(view.getByRole('button', {name: '일시정지'})).toBeEnabled())
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  const imported = {...createEmptyDocument(), viewport: {height: 240, width: 320}}
  const file = new File([], 'replacement.json', {type: 'application/json'})
  Object.defineProperty(file, 'text', {value: async () => JSON.stringify(imported)})
  fireEvent.change(view.getByLabelText('모델 불러오기', {selector: 'input'}), {
    target: {files: [file]},
  })
  await waitFor(() =>
    expect(player.updateDocument).toHaveBeenLastCalledWith(
      expect.objectContaining({viewport: {height: 240, width: 320}}),
      expect.any(Object),
    ),
  )
  fireEvent.click(view.getByRole('link', {name: 'Editor'}))
  await waitFor(() => expect(view.getByRole('button', {name: '모델링'})).toBeInTheDocument())
  expect(view.getByLabelText('파츠 0개')).toBeInTheDocument()
  expect(mocks.read).toHaveBeenCalledTimes(1)
  expect(mocks.createPlayer).toHaveBeenCalledTimes(1)
})

test('should return from Converter without reloading the shared model or losing undo history', async () => {
  const view = render(() => (
    <WorkspaceApp
      loadInitialDocument={async () => createDemoDocument()}
      session={{
        listRecoveries: async () => [],
        loadRecovery: async () => null,
        read: mocks.read,
        write: mocks.write,
      }}
    />
  ))
  await waitFor(() => expect(player.pause).toHaveBeenCalled())
  await waitFor(() => expect(view.getByRole('button', {name: '메인 메뉴'})).toBeEnabled())
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  const file = new File([], 'empty.json', {type: 'application/json'})
  Object.defineProperty(file, 'text', {value: async () => JSON.stringify(createEmptyDocument())})
  fireEvent.change(screen.getByLabelText('불러오기', {selector: 'input'}), {
    target: {files: [file]},
  })
  await waitFor(() => expect(view.getByLabelText('파츠 0개')).toBeInTheDocument())
  const canvas = view.getByRole('region', {name: '모델 보기'}).querySelector('canvas')
  navigateWorkspace('/converter')
  await waitFor(() => expect(view.getByRole('heading', {name: 'Poffo 변환기'})).toBeInTheDocument())
  expect(screen.getByLabelText('파일 및 편집 작업')).toHaveAttribute('data-closed')
  fireEvent.click(view.getByRole('link', {name: '← Poffo 편집기'}))
  expect(location.pathname).toBe('/editor')
  expect(view.getByRole('region', {name: '모델 보기'}).querySelector('canvas')).toBe(canvas)
  fireEvent.click(view.getByRole('button', {name: '메인 메뉴'}))
  expect(screen.getByRole('button', {name: /^실행 취소$/u})).toBeEnabled()
  expect(mocks.read).toHaveBeenCalledOnce()
})
