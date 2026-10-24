/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal, useContext} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {
  ToastContext,
  type ToastContextValue,
  ToastInnerContext,
  type ToastInnerContextValue,
  ToastProvider,
  ToastRegion,
  useToast,
} from '../../index'

describe('ToastProvider', () => {
  it('should not let a replaced toast close the current message', () => {
    let context: ToastContextValue | undefined
    let messages: ToastInnerContextValue | undefined
    let closeOld: (() => void) | undefined

    const Probe = () => {
      context = useContext(ToastContext)
      messages = useContext(ToastInnerContext)
      return null
    }

    const view = render(() => (
      <ToastProvider>
        <Probe />
      </ToastProvider>
    ))

    context?.setMessage({
      closeHook: (close) => {
        closeOld = close
      },
      id: 'same',
      message: 'old',
    })
    context?.setMessage({id: 'same', message: 'new'})
    closeOld?.()

    expect(messages?.messages().get('same')?.message).toBe('new')
    view.unmount()
  })

  it('should dispose close hooks on replacement and provider cleanup', () => {
    let context: ToastContextValue | undefined
    const disposeFirst = vi.fn()
    const disposeSecond = vi.fn()

    const Probe = () => {
      context = useContext(ToastContext)
      return null
    }

    const view = render(() => (
      <ToastProvider>
        <Probe />
      </ToastProvider>
    ))

    context?.setMessage({closeHook: () => disposeFirst, id: 'same', message: 'first'})
    context?.setMessage({closeHook: () => disposeSecond, id: 'same', message: 'second'})
    expect(disposeFirst).toHaveBeenCalledOnce()

    view.unmount()
    expect(disposeSecond).toHaveBeenCalledOnce()
  })
})

type ToastApi = ReturnType<typeof useToast>

const ToastHarness = (props: {readonly onReady: (toast: ToastApi) => void}) => {
  const toast = useToast()
  props.onReady(toast)
  return (
    <section aria-label="Toasts">
      <span>Count {toast.count()}</span>
      <span>Waiting {toast.waitingCount()}</span>
      <ToastRegion>
        {(message, dismiss) => (
          <div role={message.tone === 'error' ? 'alert' : 'status'}>
            <span>{message.message}</span>
            <button type="button" onClick={dismiss}>
              Close
            </button>
          </div>
        )}
      </ToastRegion>
    </section>
  )
}

const renderToasts = () => {
  const [controller, setController] = createSignal<ToastApi | null>(null)
  const view = render(() => (
    <ToastProvider>
      <ToastHarness onReady={setController} />
    </ToastProvider>
  ))
  const toast = controller()
  if (toast === null) {
    throw new Error('Toast harness did not receive its provider.')
  }
  return {...view, toast}
}

describe('ToastProvider function API', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('should queue after three visible toasts and report total and waiting counts', () => {
    const {toast} = renderToasts()
    for (const message of ['first', 'second', 'third', 'fourth', 'fifth']) {
      toast.showToast({message, tone: 'error'})
    }
    expect(screen.getAllByRole('alert')).toHaveLength(3)
    expect(screen.queryByText('fourth')).toBeNull()
    expect(screen.getByText('Count 5')).toBeDefined()
    expect(screen.getByText('Waiting 2')).toBeDefined()
    fireEvent.click(within(screen.getAllByRole('alert')[0]).getByRole('button'))
    expect(screen.queryByText('first')).toBeNull()
    expect(screen.getByText('fourth')).toBeDefined()
    expect(screen.queryByText('fifth')).toBeNull()
    expect(screen.getByText('Count 4')).toBeDefined()
    expect(screen.getByText('Waiting 1')).toBeDefined()
  })

  it('should keep errors indefinitely until manually dismissed', () => {
    const {toast} = renderToasts()
    toast.showToast({message: 'error', tone: 'error'})
    vi.advanceTimersByTime(60_000)
    expect(screen.getByRole('alert').textContent).toContain('error')
    fireEvent.click(screen.getByRole('button', {name: 'Close'}))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(toast.count()).toBe(0)
  })

  it('should expire notifications after ten seconds visible and leave queued lifetimes untouched', () => {
    const {toast} = renderToasts()
    toast.showToast({message: 'error 1', tone: 'error'})
    toast.showToast({message: 'error 2', tone: 'error'})
    toast.showToast({message: 'notification 1'})
    toast.showToast({message: 'notification 2'})
    vi.advanceTimersByTime(9_999)
    expect(screen.getByText('notification 1')).toBeDefined()
    expect(screen.queryByText('notification 2')).toBeNull()
    vi.advanceTimersByTime(1)
    expect(screen.queryByText('notification 1')).toBeNull()
    expect(screen.getByText('notification 2')).toBeDefined()
    vi.advanceTimersByTime(9_999)
    expect(screen.getByText('notification 2')).toBeDefined()
    vi.advanceTimersByTime(1)
    expect(screen.queryByText('notification 2')).toBeNull()
    expect(toast.count()).toBe(2)
  })

  it('should dismiss notifications early by their returned ID and cancel their timer', () => {
    const {toast} = renderToasts()
    const id = toast.showToast({message: 'notification'})
    expect(vi.getTimerCount()).toBe(1)
    if (id === null) {
      throw new Error('Non-empty toast must return an ID.')
    }
    toast.dismissToast(id)
    expect(screen.queryByRole('status')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should preserve remaining lifetimes when another toast closes', () => {
    const {toast} = renderToasts()
    toast.showToast({message: 'error', tone: 'error'})
    toast.showToast({message: 'notification'})
    vi.advanceTimersByTime(7_000)
    fireEvent.click(within(screen.getByRole('alert')).getByRole('button'))
    vi.advanceTimersByTime(3_000)
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('should cancel active timers when the provider unmounts', () => {
    const view = renderToasts()
    view.toast.showToast({message: 'notification'})
    expect(vi.getTimerCount()).toBe(1)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('should omit blank input and keep separately requested duplicate messages', () => {
    const {toast} = renderToasts()
    expect(toast.showToast({message: '  '})).toBeNull()
    toast.showToast({message: 'same', tone: 'error'})
    toast.showToast({message: 'same', tone: 'error'})
    expect(screen.getAllByRole('alert')).toHaveLength(2)
    expect(toast.count()).toBe(2)
  })

  it('should isolate messages in separate providers', () => {
    const first = renderToasts()
    const second = renderToasts()
    first.toast.showToast({message: 'first provider', tone: 'error'})
    expect(first.toast.count()).toBe(1)
    expect(second.toast.count()).toBe(0)
    first.unmount()
    second.unmount()
  })
})
