/** @vitest-environment jsdom */
import {createRoot, type JSX} from 'solid-js'
import {createHandler, StartServer} from '@solidjs/start/server'
import {beforeEach, expect, it, vi} from 'vitest'

vi.mock('@solidjs/start/server', () => ({createHandler: vi.fn(), StartServer: vi.fn()}))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
})

it('should register the application document renderer with SolidStart', async () => {
  await import('../entry-server')
  expect(createHandler).toHaveBeenCalledOnce()
  const [renderServer] = vi.mocked(createHandler).mock.calls[0]
  createRoot((dispose) => {
    ;(renderServer as () => JSX.Element)()
    dispose()
  })
  expect(StartServer).toHaveBeenCalledOnce()
  const [props] = vi.mocked(StartServer).mock.calls[0]
  expect(props.document).toEqual(expect.any(Function))
})
