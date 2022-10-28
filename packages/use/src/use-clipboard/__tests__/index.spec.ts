/**
 * @jest-environment jsdom
 */
import {flushPromises} from '@vue/test-utils'
import {mountComposition} from '@winter-love/vue-test'
import {setTimeoutPromise} from '@winter-love/utils'
import {SinonFakeTimers, useFakeTimers} from 'sinon'
import {useEvent} from 'src/use-event'
import {useClipboard} from '../'

jest.mock('src/use-event', () => {
  return {
    ...jest.requireActual('src/use-event'),
    useEvent: jest.fn(),
  }
})

jest.mock('@winter-love/utils', () => {
  return {
    ...jest.requireActual('@winter-love/utils'),
  }
})

const useEventMock = jest.mocked(useEvent)

const createUseElementEventMock = () => {
  const listeners = {}
  let _value = ''
  return {
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
  const mockClipboard = {
    readText: jest.fn(() => null),
    writeText: jest.fn(() => null),
  }
  afterEach(() => {
    useEventMock.mockRestore()
    mockClipboard.readText.mockRestore()
    mockClipboard.writeText.mockRestore()
    clock.restore()
  })
  let clock: SinonFakeTimers
  beforeEach(() => {
    ;(window.navigator as any).clipboard = mockClipboard
    clock = useFakeTimers()
  })

  it('should update value ref with window copy event or cut event', async () => {
    const mock = createUseElementEventMock()

    useEventMock.mockImplementation(mock.useElementEvent)

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
    mockClipboard.readText.mockResolvedValueOnce('foo')
    mock.trigger('copy')
    await flushPromises()
    expect(wrapper.setupState.value).toBe('foo')
    //
    mockClipboard.readText.mockResolvedValueOnce('bar')
    mock.trigger('cut')
    await flushPromises()
    expect(wrapper.setupState.value).toBe('bar')
  })

  it('should write value', async () => {
    const mock = createUseElementEventMock()

    useEventMock.mockImplementation(mock.useElementEvent)

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

    useEventMock.mockImplementation(mock.useElementEvent)

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
    await flushPromises()
    expect(mockClipboard.writeText).toHaveBeenCalledWith('foo')
    expect(wrapper.setupState.state).toBe('idle')
    expect(wrapper.setupState.value).toBe('foo')
  })
})
