/** @vitest-environment jsdom */

import {mount, StartClient} from '@solidjs/start/client'
import {createRoot} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'

vi.mock('@solidjs/start/client', () => ({mount: vi.fn(), StartClient: vi.fn()}))

describe('entry client', () => {
  afterEach(() => {
    document.body.replaceChildren()
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('should mount StartClient into the root element', async () => {
    const root = document.createElement('div')
    root.id = 'root'
    document.body.append(root)

    await import('../entry-client')

    expect(mount).toHaveBeenCalledWith(expect.any(Function), root)
    const renderClient = vi.mocked(mount).mock.calls[0]?.[0]
    createRoot((dispose) => {
      renderClient?.()
      dispose()
    })
    expect(StartClient).toHaveBeenCalledOnce()
  })

  it('should reject startup when the root element is absent', async () => {
    await expect(import('../entry-client')).rejects.toThrow('Root element not found')
    expect(mount).not.toHaveBeenCalled()
  })
})
