/** @vitest-environment jsdom */

import {fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {FocusRoomModal, type FocusRoomModalProps} from '../../design-system/FocusRoomModal'
import {FocusRoomPomodoro} from '../FocusRoomPomodoro'

vi.mock('../../design-system/FocusRoomModal', () => ({
  FocusRoomModal: vi.fn(),
}))

describe('FocusRoomPomodoro', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-13T00:00:00.000Z'))
    vi.mocked(FocusRoomModal).mockImplementation((props: FocusRoomModalProps) => {
      return (
        <div aria-label={props.title} hidden={!props.isOpen} role="dialog">
          <p>{props.description}</p>
          {props.children}
          <button onClick={() => props.onOpenChange(false)} type="button">
            닫기
          </button>
        </div>
      )
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('should expose the timer state and primary controls through an accessible dialog', () => {
    const onOpenChange = vi.fn()
    render(() => <FocusRoomPomodoro onOpenChange={onOpenChange} />)

    const trigger = screen.getByRole('button', {
      name: '포모도로 열기, 집중 준비, 25:00',
    })
    expect(trigger.querySelector('.focus-room-pomodoro__trigger-status')).toBeNull()
    const characterEmotion = trigger.querySelector('.focus-room-character-emotion')
    expect(characterEmotion?.getAttribute('data-emotion')).toBe('focus')
    expect(characterEmotion?.hasAttribute('data-active')).toBe(false)
    fireEvent.click(trigger)

    expect(onOpenChange).toHaveBeenLastCalledWith(true)
    const dialog = screen.getByRole('dialog', {name: '포모도로'})
    expect(dialog.hidden).toBe(false)
    expect(screen.queryByText('집중 1/4 · 25분')).toBeNull()
    expect(screen.getByLabelText('4회 중 0회 집중 완료')).toBeDefined()

    fireEvent.click(screen.getByRole('button', {name: '집중 시작'}))
    expect(screen.getByRole('button', {name: '일시정지'})).toBeDefined()
    expect(screen.getByRole('button', {name: '현재 세션 종료'})).toBeDefined()
    expect(screen.getByRole('button', {name: '포모도로 열기, 집중 중, 25:00'})).toBeDefined()
    expect(characterEmotion?.getAttribute('data-active')).toBe('')

    vi.advanceTimersByTime(1_000)
    expect(within(dialog).getByText('24:59')).toBeDefined()

    fireEvent.click(screen.getByRole('button', {name: '일시정지'}))
    expect(screen.getByRole('button', {name: '계속하기'})).toBeDefined()
    expect(characterEmotion?.hasAttribute('data-active')).toBe(false)

    fireEvent.click(screen.getByRole('button', {name: '현재 세션 종료'}))
    expect(screen.getByRole('button', {name: '집중 시작'})).toBeDefined()
    expect(screen.queryByRole('button', {name: '현재 세션 종료'})).toBeNull()

    fireEvent.click(screen.getByRole('button', {name: '다음 단계로 이동'}))
    expect(screen.getByRole('button', {name: '휴식 시작'})).toBeDefined()
    expect(screen.getByRole('button', {name: '포모도로 열기, 휴식 준비, 05:00'})).toBeDefined()
    expect(characterEmotion?.getAttribute('data-emotion')).toBe('rest')
    expect(screen.getByRole('button', {name: '세션 초기화'})).toBeDefined()

    fireEvent.click(screen.getByRole('button', {name: /4세션/}))
    expect(dialog.querySelector('.focus-room-pomodoro-panel__ring')).toBeNull()
    fireEvent.input(screen.getByRole('spinbutton', {name: '집중 횟수(회)'}), {
      target: {value: '6'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '집중 시간(분)'}), {
      target: {value: '30'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '짧은 휴식 시간(분)'}), {
      target: {value: '7'},
    })
    fireEvent.input(screen.getByRole('spinbutton', {name: '긴 휴식 시간(분)'}), {
      target: {value: '20'},
    })
    fireEvent.click(screen.getByRole('button', {name: '설정 저장'}))
    expect(dialog.querySelector('.focus-room-pomodoro-panel__ring')).toBeDefined()
    expect(screen.getByRole('button', {name: '포모도로 열기, 휴식 준비, 07:00'})).toBeDefined()
    expect(screen.getByRole('button', {name: /6세션 · 집중 30분/})).toBeDefined()
    expect(screen.getByLabelText('6회 중 1회 집중 완료')).toBeDefined()

    fireEvent.click(screen.getByRole('button', {name: /6세션/}))
    expect(screen.getByRole('button', {name: '취소'})).toBeDefined()
    fireEvent.click(screen.getByRole('button', {name: '취소'}))
    fireEvent.click(screen.getByRole('button', {name: '세션 초기화'}))
    expect(screen.getByRole('button', {name: '포모도로 열기, 집중 준비, 30:00'})).toBeDefined()
    expect(dialog.querySelector('.focus-room-pomodoro-panel__ring')).toBeDefined()
    expect(screen.getByLabelText('6회 중 0회 집중 완료')).toBeDefined()
    expect(screen.queryByRole('button', {name: '세션 초기화'})).toBeNull()

    fireEvent.click(screen.getByRole('button', {name: '닫기'}))
    expect(onOpenChange).toHaveBeenLastCalledWith(false)
  })
})
