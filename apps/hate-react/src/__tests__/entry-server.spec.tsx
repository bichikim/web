import {createHandler, StartServer} from '@solidjs/start/server'
import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

vi.mock('@solidjs/start/server', () => ({createHandler: vi.fn(), StartServer: vi.fn()}))

describe('entry server', () => {
  afterEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should connect the request handler to a server document renderer', async () => {
    vi.mocked(createHandler).mockImplementation((handler) => handler as never)
    const module = await import('../entry-server')
    const handler = module.default as unknown as () => unknown

    createRoot((dispose) => {
      handler()
      dispose()
    })

    expect(StartServer).toHaveBeenCalledWith(
      expect.objectContaining({document: expect.any(Function)}),
    )
  })
})
