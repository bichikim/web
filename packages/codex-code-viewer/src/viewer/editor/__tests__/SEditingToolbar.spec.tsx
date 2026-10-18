/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useCodeEditing} from '../../use-code-editing'
import {SEditingToolbar} from '../SEditingToolbar'

describe('SEditingToolbar', () => {
  const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', {
      configurable: true,
      value: vi.fn(),
    })
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    if (originalPopover === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', originalPopover)
    }
  })
  const setup = () => {
    let editing: ReturnType<typeof useCodeEditing>
    const onDiscard = vi.fn()
    const onShareChanges = vi.fn()
    render(() => {
      editing = useCodeEditing({
        port: {call: vi.fn(), context: vi.fn(), start: vi.fn()},
        session: () => ({
          document: {
            lines: [],
            location: {column: 1, line: 1, path: 'notes.md'},
            revision: 'first',
            source: '# Title',
          },
          session: 'session',
          workspace: '/project',
        }),
      })
      return (
        <SEditingToolbar editing={editing} onDiscard={onDiscard} onShareChanges={onShareChanges} />
      )
    })
    return {editing: editing!, onDiscard, onShareChanges}
  }

  it('should show save and more only while editing and enable them for changes', () => {
    const {editing} = setup()
    expect(screen.queryByRole('button', {name: '저장'})).toBeNull()
    expect(screen.queryByRole('button', {name: '편집 더 보기'})).toBeNull()
    fireEvent.click(screen.getByRole('button', {name: '편집'}))
    expect(screen.getByRole('button', {name: '저장'})).toBeDisabled()
    expect(screen.getByRole('button', {name: '편집 더 보기'})).toBeDisabled()
    editing.change('# Changed')
    expect(screen.getByRole('button', {name: '저장'})).toBeEnabled()
    expect(screen.getByRole('button', {name: '편집 더 보기'})).toBeEnabled()
    editing.discard()
    expect(screen.getByRole('button', {name: '저장'})).toBeDisabled()
    expect(screen.getByRole('button', {name: '편집 더 보기'})).toBeDisabled()
  })

  it.each([
    {action: 'onShareChanges' as const, label: '변경 내용 채팅에 추가'},
    {action: 'onDiscard' as const, label: '변경 버리기'},
  ])('should invoke $label from more and restore focus', ({action, label}) => {
    const result = setup()
    fireEvent.click(screen.getByRole('button', {name: '편집'}))
    result.editing.change('# Changed')
    const trigger = screen.getByRole('button', {name: '편집 더 보기'})
    fireEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', {name: '변경 내용 채팅에 추가'}),
    )
    fireEvent.click(screen.getByRole('menuitem', {name: label}))
    expect(result[action]).toHaveBeenCalledOnce()
    expect(screen.queryByRole('menu', {name: '편집 작업'})).toBeNull()
    expect(document.activeElement).toBe(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
  })
})
