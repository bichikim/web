import {requestIdleCallback} from '../'
import {getWindow} from 'src/dom/get-window'
import {requestIdleCallbackPolyfill} from '../polyfill'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
vi.mock('src/dom/get-window')
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
