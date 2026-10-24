/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {useToast} from '../../index'
import {ToastAction} from '../ToastAction'
import {ToastActionBody} from '../ToastActionBody'
import {ToastActionList} from '../ToastActionList'
import {ToastBody} from '../ToastBody'
import {ToastItem} from '../ToastItem'
import {ToastMessage} from '../ToastMessage'
import {ToastProvider} from '../ToastProvider'
import {ToastTitle} from '../ToastTitle'
import {ToastContext, type ToastContextValue} from '../context'

const ToastApiProbe = (props: {readonly onReady: (toast: ReturnType<typeof useToast>) => void}) => {
  props.onReady(useToast())
  return null
}

afterEach(() => vi.useRealTimers())

describe('ToastBody', () => {
  it('should apply queue and visible expiry rules to function-created toasts', () => {
    vi.useFakeTimers()
    let toast: ReturnType<typeof useToast> | undefined
    render(() => (
      <ToastProvider>
        <ToastApiProbe
          onReady={(value) => {
            toast = value
          }}
        />
        <ToastBody>
          <ToastItem>
            <ToastMessage />
          </ToastItem>
        </ToastBody>
      </ToastProvider>
    ))
    for (const message of ['notice 1', 'notice 2', 'notice 3', 'notice 4']) {
      toast?.showToast({message})
    }
    expect(screen.getAllByText(/^notice/)).toHaveLength(3)
    expect(screen.queryByText('notice 4')).toBeNull()
    vi.advanceTimersByTime(10_000)
    expect(screen.getAllByText(/^notice/)).toHaveLength(1)
    expect(screen.getByText('notice 4')).toBeDefined()
    vi.advanceTimersByTime(10_000)
    expect(screen.queryByText('notice 4')).toBeNull()
  })
  it('should render message actions and close after the configured action', async () => {
    let context: ToastContextValue | undefined
    const action = vi.fn()
    const Probe = () => {
      context = useContext(ToastContext)

      return null
    }
    render(() => (
      <ToastProvider>
        <Probe />
        <ToastBody>
          <ToastItem>
            <ToastTitle />
            <ToastMessage />
            <ToastActionBody>
              <ToastActionList>
                <ToastAction />
              </ToastActionList>
            </ToastActionBody>
          </ToastItem>
        </ToastBody>
      </ToastProvider>
    ))

    context?.setMessage({
      actions: [{action, actionToClose: true, label: 'Undo', type: 'click'}],
      id: 'saved',
      message: 'Saved',
      title: 'Complete',
    })

    expect(screen.getByText('Complete')).toBeDefined()
    expect(screen.getByText('Saved')).toBeDefined()

    await fireEvent.click(screen.getByRole('button', {name: 'Undo'}))

    expect(action).toHaveBeenCalledOnce()
    expect(screen.queryByText('Saved')).toBeNull()
  })

  it('should render click-to-close messages as buttons', async () => {
    let context: ToastContextValue | undefined
    const Probe = () => {
      context = useContext(ToastContext)

      return null
    }
    render(() => (
      <ToastProvider>
        <Probe />
        <ToastBody>
          <ToastItem>
            <ToastMessage />
          </ToastItem>
        </ToastBody>
      </ToastProvider>
    ))

    context?.setMessage({clickToClose: true, id: 'notice', message: 'Notice'})
    const item = screen.getByRole('button', {name: 'Notice'})

    await fireEvent.click(item)

    expect(screen.queryByText('Notice')).toBeNull()
  })
})
