import {getWindow} from 'src/get-window'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {requestIdleCallback} from '../'
import {requestIdleCallbackPolyfill} from '../polyfill'

vi.mock('src/get-window')
vi.mock('../polyfill')

describe('requestIdleCallback', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should request idle callback', () => {
    vi.mocked(getWindow).mockReturnValueOnce({
      requestIdleCallback: vi.fn(((callback: any) => callback()) as any),
    } as any)
    const callback = vi.fn()

    requestIdleCallback(callback)
    expect(callback).toBeCalled()
  })

  it('should use polyfill when there is no requestIdleCallback', () => {
    const callback = vi.fn()

    requestIdleCallback(callback)
    expect(requestIdleCallbackPolyfill).toBeCalled()
  })
})
