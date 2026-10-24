import {getWindow} from 'src/browser/dom/get-window'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {requestIdleCallback} from '../'
import {requestIdleCallbackPolyfill} from '../polyfill'

vi.mock('src/browser/dom/get-window')
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

  it('should allow cancellation when only requestIdleCallback is available', () => {
    vi.mocked(getWindow).mockReturnValueOnce({
      requestIdleCallback: vi.fn(() => 1),
    } as any)

    const cancel = requestIdleCallback(vi.fn())

    expect(cancel).not.toThrow()
  })

  it('should use polyfill when there is no requestIdleCallback', () => {
    const callback = vi.fn()

    requestIdleCallback(callback)
    expect(requestIdleCallbackPolyfill).toBeCalled()
  })
})
