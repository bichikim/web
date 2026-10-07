/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SCodeContextMenu} from '../SCodeContextMenu'

const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')

describe('SCodeContextMenu', () => {
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

  it('should focus its first action, navigate by keyboard, and close on Escape', () => {
    const onClose = vi.fn()
    render(() => (
      <SCodeContextMenu
        x={10}
        y={10}
        onCopy={vi.fn()}
        onShare={vi.fn()}
        onFind={vi.fn()}
        onClose={onClose}
      />
    ))
    const copy = screen.getByRole('menuitem', {name: '코드 복사'})
    const share = screen.getByRole('menuitem', {name: '채팅창에 추가'})
    expect(document.activeElement).toBe(copy)
    fireEvent.keyDown(copy, {key: 'ArrowDown'})
    expect(document.activeElement).toBe(share)
    fireEvent.keyDown(share, {key: 'Escape'})
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should close before opening local search from its keyboard shortcut', () => {
    const actions: string[] = []
    render(() => (
      <SCodeContextMenu
        x={10}
        y={10}
        onCopy={vi.fn()}
        onFind={() => actions.push('find')}
        onClose={() => actions.push('close')}
      />
    ))
    fireEvent.keyDown(screen.getByRole('menuitem', {name: '코드 복사'}), {ctrlKey: true, key: 'f'})
    expect(actions).toEqual(['close', 'find'])
  })

  it('should leave focus with an outside target when light-dismissed', () => {
    const onClose = vi.fn()
    render(() => <SCodeContextMenu x={10} y={10} onClose={onClose} />)
    const event = new Event('toggle')
    Object.defineProperty(event, 'newState', {value: 'closed'})
    fireEvent(screen.getByRole('menu', {name: '코드 작업'}), event)
    expect(onClose).toHaveBeenCalledWith({restoreFocus: false})
  })
})
