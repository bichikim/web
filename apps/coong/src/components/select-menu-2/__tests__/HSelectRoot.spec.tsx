/**
 * @vitest-environment jsdom
 */
import {describe, expect, it, vi} from 'vitest'
import {render} from '@solidjs/testing-library'
import {createSignal, onMount} from 'solid-js'
import {HSelectRoot} from '../HSelectRoot'
import {useSelectMenu2Context} from '../context'

vi.mock('@floating-ui/dom', () => ({
  autoUpdate: vi.fn(() => vi.fn()),
}))

describe('HSelectRoot', () => {
  it('should expose open, onOpen, onClose, and anchorBounds through context', () => {
    const [getContext, setContext] = createSignal<
      ReturnType<typeof useSelectMenu2Context> | undefined
    >()

    render(() => (
      <HSelectRoot>
        <ContextProbe onReady={setContext} />
      </HSelectRoot>
    ))

    const context = getContext()

    expect(context).toBeDefined()
    expect(context?.open()).toBe(false)
    expect(context?.anchorBounds()).toBeUndefined()
  })

  it('should set open to true when onOpen is called with an element', () => {
    const onOpened = vi.fn()
    const [getContext, setContext] = createSignal<
      ReturnType<typeof useSelectMenu2Context> | undefined
    >()
    const trigger = document.createElement('button')

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    render(() => (
      <HSelectRoot onOpened={onOpened}>
        <ContextProbe onReady={setContext} />
      </HSelectRoot>
    ))

    getContext()?.onOpen(trigger)

    expect(getContext()?.open()).toBe(true)
    expect(getContext()?.anchorBounds()).toEqual({
      height: 32,
      width: 224,
      x: 100,
      y: 8,
    })
    expect(onOpened).toHaveBeenCalledWith(trigger)
    expect(onOpened).toHaveBeenCalledTimes(1)
  })

  it('should set open to false when onClose is called', () => {
    const onClosed = vi.fn()
    const [getContext, setContext] = createSignal<
      ReturnType<typeof useSelectMenu2Context> | undefined
    >()
    const trigger = document.createElement('button')

    render(() => (
      <HSelectRoot onClosed={onClosed}>
        <ContextProbe onReady={setContext} />
      </HSelectRoot>
    ))

    getContext()?.onOpen(trigger)
    getContext()?.onClose()

    expect(getContext()?.open()).toBe(false)
    expect(getContext()?.anchorBounds()).toBeUndefined()
    expect(onClosed).toHaveBeenCalledTimes(1)
  })

  it('should update anchor bounds without reopening when onOpen is called while open', () => {
    const onOpened = vi.fn()
    const [getContext, setContext] = createSignal<
      ReturnType<typeof useSelectMenu2Context> | undefined
    >()
    const firstTrigger = document.createElement('button')
    const secondTrigger = document.createElement('button')

    vi.spyOn(firstTrigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })
    vi.spyOn(secondTrigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 60,
      height: 32,
      left: 200,
      right: 424,
      toJSON: () => ({}),
      top: 28,
      width: 224,
      x: 200,
      y: 28,
    })

    render(() => (
      <HSelectRoot onOpened={onOpened}>
        <ContextProbe onReady={setContext} />
      </HSelectRoot>
    ))

    getContext()?.onOpen(firstTrigger)
    getContext()?.onOpen(secondTrigger)

    expect(getContext()?.open()).toBe(true)
    expect(getContext()?.anchorBounds()).toEqual({
      height: 32,
      width: 224,
      x: 200,
      y: 28,
    })
    expect(onOpened).toHaveBeenCalledTimes(1)
  })

  it('should not call onClosed when onClose is called while already closed', () => {
    const onClosed = vi.fn()
    const [getContext, setContext] = createSignal<
      ReturnType<typeof useSelectMenu2Context> | undefined
    >()

    render(() => (
      <HSelectRoot onClosed={onClosed}>
        <ContextProbe onReady={setContext} />
      </HSelectRoot>
    ))

    getContext()?.onClose()

    expect(onClosed).not.toHaveBeenCalled()
  })

  it('should not subscribe autoUpdate before panel is registered', async () => {
    const {autoUpdate} = await import('@floating-ui/dom')
    vi.mocked(autoUpdate).mockClear()

    const trigger = document.createElement('button')
    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })

    const [getContext, setContext] = createSignal<
      ReturnType<typeof useSelectMenu2Context> | undefined
    >()

    render(() => (
      <HSelectRoot>
        <ContextProbe onReady={setContext} />
      </HSelectRoot>
    ))

    getContext()?.onOpen(trigger)

    expect(vi.mocked(autoUpdate)).not.toHaveBeenCalled()
  })

  it('should subscribe autoUpdate after panel is registered while open', async () => {
    const {autoUpdate} = await import('@floating-ui/dom')
    vi.mocked(autoUpdate).mockClear()

    const trigger = document.createElement('button')
    const panel = document.createElement('div')

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 224,
      toJSON: () => ({}),
      top: 0,
      width: 224,
      x: 0,
      y: 0,
    })

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1280,
    })

    const [getContext, setContext] = createSignal<
      ReturnType<typeof useSelectMenu2Context> | undefined
    >()

    render(() => (
      <HSelectRoot>
        <ContextProbe onReady={setContext} />
      </HSelectRoot>
    ))

    getContext()?.onOpen(trigger)
    getContext()?.registerPanel(panel)

    expect(vi.mocked(autoUpdate)).toHaveBeenCalledTimes(1)
  })

  it('should stop autoUpdate when unregisterPanel is called', async () => {
    const {autoUpdate} = await import('@floating-ui/dom')
    const cleanup = vi.fn()
    vi.mocked(autoUpdate).mockReturnValue(cleanup)

    const trigger = document.createElement('button')
    const panel = document.createElement('div')

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue({
      bottom: 40,
      height: 32,
      left: 100,
      right: 324,
      toJSON: () => ({}),
      top: 8,
      width: 224,
      x: 100,
      y: 8,
    })
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 0,
      left: 0,
      right: 224,
      toJSON: () => ({}),
      top: 0,
      width: 224,
      x: 0,
      y: 0,
    })

    const [getContext, setContext] = createSignal<
      ReturnType<typeof useSelectMenu2Context> | undefined
    >()

    render(() => (
      <HSelectRoot>
        <ContextProbe onReady={setContext} />
      </HSelectRoot>
    ))

    getContext()?.onOpen(trigger)
    getContext()?.registerPanel(panel)
    getContext()?.unregisterPanel(panel)

    expect(cleanup).toHaveBeenCalledTimes(1)
  })

  it('should throw when useSelectMenu2Context is used outside HSelectRoot', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {
      // void
    })

    expect(() => {
      render(() => <ContextProbe onReady={() => undefined} />)
    }).toThrow('useSelectMenu2Context must be used within HSelectRoot')

    consoleError.mockRestore()
  })
})

interface ContextProbeProps {
  onReady: (context: ReturnType<typeof useSelectMenu2Context>) => void
}

const ContextProbe = (props: ContextProbeProps) => {
  onMount(() => {
    props.onReady(useSelectMenu2Context())
  })

  return null
}
