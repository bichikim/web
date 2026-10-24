/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import {createRuntimeLauncher} from '../create-runtime-launcher'
const mocks = vi.hoisted(() => ({open: vi.fn()}))
vi.mock('../open-runtime', () => ({openRuntime: mocks.open}))
afterEach(() => vi.resetAllMocks())

test('should suppress an old handoff failure after it was cancelled', async () => {
  let fail = (_cause: Error) => {}
  mocks.open.mockReturnValue(
    new Promise<void>((_resolve, reject) => {
      fail = reject
    }),
  )
  let dispose = () => {}
  const onError = vi.fn()
  const launcher = createRoot((cleanup) => {
    dispose = cleanup
    return createRuntimeLauncher({document: createDemoDocument, motionId: () => 'idle', onError})
  })
  const request = new AbortController()
  const opening = launcher.openViewer(request.signal)
  request.abort()
  fail(new Error('old write failed'))
  await opening
  expect(onError).not.toHaveBeenCalled()
  dispose()
})

test('should still report a current handoff failure', async () => {
  mocks.open.mockRejectedValue(new Error('current write failed'))
  const onError = vi.fn()
  await createRoot(async (dispose) => {
    const launcher = createRuntimeLauncher({
      document: createDemoDocument,
      motionId: () => 'idle',
      onError,
    })
    await launcher.openStudio()
    expect(onError).toHaveBeenCalledExactlyOnceWith('current write failed')
    dispose()
  })
})
