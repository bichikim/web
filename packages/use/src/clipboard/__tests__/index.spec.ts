import {useClipboard} from '../'
import {useElementEvent} from 'src/element-event'
import {getNavigator, setTimeoutPromise} from '@winter-love/utils'
import {flushPromises} from '@vue/test-utils'
import {mountUse} from '@winter-love/test-use'
import {useFakeTimers} from 'sinon'
import {watch} from 'vue'

jest.mock('src/element-event', () => {
  return {
    ...jest.requireActual('src/element-event'),
    useElementEvent: jest.fn(),
  }
})

jest.mock('@winter-love/utils', () => {
  return {
    ...jest.requireActual('@winter-love/utils'),
    getNavigator: jest.fn(),
  }
})

const useElementEventMock: jest.Mock = useElementEvent as any
const getNavigatorMock: jest.Mock = getNavigator as any

const createUseElementEventMock = () => {
  const listeners = {}
  let _value = ''
  return {
    getNavigator: () => {
      return {
        clipboard: {
          readText: () => {
            return Promise.resolve(_value)
          },
          writeText: (value: string) => {
            _value = value
            return setTimeoutPromise(100)
          },
        },
      }
    },
    setValue: (value: string) => {
      _value = value
    },
    trigger: (key: string, value?) => {
      listeners[key]?.(value)
    },
    useElementEvent: (target, key, listener: any) => {
      listeners[key] = listener
    },
  }
}

describe('clipboard', () => {
  afterEach(() => {
    useElementEventMock.mockRestore()
    getNavigatorMock.mockRestore()
  })

  it('should update value ref with window copy event or cut event', async () => {
    const mock = createUseElementEventMock()

    useElementEventMock.mockImplementation(mock.useElementEvent)
    getNavigatorMock.mockImplementation(mock.getNavigator)

    const {result} = mountUse(() => {
      const {value, state} = useClipboard(undefined, true)
      return {
        state,
        value,
      }
    })

    expect(result.state).toBe('idle')
    expect(result.value).toBe(undefined)

    mock.setValue('foo')
    mock.trigger('copy')
    await flushPromises()
    await flushPromises()
    expect(result.value).toBe('foo')

    mock.setValue('bar')
    mock.trigger('cut')
    await flushPromises()
    expect(result.value).toBe('bar')
  })

  it('should write value', async () => {
    const clock = useFakeTimers()
    const mock = createUseElementEventMock()

    useElementEventMock.mockImplementation(mock.useElementEvent)
    getNavigatorMock.mockImplementation(mock.getNavigator)

    const {result} = mountUse(() => {
      const {value, state, write} = useClipboard()
      return {
        state,
        value,
        write,
      }
    })

    expect(result.state).toBe('idle')
    expect(result.value).toBe(undefined)

    await result.write('foo')
    expect(result.state).toBe('writing')
    clock.tick(200)
    await flushPromises()
    expect(result.state).toBe('idle')
    expect(result.value).toBe('foo')
    useElementEventMock.mockRestore()
    clock.restore()
  })
  it('should not double write value', async () => {
    const clock = useFakeTimers()
    const mock = createUseElementEventMock()

    useElementEventMock.mockImplementation(mock.useElementEvent)
    getNavigatorMock.mockImplementation(mock.getNavigator)

    const {result} = mountUse(() => {
      const {value, state, write} = useClipboard()
      return {
        state,
        value,
        write,
      }
    })

    expect(result.state).toBe('idle')
    expect(result.value).toBe(undefined)

    result.write('foo')
    await result.write('bar')
    expect(result.state).toBe('writing')
    clock.tick(200)
    await flushPromises()
    expect(result.state).toBe('idle')
    expect(result.value).toBe('foo')
    useElementEventMock.mockRestore()
    clock.restore()
  })
})
