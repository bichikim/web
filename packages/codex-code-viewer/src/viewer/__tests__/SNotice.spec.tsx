/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SNotice} from '../SNotice'

const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')

describe('SNotice', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    })
  })
  afterEach(() => {
    cleanup()
    if (originalPopover === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
    }
  })

  it('should dismiss when its own lifetime animation ends and ignore child animation events', () => {
    const onDismiss = vi.fn()
    render(() => <SNotice message="파일을 찾을 수 없습니다." onDismiss={onDismiss} />)
    const message = screen.getByRole('status')
    const notice = message.closest('[popover]')!
    fireEvent.animationEnd(message)
    expect(onDismiss).not.toHaveBeenCalled()
    fireEvent.animationEnd(notice)
    expect(onDismiss).toHaveBeenCalledOnce()
  })

  it('should allow manual dismissal before automatic expiry', () => {
    const onDismiss = vi.fn()
    render(() => <SNotice message="파일을 찾을 수 없습니다." onDismiss={onDismiss} />)
    fireEvent.click(screen.getByRole('button', {name: '알림 닫기'}))
    expect(onDismiss).toHaveBeenCalledOnce()
  })
})
