/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {FocusRoomScreenSaver} from '../FocusRoomScreenSaver'

describe('FocusRoomScreenSaver', () => {
  const close = vi.fn(function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
  })
  const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  })

  beforeEach(() => {
    close.mockClear()
    showModal.mockClear()
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: close,
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: showModal,
    })
  })

  afterEach(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  })

  it('should use the top layer while active and request dismissal on input', () => {
    const [isActive, setIsActive] = createSignal(false)
    const onDismiss = vi.fn()
    render(() => (
      <FocusRoomScreenSaver
        isActive={isActive()}
        onDismiss={onDismiss}
        timer={{status: '집중 중', time: '24:59'}}
        track={{artist: 'rainymonday', title: 'Sunday Morning Coffee'}}
      />
    ))

    setIsActive(true)
    const dialog = screen.getByRole('dialog', {name: '스크린 세이버'})
    expect(showModal).toHaveBeenCalledOnce()
    expect((dialog as HTMLDialogElement).open).toBe(true)
    expect(screen.getByRole('region', {name: '포모도로 상태'}).textContent).toContain('24:59')
    expect(screen.getByRole('region', {name: '현재 음악'}).textContent).toContain(
      'Sunday Morning Coffee',
    )
    expect(screen.getByRole('region', {name: '현재 음악'}).textContent).toContain('rainymonday')
    expect(screen.getByText('터치하거나 마우스를 움직이거나 클릭하면 돌아가요').textContent).toBe(
      '터치하거나 마우스를 움직이거나 클릭하면 돌아가요',
    )

    fireEvent.pointerDown(dialog)
    expect(onDismiss).toHaveBeenCalledOnce()

    setIsActive(false)
    expect(close).toHaveBeenCalledOnce()
    expect((dialog as HTMLDialogElement).open).toBe(false)
  })
})
