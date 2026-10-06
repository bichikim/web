/** @vitest-environment jsdom */
import {finishAnimation} from '../../__tests__/animation'
import {fireEvent, render, screen} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {PToastCard} from '../PToastCard'

describe('PToastCard', () => {
  it('should request dismissal from its accessible close button', () => {
    const dismiss = vi.fn()
    render(() => (
      <PToastCard
        notification={{id: 'first', message: '오류', tone: 'error'}}
        onDismiss={dismiss}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: m.toast_close()}))
    expect(dismiss).toHaveBeenCalledOnce()
  })

  it('should finish only its own exit animation and disable repeated close clicks', () => {
    const dismiss = vi.fn()
    const complete = vi.fn()
    render(() => (
      <PToastCard
        closing
        notification={{id: 'first', message: '오류', tone: 'error'}}
        onDismiss={dismiss}
        onExitComplete={complete}
      />
    ))
    expect(screen.getByRole('button', {name: m.toast_close()})).toBeDisabled()
    finishAnimation(screen.getByText('오류'), 'toast-exit')
    expect(complete).not.toHaveBeenCalled()
    finishAnimation(screen.getByRole('alert'), 'toast-enter')
    expect(complete).not.toHaveBeenCalled()
    finishAnimation(screen.getByRole('alert'), 'toast-exit')
    expect(complete).toHaveBeenCalledOnce()
  })
})
