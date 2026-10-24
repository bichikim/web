/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {useWorkspaceSession} from '../use-workspace-session'
const mocks = vi.hoisted(() => ({navigate: vi.fn(), read: vi.fn(), write: vi.fn()}))
vi.mock('../../navigate-workspace', () => ({navigateWorkspace: mocks.navigate}))
vi.mock('../../runtime/create-runtime-document-session', () => ({
  createRuntimeDocumentSession: () => ({
    listRecoveries: async () => [],
    loadRecovery: async () => null,
    read: mocks.read,
    write: mocks.write,
  }),
}))
afterEach(() => vi.resetAllMocks())
const createFixture = (route = '/editor') =>
  createRoot((dispose) => {
    const [location, navigate] = createSignal(new URL(route, 'http://localhost'))
    const session = useWorkspaceSession({fallback: () => undefined, location})
    return {...session, dispose, navigate}
  })

test('should adopt the first runtime session without changing the retained workspace scope', async () => {
  const document = createDemoDocument()
  const fixture = createFixture()
  await fixture.openRuntime('viewer', document, 'idle')
  const destination = new URL(mocks.navigate.mock.calls[0]![0])
  expect(destination.pathname).toBe('/viewer')
  expect(destination.searchParams.get('session')).toBeTruthy()
  fixture.navigate(destination)
  expect(fixture.scope()).toBe('default')
  await fixture.openRuntime('studio', document, 'idle')
  expect(mocks.write).toHaveBeenCalledExactlyOnceWith(document)
  fixture.dispose()
})

test('should retain a persisted document without writing it again during navigation', async () => {
  const document = createDemoDocument()
  mocks.read.mockResolvedValue(document)
  const fixture = createFixture('/editor?session=retained')
  await fixture.recovery.read()
  await fixture.openRuntime('viewer', document)
  expect(mocks.write).not.toHaveBeenCalled()
  fixture.navigate(new URL('http://localhost/editor?session=another'))
  expect(fixture.scope()).toBe('another')
  fixture.dispose()
})

test('should leave the current workspace open when runtime persistence fails', async () => {
  mocks.write.mockRejectedValue(new Error('disk unavailable'))
  const fixture = createFixture()
  await expect(fixture.openRuntime('viewer', createDemoDocument())).rejects.toThrow(
    'disk unavailable',
  )
  expect(mocks.navigate).not.toHaveBeenCalled()
  expect(fixture.scope()).toBe('default')
  fixture.dispose()
})

test('should ignore an earlier handoff when a different document session was selected', async () => {
  let resolvePending: (() => void) | undefined
  const pending = new Promise<void>((resolve) => {
    resolvePending = resolve
  })
  mocks.write.mockReturnValue(pending)
  const fixture = createFixture('/editor?session=old')
  const opening = fixture.openRuntime('viewer', createDemoDocument())
  fixture.navigate(new URL('http://localhost/editor?session=new'))
  resolvePending?.()
  await opening
  expect(mocks.navigate).not.toHaveBeenCalled()
  expect(fixture.scope()).toBe('new')
  fixture.dispose()
})

test('should finish an earlier editor save before writing the runtime handoff snapshot', async () => {
  let finish: (() => void) | undefined
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  mocks.write.mockReturnValueOnce(pending)
  const fixture = createFixture('/editor?session=retained')
  const previous = createDemoDocument()
  const latest = {...previous, viewport: {height: 240, width: 320}}
  const saving = fixture.recovery.write(previous)
  await Promise.resolve()
  const opening = fixture.openRuntime('viewer', latest)
  await Promise.resolve()
  expect(mocks.write).toHaveBeenCalledExactlyOnceWith(previous)
  finish?.()
  await saving
  await opening
  expect(mocks.write).toHaveBeenLastCalledWith(latest)
  expect(mocks.navigate).toHaveBeenCalledOnce()
  fixture.dispose()
})

test('should finish saving but ignore an aborted runtime handoff', async () => {
  let finish = () => {}
  const pending = new Promise<void>((resolve) => {
    finish = resolve
  })
  mocks.write.mockReturnValue(pending)
  const fixture = createFixture('/editor?session=model')
  const request = new AbortController()
  const opening = fixture.openRuntime('studio', createDemoDocument(), 'idle', request.signal)
  await Promise.resolve()
  request.abort()
  finish()
  await opening
  expect(mocks.write).toHaveBeenCalledOnce()
  expect(mocks.navigate).not.toHaveBeenCalled()
  fixture.dispose()
})
