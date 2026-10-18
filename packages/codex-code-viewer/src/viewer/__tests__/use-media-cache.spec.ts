/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createMediaCache} from '../create-media-cache'
import {useMediaCache} from '../use-media-cache'

vi.mock('../create-media-cache', () => ({createMediaCache: vi.fn()}))
afterEach(() => vi.clearAllMocks())

describe('useMediaCache', () => {
  it('should keep cached media across document changes and clear on session change and disposal', () => {
    const clear = vi.fn()
    vi.mocked(createMediaCache).mockReturnValue({acquire: vi.fn(), clear})
    const [current, setCurrent] = createSignal({path: 'image.png', session: 'first'})
    let dispose: () => void = () => {}
    createRoot((cleanup) => {
      dispose = cleanup
      useMediaCache(() => current().session)
    })
    expect(clear).toHaveBeenCalledOnce()
    setCurrent({path: 'notes.txt', session: 'first'})
    expect(clear).toHaveBeenCalledOnce()
    setCurrent({path: 'image.png', session: 'second'})
    expect(clear).toHaveBeenCalledTimes(2)
    dispose()
    expect(clear).toHaveBeenCalledTimes(3)
  })
})
