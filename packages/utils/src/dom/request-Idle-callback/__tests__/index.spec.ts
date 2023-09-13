import {requestIdleCallback} from '../'
import {getWindow} from 'src/dom/get-window'
import {requestIdleCallbackPolyfill} from '../polyfill'

jest.mock('src/dom/get-window')
jest.mock('../polyfill')

describe('requestIdleCallback', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })
  it('should request idle callback', () => {
    jest.mocked(getWindow).mockReturnValueOnce({
      requestIdleCallback: jest.fn(((callback: any) => callback()) as any),
    } as any)
    const callback = jest.fn()
    requestIdleCallback(callback)
    expect(callback).toBeCalled()
  })
  it('should use polyfill when there is no requestIdleCallback', () => {
    const callback = jest.fn()
    requestIdleCallback(callback)
    expect(requestIdleCallbackPolyfill).toBeCalled()
  })
})
