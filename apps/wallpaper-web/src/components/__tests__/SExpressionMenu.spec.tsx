/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, renderHook, screen} from '@solidjs/testing-library'
import {afterEach, expect, test} from 'vitest'
import {useWidgetPreview} from '../../features/widget-preview'
import {SExpressionMenu} from '../SExpressionMenu'

afterEach(cleanup)

test('should offer 27 Korean presets and none without the removed watermark action', () => {
  const hook = renderHook(useWidgetPreview)
  render(() => <SExpressionMenu preview={hook.result} />)
  const trigger = screen.getByRole('button', {name: '표정 선택'})
  expect(trigger.getAttribute('aria-haspopup')).toBe('menu')
  const choices = screen.getAllByRole('menuitemradio')
  expect(choices).toHaveLength(28)
  expect(screen.queryByRole('menuitemradio', {name: '워터마크 숨기기'})).toBeNull()
  expect(choices.every((choice) => /[가-힣]/.test(choice.textContent ?? ''))).toBe(true)
  const coffee = screen.getByRole('menuitemradio', {name: '커피 들기'})
  fireEvent.click(coffee)
  expect(hook.result.expressionId()).toBe('커피 들기')
  expect(coffee.getAttribute('aria-checked')).toBe('true')
  expect(coffee.getAttribute('popovertargetaction')).toBe('hide')
  fireEvent.click(screen.getByRole('menuitemradio', {name: '없음'}))
  expect(hook.result.expressionId()).toBeNull()
  hook.cleanup()
})

test('should navigate choices with arrows and home or end keys', () => {
  const hook = renderHook(useWidgetPreview)
  render(() => <SExpressionMenu preview={hook.result} />)
  const menu = screen.getByRole('menu', {name: '표정·행동'})
  const choices = screen.getAllByRole('menuitemradio')
  choices[0]!.focus()
  fireEvent.keyDown(menu, {key: 'ArrowDown'})
  expect(document.activeElement).toBe(choices[1])
  fireEvent.keyDown(menu, {key: 'End'})
  expect(document.activeElement).toBe(choices.at(-1))
  fireEvent.keyDown(menu, {key: 'ArrowDown'})
  expect(document.activeElement).toBe(choices[0])
  fireEvent.keyDown(menu, {key: 'ArrowUp'})
  expect(document.activeElement).toBe(choices.at(-1))
  fireEvent.keyDown(menu, {key: 'Home'})
  expect(document.activeElement).toBe(choices[0])
  hook.cleanup()
})
