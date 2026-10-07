/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SFilePicker} from '../SFilePicker'

const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')

describe('SFilePicker', () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    })
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })
  afterEach(() => {
    cleanup()
    for (const [name, descriptor] of [
      ['showPopover', originalPopover],
      ['scrollIntoView', originalScroll],
    ] as const) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(HTMLElement.prototype, name)
      } else {
        Object.defineProperty(HTMLElement.prototype, name, descriptor)
      }
    }
  })

  it('should dismiss the result popup on native light dismiss without discarding the query', () => {
    render(() => (
      <SFilePicker onOpen={vi.fn()} onFind={vi.fn()} searchable files={['src/editor.tsx']} />
    ))
    const input = screen.getByRole('combobox', {name: '파일 경로 또는 검색어'})
    fireEvent.input(input, {target: {value: 'editor'}})
    expect(input.getAttribute('aria-expanded')).toBe('true')
    const list = screen.getByRole('listbox', {name: '파일 검색 결과'})
    const popup = list.closest('[popover]')
    expect(popup).not.toBeNull()
    const closed = new Event('beforetoggle')
    Object.defineProperty(closed, 'newState', {value: 'closed'})
    fireEvent(popup!, closed)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect((input as HTMLInputElement).value).toBe('editor')
  })

  it('should open after pointer focus completes and reopen after native dismissal', () => {
    render(() => (
      <SFilePicker onOpen={vi.fn()} onFind={vi.fn()} searchable files={['src/editor.tsx']} />
    ))
    const input = screen.getByRole('combobox', {name: '파일 경로 또는 검색어'})
    fireEvent.pointerDown(input)
    fireEvent.focusIn(input)
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.click(input)
    const popup = screen.getByRole('listbox').closest('[popover]')!
    const closed = new Event('beforetoggle')
    Object.defineProperty(closed, 'newState', {value: 'closed'})
    fireEvent(popup, closed)
    fireEvent.click(input)
    expect(screen.getByRole('listbox')).toBeDefined()
  })

  it('should keep keyboard selection and consume Escape within the result popup', () => {
    const onOpen = vi.fn()
    const outside = vi.fn()
    render(() => (
      <div onKeyDown={outside}>
        <SFilePicker onOpen={onOpen} onFind={vi.fn()} searchable files={['src/editor.tsx']} />
      </div>
    ))
    const input = screen.getByRole('combobox', {name: '파일 경로 또는 검색어'})
    fireEvent.input(input, {target: {value: 'editor'}})
    fireEvent.keyDown(input, {key: 'ArrowDown'})
    expect(screen.getByRole('option').getAttribute('aria-selected')).toBe('true')
    outside.mockClear()
    fireEvent.keyDown(input, {key: 'Escape'})
    expect(outside).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).toBeNull()
    fireEvent.keyDown(input, {key: 'ArrowDown'})
    fireEvent.submit(input.closest('form')!)
    expect(onOpen).toHaveBeenCalledWith(
      {column: 1, line: 1, path: 'src/editor.tsx'},
      {restoreView: true},
    )
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
