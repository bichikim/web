/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDemoDocument, createEmptyDocument} from '../player'
import {WorkspaceApp} from '../WorkspaceApp'
import {navigateWorkspace} from '../navigate-workspace'
import {createPlayerFixture} from '../editor/__tests__/fixtures/player'
const mocks = vi.hoisted(() => ({
  createPlayer: vi.fn(),
  prepare: vi.fn(),
  read: vi.fn(),
  write: vi.fn(),
}))
vi.mock('../player', async (original) => ({
  ...(await original<typeof import('../player')>()),
  createPlayer: mocks.createPlayer,
}))
vi.mock('../runtime/create-runtime-document-session', () => ({
  createRuntimeDocumentSession: () => ({
    listRecoveries: async () => [],
    loadRecovery: async () => null,
    read: mocks.read,
    write: mocks.write,
  }),
}))
vi.mock('../runtime/graph/MappingGraph', () => ({MappingGraph: vi.fn()}))
const player = createPlayerFixture()
beforeEach(() => {
  vi.stubEnv('DEV', true)
  history.replaceState({}, '', '/editor?session=retained&motion=idle')
  localStorage.clear()
  sessionStorage.clear()
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
  const view = render(() => <WorkspaceApp loadInitialDocument={load} />)
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

test('should release the old workspace only when navigation selects a different document session', async () => {
  const view = render(() => <WorkspaceApp loadInitialDocument={async () => createDemoDocument()} />)
  await waitFor(() => expect(mocks.createPlayer).toHaveBeenCalledTimes(1))
  await waitFor(() => expect(player.pause).toHaveBeenCalled())
  const canvas = view.getByRole('region', {name: '모델 보기'}).querySelector('canvas')
  navigateWorkspace('/viewer?session=another-model&motion=idle')
  await waitFor(() => expect(view.getByRole('button', {name: '일시정지'})).toBeEnabled())
  expect(mocks.read).toHaveBeenCalledTimes(2)
  expect(mocks.createPlayer).toHaveBeenCalledTimes(2)
  expect(player.destroy).toHaveBeenCalledTimes(1)
  expect(view.getByRole('region', {name: '모델 보기'}).querySelector('canvas')).not.toBe(canvas)
})

test('should apply a runtime model import to the retained editor before returning', async () => {
  const view = render(() => <WorkspaceApp loadInitialDocument={async () => createDemoDocument()} />)
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
