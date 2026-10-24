import {afterEach, describe, expect, it, vi} from 'vitest'
import {notifyClients} from '../client-messages'

describe('notifyClients', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should post the message to every window client', async () => {
    const firstPostMessage = vi.fn()
    const secondPostMessage = vi.fn()
    const matchAll = vi
      .fn()
      .mockResolvedValue([{postMessage: firstPostMessage}, {postMessage: secondPostMessage}])

    vi.stubGlobal('self', {clients: {matchAll}})

    const message = {type: 'CACHE_UPDATED'}

    await notifyClients(message)

    expect(matchAll).toHaveBeenCalledWith({includeUncontrolled: true, type: 'window'})
    expect(firstPostMessage).toHaveBeenCalledWith(message)
    expect(secondPostMessage).toHaveBeenCalledWith(message)
  })
})
