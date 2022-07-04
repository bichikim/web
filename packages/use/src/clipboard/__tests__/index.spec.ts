import {flushPromises} from '@vue/test-utils'
import {mountComposition} from '@winter-love/test-use'
import {getNavigator, setTimeoutPromise} from '@winter-love/utils'
import {SinonFakeTimers, useFakeTimers} from 'sinon'
import {useElementEvent} from 'src/element-event'
import {useClipboard} from '../'

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
    clock.restore()
  })
  let clock: SinonFakeTimers
  beforeEach(() => {
    clock = useFakeTimers()
  })

  it('should update value ref with window copy event or cut event', async () => {
    const mock = createUseElementEventMock()

    useElementEventMock.mockImplementation(mock.useElementEvent)
    getNavigatorMock.mockImplementation(mock.getNavigator)

    const wrapper = mountComposition(() => {
      const {value, state} = useClipboard(undefined, true)
      return {
        state,
        value,
      }
    })

    expect(wrapper.setupState.state).toBe('idle')
    expect(wrapper.setupState.value).toBe(undefined)
    //
    mock.setValue('foo')
    mock.trigger('copy')
    await flushPromises()
    // await flushPromises()
    expect(wrapper.setupState.value).toBe('foo')
    //
    mock.setValue('bar')
    mock.trigger('cut')
    await flushPromises()
    expect(wrapper.setupState.value).toBe('bar')
  })

  it('should write value', async () => {
    const mock = createUseElementEventMock()

    useElementEventMock.mockImplementation(mock.useElementEvent)
    getNavigatorMock.mockImplementation(mock.getNavigator)

    const wrapper = mountComposition(() => {
      const {value, state, write} = useClipboard()
      return {
        state,
        value,
        write,
      }
    })

    expect(wrapper.setupState.state).toBe('idle')
    expect(wrapper.setupState.value).toBe(undefined)

    wrapper.setupState.write('foo')
    expect(wrapper.setupState.state).toBe('writing')
    clock.tick(200)
    await flushPromises()
    expect(wrapper.setupState.state).toBe('idle')
    expect(wrapper.setupState.value).toBe('foo')
  })
  it('should not double write value', async () => {
    const mock = createUseElementEventMock()

    useElementEventMock.mockImplementation(mock.useElementEvent)
    getNavigatorMock.mockImplementation(mock.getNavigator)

    const wrapper = mountComposition(() => {
      const {value, state, write} = useClipboard()
      return {
        state,
        value,
        write,
      }
    })

    expect(wrapper.setupState.state).toBe('idle')
    expect(wrapper.setupState.value).toBe(undefined)

    wrapper.setupState.write('foo')
    await wrapper.setupState.write('bar')
    expect(wrapper.setupState.state).toBe('writing')
    clock.tick(200)
    await flushPromises()
    expect(wrapper.setupState.state).toBe('idle')
    expect(wrapper.setupState.value).toBe('foo')
  })
})
