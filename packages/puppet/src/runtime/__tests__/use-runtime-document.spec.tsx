/** @vitest-environment jsdom */
import {renderHook, waitFor} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {createDemoDocument, createEmptyDocument, type PuppetDocument} from '../../player'
import {createRuntimeDocumentSession} from '../create-runtime-document-session'
import {useRuntimeDocument} from '../use-runtime-document'
import {WorkspaceContext} from '../../workspace/context'
import type {WorkspaceContextValue} from '../../workspace/types'
import {hasTextureAtlas} from '../../editor/internal/texture-atlas'

const codecs = vi.hoisted(() => ({unpack: vi.fn()}))
vi.mock('../../editor/internal/texture-atlas-canvas', () => ({unpackTextureAtlas: codecs.unpack}))

vi.mock('../create-runtime-document-session', () => ({createRuntimeDocumentSession: vi.fn()}))
const write = vi.fn<ReturnType<typeof createRuntimeDocumentSession>['write']>()
const restored = createEmptyDocument()
const createModelFile = (width: number) => {
  const source = new File([], `${width}.json`)
  Object.defineProperty(source, 'text', {
    value: async () => JSON.stringify({...restored, viewport: {...restored.viewport, width}}),
  })
  return source
}
beforeEach(() => {
  write.mockResolvedValue(undefined)
  vi.mocked(createRuntimeDocumentSession).mockReturnValue({
    listRecoveries: async () => [],
    loadRecovery: async () => null,
    read: async () => restored,
    write,
  })
})
afterEach(() => {
  vi.resetAllMocks()
  sessionStorage.clear()
})
test('should retain the newest model as the refresh target when older persistence finishes late', async () => {
  let finish: () => void = () => undefined
  write.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  const {result} = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(result.document()).toBeDefined(), {interval: 1})
  result.loadFile(createModelFile(111))
  await waitFor(() => expect(write).toHaveBeenCalledOnce(), {interval: 1})
  result.loadFile(createModelFile(222))
  await waitFor(() => expect(result.document()?.viewport.width).toBe(222), {interval: 1})
  const latest = sessionStorage.getItem('puppet:runtime-document:v1:default')
  expect(latest).not.toBeNull()
  expect(result.sessionId()).toBe(latest)
  finish()
  await Promise.resolve()
  await Promise.resolve()
  expect(sessionStorage.getItem('puppet:runtime-document:v1:default')).toBe(latest)
  const refresh = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(refresh.result.document()).toBeDefined(), {interval: 1})
  expect(createRuntimeDocumentSession).toHaveBeenLastCalledWith(latest)
})
test('should leave the refresh target unchanged when a page closes during persistence', async () => {
  let finish: () => void = () => undefined
  write.mockImplementationOnce(
    () =>
      new Promise<void>((resolve) => {
        finish = resolve
      }),
  )
  sessionStorage.setItem('puppet:runtime-document:v1:default', 'previous')
  const {result, cleanup} = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(result.document()).toBeDefined(), {interval: 1})
  result.loadFile(createModelFile(333))
  await waitFor(() => expect(write).toHaveBeenCalledOnce(), {interval: 1})
  cleanup()
  finish()
  await Promise.resolve()
  await Promise.resolve()
  expect(sessionStorage.getItem('puppet:runtime-document:v1:default')).toBe('previous')
})

test('should ignore persistence errors from a superseded model', async () => {
  let fail: (cause: Error) => void = () => undefined
  write.mockImplementationOnce(
    () =>
      new Promise<void>((_resolve, reject) => {
        fail = reject
      }),
  )
  const {result} = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(result.document()).toBeDefined(), {interval: 1})
  result.loadFile(createModelFile(111))
  await waitFor(() => expect(write).toHaveBeenCalledOnce(), {interval: 1})
  result.loadFile(createModelFile(222))
  await waitFor(() => expect(result.document()?.viewport.width).toBe(222), {interval: 1})
  fail(new Error('Old write failed'))
  await Promise.resolve()
  await Promise.resolve()
  expect(result.error()).toBeNull()
  expect(result.document()?.viewport.width).toBe(222)
})
test('should retain a loaded model and report its current persistence failure', async () => {
  write.mockRejectedValueOnce(new Error('Write failed'))
  const {result} = renderHook(() =>
    useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
  )
  await waitFor(() => expect(result.document()).toBeDefined(), {interval: 1})
  result.loadFile(createModelFile(333))
  await waitFor(() => expect(result.document()?.viewport.width).toBe(333), {interval: 1})
  expect(result.error()).toBe('모델의 새로고침 복원 정보를 저장하지 못했습니다.')
  expect(sessionStorage.getItem('puppet:runtime-document:v1:default')).toBeNull()
})

