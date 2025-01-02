/**
 * @jest-environment jsdom
 */
import {flushPromises, mount} from '@vue/test-utils'
import {SinonFakeTimers, useFakeTimers} from 'sinon'
import {defineComponent} from 'vue'
import {onEvent} from 'src/hooks/event'
import {useClipboard} from '../'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

vi.mock('src/hooks/event', async () => {
  return {
    ...(await vi.importActual('src/hooks/event')),
    onEvent: vi.fn(),
  }
})

const useEventMock = vi.mocked(onEvent)
const createUseElementEventMock = () => {
  const listeners = {}

  return {
    setValue: (_: string) => {
      // empty
    },
    trigger: (key: string, value?) => {
      listeners[key]?.(value)
    },
    useElementEvent: (_, key, listener: any) => {
      listeners[key] = listener
    },
  }
}

describe('clipboard', () => {
  const mockClipboard = {
    readText: vi.fn(() => null),
    writeText: vi.fn(() => null),
  }

  afterEach(() => {
    useEventMock.mockRestore()
    mockClipboard.readText.mockRestore()
    mockClipboard.writeText.mockRestore()
    clock.restore()
  })
  let clock: SinonFakeTimers
  beforeEach(() => {
    ;(globalThis.navigator as any).clipboard = mockClipboard
    clock = useFakeTimers()
  })

  it.skip('should update value ref with window copy event or cut event', async () => {
    const mock = createUseElementEventMock()

    useEventMock.mockImplementation(mock.useElementEvent)
    const wrapper = mount(
      defineComponent({
        setup() {
          const {value, state} = useClipboard()

          return {
            state,
            value,
          }
        },
      }),
    )
    const setupState = wrapper.vm.$.setupState

    expect(setupState.state).toBe('idle')
    expect(setupState.value).toBe(undefined)
    //
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockClipboard.readText.mockResolvedValueOnce('foo' as any)
    mock.trigger('copy')
    await flushPromises()
    expect(setupState.value).toBe('foo')
    //
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    mockClipboard.readText.mockResolvedValueOnce('bar' as any)
    mock.trigger('cut')
    await flushPromises()
    expect(setupState.value).toBe('bar')
  })

  it('should write value', async () => {
    const mock = createUseElementEventMock()

    useEventMock.mockImplementation(mock.useElementEvent)

    const wrapper = mount(
      defineComponent({
        setup() {
          const {value, state, write} = useClipboard()

          return {
            state,
            value,
            write,
          }
        },
      }),
    )
    const setupState = wrapper.vm.$.setupState

    expect(setupState.state).toBe('idle')
    expect(setupState.value).toBe(undefined)

    setupState.write('foo')
    expect(setupState.state).toBe('writing')
    clock.tick(200)
    await flushPromises()
    expect(setupState.state).toBe('idle')
    expect(setupState.value).toBe('foo')
  })
  it('should not double write value', async () => {
    const mock = createUseElementEventMock()

    useEventMock.mockImplementation(mock.useElementEvent)

    const wrapper = mount(
      defineComponent({
        setup: () => {
          const {value, state, write} = useClipboard()

          return {
            state,
            value,
            write,
          }
        },
      }),
    )
    const setupState = wrapper.vm.$.setupState

    expect(setupState.state).toBe('idle')
    expect(setupState.value).toBe(undefined)
    setupState.write('foo')
    expect(setupState.state).toBe('writing')
    await flushPromises()
    expect(mockClipboard.writeText).toHaveBeenCalledWith('foo')
    expect(setupState.state).toBe('idle')
    expect(setupState.value).toBe('foo')
  })
})
