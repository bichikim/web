/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {type Accessor, createSignal, Show} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {ToastProvider, ToastRegion, useToast} from '../../index'

interface ToastHarnessProps {
  readonly visible?: Accessor<boolean>
  readonly onReady: (toast: ReturnType<typeof useToast>) => void
}

const ToastHarness = (props: ToastHarnessProps) => {
  const toast = useToast()
  props.onReady(toast)
  return (
    <>
      <span>Count {toast.count()}</span>
      <Show when={props.visible?.() ?? true}>
        <ToastRegion deferDismiss>
          {(message, dismiss, exit) => (
            <div role="status" data-closing={exit.closing()}>
              <span>{message.message}</span>
              <button onClick={dismiss}>Close</button>
              <button onClick={exit.completeDismiss}>Finish exit</button>
            </div>
          )}
        </ToastRegion>
      </Show>
    </>
  )
}

const renderToasts = (visible?: Accessor<boolean>) => {
  const [api, setApi] = createSignal<ReturnType<typeof useToast> | null>(null)
  const view = render(() => (
    <ToastProvider>
      <ToastHarness onReady={setApi} visible={visible} />
    </ToastProvider>
  ))
  const toast = api()
  if (toast === null) {
    throw new Error('Missing toast provider')
  }
  return {...view, toast}
}

describe('ToastRegion deferred dismissal', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('should keep three cards and promote the queue only after exit completion', () => {
    const {toast} = renderToasts()
    for (const message of ['first', 'second', 'third', 'fourth']) {
      toast.showToast({message, tone: 'error'})
    }
    const first = screen.getAllByRole('status')[0]
    fireEvent.click(within(first).getByRole('button', {name: 'Close'}))
    expect(first.getAttribute('data-closing')).toBe('true')
    expect(screen.getAllByRole('status')).toHaveLength(3)
    expect(screen.queryByText('fourth')).toBeNull()
    fireEvent.click(within(first).getByRole('button', {name: 'Finish exit'}))
    expect(screen.queryByText('first')).toBeNull()
    expect(screen.getByText('fourth')).toBeDefined()
    expect(toast.count()).toBe(3)
  })

  it('should defer programmatic dismissal through the same renderer contract', () => {
    const {toast} = renderToasts()
    const id = toast.showToast({message: 'first', tone: 'error'})
    if (id === null) {
      throw new Error('Missing toast ID')
    }
    toast.dismissToast(id)
    expect(screen.getByRole('status').getAttribute('data-closing')).toBe('true')
    expect(toast.count()).toBe(1)
    fireEvent.click(screen.getByRole('button', {name: 'Finish exit'}))
    expect(toast.count()).toBe(0)
  })

  it('should animate notification expiry and start a queued timer after promotion', () => {
    const {toast} = renderToasts()
    toast.showToast({message: 'first'})
    toast.showToast({message: 'second', tone: 'error'})
    toast.showToast({message: 'third', tone: 'error'})
    toast.showToast({message: 'fourth'})
    vi.advanceTimersByTime(10_000)
    expect(screen.getAllByRole('status')[0].getAttribute('data-closing')).toBe('true')
    expect(screen.queryByText('fourth')).toBeNull()
    fireEvent.click(
      within(screen.getAllByRole('status')[0]).getByRole('button', {name: 'Finish exit'}),
    )
    vi.advanceTimersByTime(9_999)
    expect(screen.getAllByRole('status')[2].getAttribute('data-closing')).toBe('false')
    vi.advanceTimersByTime(1)
    expect(screen.getAllByRole('status')[2].getAttribute('data-closing')).toBe('true')
  })

  it('should finish an interrupted exit when the renderer unmounts', () => {
    const [visible, setVisible] = createSignal(true)
    const {toast} = renderToasts(visible)
    const id = toast.showToast({message: 'closing', tone: 'error'})
    toast.showToast({message: 'retained', tone: 'error'})
    if (id === null) {
      throw new Error('Missing toast ID')
    }
    toast.dismissToast(id)
    setVisible(false)
    expect(toast.count()).toBe(1)
    setVisible(true)
    expect(screen.getByRole('status').textContent).toContain('retained')
  })
})
