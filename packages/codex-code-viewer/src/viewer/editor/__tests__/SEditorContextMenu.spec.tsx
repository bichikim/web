/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SEditorContextMenu} from '../SEditorContextMenu'

const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')

describe('SEditorContextMenu', () => {
  beforeEach(() =>
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    }),
  )
  afterEach(() => {
    cleanup()
    if (originalPopover === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
    }
  })

  it('should expose all five actions and close before cutting from the shortcut', () => {
    const actions: string[] = []
    render(() => (
      <SEditorContextMenu
        x={80}
        y={100}
        onCopy={vi.fn()}
        onCut={() => actions.push('cut')}
        onPaste={vi.fn()}
        onShare={vi.fn()}
        onFind={vi.fn()}
        onClose={() => actions.push('close')}
      />
    ))
    const copy = screen.getByRole('menuitem', {name: '복사 ⌘/Ctrl C'})
    expect(screen.getAllByRole('menuitem')).toHaveLength(5)
    expect(document.activeElement).toBe(copy)
    fireEvent.keyDown(copy, {ctrlKey: true, key: 'x'})
    expect(actions).toEqual(['close', 'cut'])
  })

  it('should skip disabled copy and cut when navigating to paste', () => {
    const onPaste = vi.fn()
    render(() => (
      <SEditorContextMenu x={80} y={100} onPaste={onPaste} onShare={vi.fn()} onFind={vi.fn()} />
    ))
    expect(screen.getByRole('menuitem', {name: '복사 ⌘/Ctrl C'})).toBeDisabled()
    expect(screen.getByRole('menuitem', {name: '잘라내기 ⌘/Ctrl X'})).toBeDisabled()
    const paste = screen.getByRole('menuitem', {name: '붙여넣기 ⌘/Ctrl V'})
    expect(document.activeElement).toBe(paste)
    fireEvent.keyDown(paste, {ctrlKey: true, key: 'v'})
    expect(onPaste).toHaveBeenCalledOnce()
  })
})
