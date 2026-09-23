/** @vitest-environment jsdom */

import {createRoot} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({mount: vi.fn(), StartClient: vi.fn()}))

vi.mock('@solidjs/start/client', () => ({mount: mocks.mount, StartClient: mocks.StartClient}))

describe('client entry', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('should mount StartClient into the root element', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.append(root)

    await import('../entry-client')

    expect(mocks.mount).toHaveBeenCalledWith(expect.any(Function), root)
    const [renderClient] = mocks.mount.mock.calls[0]

    createRoot((dispose) => {
      renderClient()
      dispose()
    })
    expect(mocks.StartClient).toHaveBeenCalledOnce()
  })

  it('should reject startup when the root element is missing', () => {
    return expect(import('../entry-client')).rejects.toThrow('Root element not found')
  })
})