const createWorkspace = (document: PuppetDocument): WorkspaceContextValue => ({
  bindHeader: () => () => {},
  bindViewport: () => () => {},
  document: () => document,
  mode: () => 'viewer',
  openRuntime: async () => {},
  publishDocument: vi.fn(),
  replaceDocument: vi.fn(),
  replacement: () => undefined,
})
const createAtlasFile = () => {
  const document = createDemoDocument()
  const packed = {
    ...document,
    parts: document.parts.map((part) => ({
      ...part,
      texture: {
        ...part.texture,
        region: {height: part.texture.height, width: part.texture.width, x: 0, y: 0},
      },
    })),
  }
  const file = new File([], 'atlas.json')
  Object.defineProperty(file, 'text', {value: async () => JSON.stringify(packed)})
  return {document, file}
}

test('should unpack a runtime atlas before sharing it with the retained editor', async () => {
  const atlas = createAtlasFile()
  codecs.unpack.mockResolvedValue(atlas.document)
  const workspace = createWorkspace(restored)
  const {result} = renderHook(
    () => useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
    {
      wrapper: (props) => (
        <WorkspaceContext.Provider value={workspace}>{props.children}</WorkspaceContext.Provider>
      ),
    },
  )
  result.loadFile(atlas.file)
  await waitFor(() => expect(workspace.replaceDocument).toHaveBeenCalledOnce(), {interval: 1})
  const replaced = vi.mocked(workspace.replaceDocument).mock.calls[0]![0]
  expect(hasTextureAtlas(replaced)).toBe(false)
  expect(replaced).toBe(atlas.document)
})

test('should retain the workspace model when preparing its atlas fails', async () => {
  codecs.unpack.mockRejectedValue(new Error('atlas decode failed'))
  const workspace = createWorkspace(restored)
  const {result} = renderHook(
    () => useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
    {
      wrapper: (props) => (
        <WorkspaceContext.Provider value={workspace}>{props.children}</WorkspaceContext.Provider>
      ),
    },
  )
  result.loadFile(createAtlasFile().file)
  await waitFor(() => expect(result.error()).toBe('atlas decode failed'), {interval: 1})
  expect(workspace.replaceDocument).not.toHaveBeenCalled()
})

test('should ignore an atlas decode that finishes after a newer runtime import', async () => {
  let finish = (_document: PuppetDocument) => {}
  const previous = new Promise<PuppetDocument>((resolve) => {
    finish = resolve
  })
  const atlas = createAtlasFile()
  const latest = {...atlas.document, viewport: {...atlas.document.viewport, width: 777}}
  codecs.unpack.mockReturnValueOnce(previous).mockResolvedValueOnce(latest)
  const workspace = createWorkspace(restored)
  const {result} = renderHook(
    () => useRuntimeDocument({loadInitialDocument: async () => restored, sessionId: null}),
    {
      wrapper: (props) => (
        <WorkspaceContext.Provider value={workspace}>{props.children}</WorkspaceContext.Provider>
      ),
    },
  )
  result.loadFile(atlas.file)
  await waitFor(() => expect(codecs.unpack).toHaveBeenCalledOnce(), {interval: 1})
  result.loadFile(createModelFile(777))
  await waitFor(() => expect(workspace.replaceDocument).toHaveBeenCalledExactlyOnceWith(latest), {
    interval: 1,
  })
  finish(atlas.document)
  await previous
  await Promise.resolve()
  expect(workspace.replaceDocument).toHaveBeenCalledExactlyOnceWith(latest)
})
