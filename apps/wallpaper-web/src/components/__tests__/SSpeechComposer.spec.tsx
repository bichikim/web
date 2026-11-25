/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {SSpeechComposer} from '../SSpeechComposer'

afterEach(cleanup)

test('should retain an editable draft without readiness or unrelated speech capabilities', () => {
  const speak = vi.fn()
  render(() => <SSpeechComposer speech={{busy: () => false, speak}} />)
  const disclosure = screen.getByRole('button', {name: '직접 입력'})
  fireEvent.click(disclosure)
  const input = screen.getByRole('textbox', {name: '직접 입력'})
  fireEvent.input(input, {target: {value: '오늘도 안녕!'}})
  expect(screen.getByRole('button', {name: '말하기'}).hasAttribute('disabled')).toBe(true)
  fireEvent.submit(input.closest('form')!)
  expect(speak).not.toHaveBeenCalled()
  fireEvent.click(disclosure)
  fireEvent.click(disclosure)
  expect((screen.getByRole('textbox', {name: '직접 입력'}) as HTMLTextAreaElement).value).toBe(
    '오늘도 안녕!',
  )
})

test('should submit a draft when readiness arrives and reject submission while busy', () => {
  const [ready, setReady] = createSignal(false)
  const [busy, setBusy] = createSignal(false)
  const speak = vi.fn()
  render(() => <SSpeechComposer ready={ready()} speech={{busy, speak}} />)
  fireEvent.click(screen.getByRole('button', {name: '직접 입력'}))
  const input = screen.getByRole('textbox', {name: '직접 입력'})
  fireEvent.input(input, {target: {value: '안녕하세요'}})
  setReady(true)
  expect(screen.getByRole('button', {name: '말하기'}).hasAttribute('disabled')).toBe(false)
  fireEvent.submit(input.closest('form')!)
  expect(speak).toHaveBeenCalledExactlyOnceWith('안녕하세요')
  setBusy(true)
  expect(screen.getByRole('button', {name: '말하기'}).hasAttribute('disabled')).toBe(true)
  fireEvent.submit(input.closest('form')!)
  expect(speak).toHaveBeenCalledTimes(1)
})
