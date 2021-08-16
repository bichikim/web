import {useClipboard} from '../'
import {useElementEvent} from 'src/element-event'
import {getNavigator} from '@winter-love/utils'
import {flushPromises} from '@vue/test-utils'

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
            return _value
          },
          writeText: (value: string) => {
            _value = value
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

    const {value, state} = useClipboard(undefined, true)
    expect(state.value).toBe('idle')
    expect(value.value).toBe(undefined)

    mock.setValue('foo')
    mock.trigger('copy')
    await flushPromises()
    expect(value.value).toBe('foo')

    mock.setValue('bar')
    mock.trigger('cut')
    await flushPromises()
    expect(value.value).toBe('bar')
  })

  it('should write value', async () => {
    const mock = createUseElementEventMock()

    useElementEventMock.mockImplementation(mock.useElementEvent)
    getNavigatorMock.mockImplementation(mock.getNavigator)
    const {value, state, write} = useClipboard()
    expect(state.value).toBe('idle')
    expect(value.value).toBe(undefined)

    write('foo')
    expect(state.value).toBe('writing')
    await flushPromises()
    expect(state.value).toBe('idle')
    expect(value.value).toBe('foo')
    useElementEventMock.mockRestore()
  })
  it('should not double write value', async () => {
    const mock = createUseElementEventMock()

    useElementEventMock.mockImplementation(mock.useElementEvent)
    getNavigatorMock.mockImplementation(mock.getNavigator)
    const {value, state, write} = useClipboard()
    expect(state.value).toBe('idle')
    expect(value.value).toBe(undefined)

    write('foo')
    write('bar')
    expect(state.value).toBe('writing')
    await flushPromises()
    expect(state.value).toBe('idle')
    expect(value.value).toBe('foo')
    useElementEventMock.mockRestore()
  })
})
