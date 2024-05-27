/**
 * @jest-environment jsdom
 */
import {flushPromises} from '@vue/test-utils'
import {mountComposition} from '@winter-love/test-utils'
import {SinonFakeTimers, useFakeTimers} from 'sinon'
import {onEvent} from 'src/hooks/event'
import {useClipboard} from '../'

jest.mock('src/hooks/event', () => {
  return {
    ...jest.requireActual('src/hooks/event'),
    onEvent: jest.fn(),
  }
})

const useEventMock = jest.mocked(onEvent)

const createUseElementEventMock = () => {
  const listeners = {}
  let value_ = ''
  return {
    setValue: (value: string) => {
      value_ = value
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
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    mockClipboard.readText.mockResolvedValueOnce('foo' as any)
    mock.trigger('copy')
    await flushPromises()
    expect(wrapper.setupState.value).toBe('foo')
    //
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    mockClipboard.readText.mockResolvedValueOnce('bar' as any)
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
