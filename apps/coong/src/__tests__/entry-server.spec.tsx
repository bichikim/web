import {createRoot} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({createHandler: vi.fn(), StartServer: vi.fn()}))

interface TestHandler {
  getOptions: (event: {locals: {nonce?: string}}) => {nonce?: string}
  renderApp: () => void
}

vi.mock('@solidjs/start/server', () => ({
  createHandler: mocks.createHandler,
  StartServer: mocks.StartServer,
}))

describe('server entry', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mocks.createHandler.mockImplementation((renderApp, getOptions) => ({getOptions, renderApp}))
  })

  it('should pass the request nonce to the SolidStart handler', async () => {
    const {default: startHandler} = await import('../entry-server')
    const handler = startHandler as unknown as TestHandler

    expect(handler.getOptions({locals: {nonce: 'request-nonce'}})).toEqual({
      nonce: 'request-nonce',
    })
  })

  it('should configure the application document shell', async () => {
    const {default: startHandler} = await import('../entry-server')
    const handler = startHandler as unknown as TestHandler

    createRoot((dispose) => {
      handler.renderApp()
      dispose()
    })
    expect(mocks.StartServer).toHaveBeenCalledOnce()
    const [{document: renderDocument}] = mocks.StartServer.mock.calls[0]

    expect(renderDocument).toEqual(expect.any(Function))
  })
})
