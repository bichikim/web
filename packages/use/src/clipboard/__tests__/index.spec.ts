import {useClipboard} from '../'
import * as elementEvent from 'src/element-event'
import {flushPromises} from '@vue/test-utils'

jest.mock('src/element-event', () => {
  const listeners = {}
  return {
    __trigger(key: string, value) {
      listeners[key]?.(value)
    },
    useElementEvent: (target, key, listener: any) => {
      console.log(target, key, listener)
      listeners[key] = listener
    },
  }
})

describe('clipboard', () => {
  const _elementEvent: any = elementEvent
  const __trigger: jest.Mock = _elementEvent.__trigger
  let clipboardValue = 'init'
  const original = window.navigator.clipboard

  beforeAll(() => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: {
        readText(): Promise<string> {
          return Promise.resolve(clipboardValue)
        },
        writeText(value) {
          clipboardValue = value
          return Promise.resolve(value)
        },
      },
    })
  })

  afterEach(() => {
    clipboardValue = 'init'
  })

  afterAll(() => {
    Object.defineProperty(window.navigator, 'clipboard', {
      configurable: true,
      value: original,
    })
  })

  it('should update value ref with window copy event or cut event', async () => {
    const {value, state} = useClipboard()
    expect(value.value).toBe(undefined)
    expect(state.value).toBe('reading')
    await flushPromises()
    expect(state.value).toBe('idle')
    expect(value.value).toBe('init')

    clipboardValue = 'foo'
    __trigger('copy')
    await flushPromises()
    expect(value.value).toBe('foo')

    clipboardValue = 'bar'
    __trigger('cut')
    await flushPromises()
    expect(value.value).toBe('bar')
  })

  it('should copy value', async () => {
    const {value, state, copy} = useClipboard()
    await flushPromises()
    expect(state.value).toBe('idle')
    expect(value.value).toBe('init')

    copy('foo')
    expect(state.value).toBe('writing')
    await flushPromises()
    expect(state.value).toBe('idle')
    expect(value.value).toBe('foo')

  })
})
