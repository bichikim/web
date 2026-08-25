/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PScreenSaver} from '../PScreenSaver'

describe('PScreenSaver', () => {
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
    const [isMusicPlaying, setIsMusicPlaying] = createSignal(true)
    const onDismiss = vi.fn()
    render(() => (
      <PScreenSaver
        isActive={isActive()}
        isMusicPlaying={isMusicPlaying()}
        onDismiss={onDismiss}
        timer={{status: '집중 중', time: '24:59'}}
        track={{artist: 'rainymonday', title: 'Sunday Morning Coffee'}}
      />
    ))

    setIsActive(true)
    const dialog = screen.getByRole('dialog', {name: '스크린 세이버'})
    expect(showModal).toHaveBeenCalledOnce()
    expect((dialog as HTMLDialogElement).open).toBe(true)
    const content = dialog.querySelector('.pomo-screen-saver__content')
    const timerRegion = screen.getByRole('region', {name: '포모도로 상태'})
    expect(content?.classList).toContain('justify-items-stretch')
    expect(content?.classList).toContain('text-left')
    expect(timerRegion.classList).toContain('justify-items-start')
    expect(timerRegion.textContent).toContain('24:59')
    expect(Array.from(timerRegion.children, (element) => element.textContent)).toEqual([
      '24:59',
      '집중 중',
    ])
    const trackRegion = screen.getByRole('region', {name: '현재 음악'})
    expect(trackRegion.textContent).toContain('Sunday Morning Coffee')
    expect(trackRegion.textContent).toContain('rainymonday')
    expect(trackRegion.textContent).toContain('음악 재생 중')
    expect(trackRegion.querySelectorAll('.pomo-overflow-marquee')).toHaveLength(2)
    const playbackIcon = trackRegion.querySelector('.pomo-screen-saver__playback-icon')
    expect(playbackIcon?.classList).toContain('i-tabler-player-play')

    setIsMusicPlaying(false)
    expect(trackRegion.textContent).toContain('음악 일시 정지')
    expect(playbackIcon?.classList).toContain('i-tabler-player-pause')

    fireEvent.pointerDown(dialog)
    expect(onDismiss).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
    expect((dialog as HTMLDialogElement).open).toBe(false)
  })

  it('should remain meaningful without presentation props', () => {
    render(() => <PScreenSaver />)

    expect(screen.getByRole('dialog', {hidden: true}).getAttribute('aria-label')).toBe(
      '스크린 세이버',
    )
    expect(screen.queryByRole('region', {name: '포모도로 상태'})).toBeNull()
  })
})
