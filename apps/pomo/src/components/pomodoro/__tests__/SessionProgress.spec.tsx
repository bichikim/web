/** @vitest-environment jsdom */

import {createSignal} from 'solid-js'
import {fireEvent, render} from '@solidjs/testing-library'
import {describe, expect, it, vi} from 'vitest'
import type {PSceneStyle} from '../../../features/focus-room-animation'
import {PomodoroSessionProgress} from '../SessionProgress'
import {CLASSES} from '../shared'

describe('PomodoroSessionProgress', () => {
  it.each([
    {count: -Infinity, length: 0},
    {count: -2, length: 0},
    {count: -0, length: 0},
    {count: NaN, length: 0},
    {count: 0.9, length: 0},
    {count: 1, length: 1},
    {count: 1.9, length: 1},
    {count: 2, length: 2},
    {count: 4, length: 4},
    {count: 12, length: 12},
    {count: 13, length: 13},
  ])('should retain native range length $length and raw total $count', ({count, length}) => {
    const view = render(() => (
      <PomodoroSessionProgress completedCount={1} onReset={() => undefined} sessionCount={count} />
    ))
    const progress = view.getByLabelText(`${count}회 중 1회 집중 완료`)

    expect(progress.children).toHaveLength(length)
    expect(progress).toHaveAttribute('class', CLASSES.pomodoroPanelSessions)
    expect(progress.parentElement).toHaveAttribute('class', CLASSES.pomodoroPanelSessionRow)
    for (const [position, marker] of Array.from(progress.children).entries()) {
      expect(marker.tagName).toBe('SPAN')
      expect(marker).toHaveAttribute('class', CLASSES.pomodoroPanelSession)
      expect(marker).toHaveAttribute('aria-hidden', 'true')
      expect(marker.hasAttribute('data-complete')).toBe(position < 1)
    }
  })

  it('should retain numeric marker identity across completion, expansion and shrinking', () => {
    const [count, setCount] = createSignal(2)
    const [completed, setCompleted] = createSignal(0)
    const view = render(() => (
      <PomodoroSessionProgress
        completedCount={completed()}
        onReset={() => undefined}
        sessionCount={count()}
      />
    ))
    const progress = view.getByLabelText('2회 중 0회 집중 완료')
    const initial = Array.from(progress.children)

    for (const completion of [1, 0.5, -1, 3, NaN, 2]) {
      setCompleted(completion)
      expect(view.getByLabelText(`2회 중 ${completion}회 집중 완료`)).toBe(progress)
      Array.from(progress.children).forEach((marker, position) => {
        expect(marker).toBe(initial[position])
        expect(marker.hasAttribute('data-complete')).toBe(position < completion)
      })
    }
    setCount(4)
    expect(view.getByLabelText('4회 중 2회 집중 완료')).toBe(progress)
    expect(progress.children).toHaveLength(4)
    const expanded = Array.from(progress.children)
    expect(expanded[0]).toBe(initial[0])
    expect(expanded[1]).toBe(initial[1])
    expect(expanded.map((marker) => marker.hasAttribute('data-complete'))).toEqual([
      true,
      true,
      false,
      false,
    ])
    setCount(1)
    expect(view.getByLabelText('1회 중 2회 집중 완료')).toBe(progress)
    expect(progress.children).toHaveLength(1)
    expect(progress.firstElementChild).toBe(initial[0])
    expect(expanded.slice(1).every((marker) => !marker.isConnected)).toBe(true)
    setCount(0)
    expect(view.getByLabelText('0회 중 2회 집중 완료')).toBe(progress)
    expect(progress.children).toHaveLength(0)
  })

  it('should react to reset availability, callback and scene icon without replacing markers', () => {
    const [completed, setCompleted] = createSignal(0)
    const [style, setStyle] = createSignal<PSceneStyle>('original')
    const firstReset = vi.fn()
    const nextReset = vi.fn()
    const [reset, setReset] = createSignal(firstReset)
    const view = render(() => (
      <PomodoroSessionProgress
        completedCount={completed()}
        onReset={reset()}
        sceneStyle={style()}
        sessionCount={2}
      />
    ))
    const marker = view.getByLabelText('2회 중 0회 집중 완료').firstElementChild
    expect(view.queryByRole('button', {name: '세션 초기화'})).toBeNull()
    setCompleted(1)
    const button = view.getByRole('button', {name: '세션 초기화'})
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveAttribute('class', CLASSES.pomodoroPanelSessionReset)
    expect(button.firstElementChild).toHaveAttribute('aria-hidden', 'true')
    expect(button.firstElementChild).toHaveClass('i-tabler-refresh', 'size-3.5')
    fireEvent.click(button)
    expect(firstReset).toHaveBeenCalledExactlyOnceWith()
    setReset(() => nextReset)
    setStyle('scribble')
    expect(view.getByRole('button', {name: '세션 초기화'})).toBe(button)
    expect(button.firstElementChild).toHaveClass('i-pomo-scribble:refresh', 'size-3.5')
    fireEvent.click(button)
    expect(nextReset).toHaveBeenCalledExactlyOnceWith()
    expect(firstReset).toHaveBeenCalledTimes(1)
    expect(view.getByLabelText('2회 중 1회 집중 완료').firstElementChild).toBe(marker)
    setCompleted(0)
    expect(view.queryByRole('button', {name: '세션 초기화'})).toBeNull()
  })
})
