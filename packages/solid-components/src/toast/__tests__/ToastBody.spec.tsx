/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {useContext} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {ToastAction} from '../ToastAction'
import {ToastActionBody} from '../ToastActionBody'
import {ToastActionList} from '../ToastActionList'
import {ToastBody} from '../ToastBody'
import {ToastItem} from '../ToastItem'
import {ToastMessage} from '../ToastMessage'
import {ToastProvider} from '../ToastProvider'
import {ToastTitle} from '../ToastTitle'
import {ToastContext, type ToastContextValue} from '../context'

describe('ToastBody', () => {
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
