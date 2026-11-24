/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import {SPreviewWindow} from '../SPreviewWindow'

const originalShow = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const originalHide = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hidePopover')
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()})
  Object.defineProperty(HTMLElement.prototype, 'hidePopover', {configurable: true, value: vi.fn()})
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
afterAll(() => {
  if (originalShow === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', originalShow)
  }
  if (originalHide === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'hidePopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'hidePopover', originalHide)
  }
})

it('should move the same interactive preview between overview and window without losing its state', () => {
  const [section, setSection] = createSignal('overview')
  const [value, setValue] = createSignal(0)
  render(() => (
    <SPreviewWindow inline={section() === 'overview'} open>
      <button onClick={() => setValue((current) => current + 1)}>{value()}</button>
    </SPreviewWindow>
  ))
  const control = screen.getByRole('button', {name: '0'})
  fireEvent.click(control)
  setSection('basic')
  const dialog = screen.getByRole('dialog', {name: '미리보기'})
  expect(dialog).toHaveAttribute('popover', 'manual')
  expect(dialog).toHaveAttribute('aria-modal', 'false')
  expect(within(dialog).getByRole('button', {name: '1'})).toBe(control)
  const container = control.parentElement
  setSection('touch')
  expect(control.parentElement).toBe(container)
  setSection('overview')
  expect(screen.queryByRole('dialog', {name: '미리보기'})).toBeNull()
  expect(screen.getByRole('button', {name: '1'})).toBe(control)
})

it('should close on Escape and restore focus without removing the preview state', () => {
  const [open, setOpen] = createSignal(false)
  render(() => (
    <>
      <button onClick={() => setOpen(true)}>열기</button>
      <SPreviewWindow open={open()} onClose={() => setOpen(false)}>
        <canvas aria-label="캐릭터" />
      </SPreviewWindow>
    </>
  ))
  const trigger = screen.getByRole('button', {name: '열기'})
  trigger.focus()
  fireEvent.click(trigger)
  const dialog = screen.getByRole('dialog', {name: '미리보기'})
  const canvas = dialog.querySelector('canvas')
  expect(dialog).toHaveFocus()
  fireEvent.keyDown(dialog, {key: 'Escape'})
  expect(screen.queryByRole('dialog', {name: '미리보기'})).toBeNull()
  expect(trigger).toHaveFocus()
  fireEvent.click(trigger)
  expect(screen.getByRole('dialog', {name: '미리보기'}).querySelector('canvas')).toBe(canvas)
})

it('should hide outside the widget editor and reopen the same window when returning', () => {
  const [active, setActive] = createSignal(true)
  render(() => (
    <SPreviewWindow open active={active()}>
      캐릭터
    </SPreviewWindow>
  ))
  const dialog = screen.getByRole('dialog', {name: '미리보기'})
  setActive(false)
  expect(screen.queryByRole('dialog', {name: '미리보기'})).toBeNull()
  setActive(true)
  expect(screen.getByRole('dialog', {name: '미리보기'})).toBe(dialog)
})

it('should move with keyboard and clamp its position within the viewport', () => {
  render(() => <SPreviewWindow open>캐릭터</SPreviewWindow>)
  const dialog = screen.getByRole('dialog', {name: '미리보기'})
  const handle = within(dialog).getByRole('button', {name: '미리보기 창 이동'})
  fireEvent.keyDown(handle, {key: 'ArrowLeft'})
  fireEvent.keyDown(handle, {key: 'ArrowUp'})
  expect(dialog.style.getPropertyValue('--preview-x')).toBe('0.99')
  expect(dialog.style.getPropertyValue('--preview-y')).toBe('0.99')
  fireEvent.keyDown(handle, {key: 'ArrowRight'})
  fireEvent.keyDown(handle, {key: 'ArrowRight'})
  expect(dialog.style.getPropertyValue('--preview-x')).toBe('1')
})
