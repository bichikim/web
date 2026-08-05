import {render} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {
  ToastContext,
  type ToastContextValue,
  ToastInnerContext,
  type ToastInnerContextValue,
} from './context'
import {ToastProvider} from './ToastProvider'

describe('ToastProvider', () => {
  it('does not let a replaced toast close the current message', () => {
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

  it('disposes close hooks on replacement and provider cleanup', () => {
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
