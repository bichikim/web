/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {SPoffoMotionSettings} from '../SPoffoMotionSettings'

const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {
    configurable: true,
    value: vi.fn(),
  }),
)
afterAll(() => {
  if (originalPopover === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
  }
})
afterEach(cleanup)
it('should expose actual model motions and distinguish none from the automatic choice', () => {
  const save = vi.fn()
  render(() => <SPoffoMotionSettings motions={['idle', 'wave']} onChange={save} />)
  const select = screen.getByRole('combobox', {name: '기본 애니메이션'})
  expect(select).toHaveTextContent('자동 · idle')
  fireEvent.click(select)
  fireEvent.click(screen.getByRole('option', {name: 'wave'}))
  expect(save).toHaveBeenLastCalledWith('wave')
  fireEvent.click(select)
  fireEvent.click(screen.getByRole('option', {name: '재생 안 함'}))
  expect(save).toHaveBeenLastCalledWith(null)
  fireEvent.click(select)
  fireEvent.click(screen.getByRole('option', {name: '자동 · idle'}))
  expect(save).toHaveBeenLastCalledWith(undefined)
})
it('should retain an unavailable saved selection instead of silently switching to another motion', () => {
  render(() => (
    <SPoffoMotionSettings motions={['idle']} value="removed-motion" onChange={vi.fn()} />
  ))
  expect(screen.getByRole('combobox', {name: '기본 애니메이션'})).toHaveTextContent(
    'removed-motion (사용 불가)',
  )
})
