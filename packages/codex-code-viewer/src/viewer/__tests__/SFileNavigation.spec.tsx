/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SFileNavigation} from '../SFileNavigation'

afterEach(cleanup)
it('should disable unavailable history directions and update them without recreating controls', () => {
  const [back, setBack] = createSignal(false)
  const [forward, setForward] = createSignal(false)
  const move = vi.fn()
  render(() => <SFileNavigation canBack={back()} canForward={forward()} onMove={move} />)
  const previous = screen.getByRole('button', {name: '뒤로 이동'})
  const next = screen.getByRole('button', {name: '앞으로 이동'})
  expect(previous).toHaveProperty('disabled', true)
  expect(next).toHaveProperty('disabled', true)
  fireEvent.click(previous)
  expect(move).not.toHaveBeenCalled()
  setBack(true)
  expect(previous).toHaveProperty('disabled', false)
  fireEvent.click(previous)
  expect(move).toHaveBeenCalledWith(-1)
  setBack(false)
  setForward(true)
  expect(previous).toHaveProperty('disabled', true)
  expect(next).toHaveProperty('disabled', false)
  expect(screen.getByRole('button', {name: '앞으로 이동'})).toBe(next)
})
