import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {SEMANTIC_LIMIT} from '@winter-love/wallpaper/settings/semantics'
import {SWidgetContextMenu} from '../../src/components/SWidgetContextMenu'
import 'virtual:uno.css'

afterEach(cleanup)
test.each([1, SEMANTIC_LIMIT])(
  'should fit and navigate a %s-action menu at the viewport edge',
  (count) => {
    const actions = Array.from({length: count}, (_, index) => ({
      checked: index === 0,
      id: `entry-${index}`,
      label: `${index} ${'긴 메뉴 이름 '.repeat(12)}`,
    }))
    const [current, setCurrent] = createSignal(actions)
    const toggle = vi.fn()
    const started = Date.now()
    const view = render(() => (
      <SWidgetContextMenu
        x={innerWidth - 2}
        y={innerHeight - 2}
        actions={current()}
        onToggle={toggle}
        onDismiss={vi.fn()}
        onSelect={vi.fn()}
      />
    ))
    const menu = screen.getByRole('menu', {name: 'Poffo 위젯 메뉴'})
    const separator = screen.getByRole('separator')
    expect(getComputedStyle(separator).height).toBe('1px')
    const entries = screen.getAllByRole('menuitemcheckbox')
    const elapsed = Date.now() - started
    expect(entries).toHaveLength(count)
    expect(elapsed).toBeLessThan(1000)
    const bounds = menu.getBoundingClientRect()
    expect(bounds.x).toBeGreaterThanOrEqual(0)
    expect(bounds.y).toBeGreaterThanOrEqual(0)
    expect(bounds.right).toBeLessThanOrEqual(innerWidth)
    expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)
    const navigation = Date.now()
    fireEvent.keyDown(menu, {key: 'End'})
    expect(document.activeElement).toBe(entries.at(-1))
    expect(Date.now() - navigation).toBeLessThan(100)
    fireEvent.keyDown(menu, {key: 'ArrowDown'})
    expect(document.activeElement).toBe(screen.getByRole('menuitem', {name: '크기 조정'}))
    fireEvent.keyDown(menu, {key: 'ArrowUp'})
    expect(document.activeElement).toBe(entries.at(-1))
    const updates: number[] = []
    for (let iteration = 0; iteration < 20; iteration += 1) {
      const changed = current().map((action) => ({...action, checked: !action.checked}))
      const update = Date.now()
      setCurrent(changed)
      updates.push(Date.now() - update)
      expect(document.activeElement).toBe(entries.at(-1))
    }
    expect(Math.max(...updates)).toBeLessThan(100)
    expect(screen.getAllByRole('menuitemcheckbox')).toEqual(entries)
    fireEvent.click(entries.at(-1)!)
    expect(toggle).toHaveBeenCalledExactlyOnceWith(`entry-${count - 1}`)
    console.info(`Context menu ${count}: ready ${elapsed}ms`)
    view.unmount()
    expect(screen.queryByRole('menu')).toBeNull()
  },
)

test('should retain focused action identity through live menu updates', () => {
  const [actions, setActions] = createSignal([{checked: false, id: 'tiny', label: '작아지기'}])
  render(() => (
    <SWidgetContextMenu
      x={40}
      y={40}
      actions={actions()}
      onToggle={vi.fn()}
      onDismiss={vi.fn()}
      onSelect={vi.fn()}
    />
  ))
  const entry = screen.getByRole('menuitemcheckbox', {name: '작아지기'})
  entry.focus()
  setActions([{checked: true, id: 'tiny', label: '귀엽게 작아지기'}])
  const updated = screen.getByRole('menuitemcheckbox', {name: '귀엽게 작아지기'})
  expect(document.activeElement).toBe(updated)
  expect(updated).toBe(entry)
  expect(updated).toHaveAttribute('aria-checked', 'true')
})

test('should return focus to sizing when the focused action is removed', () => {
  const [actions, setActions] = createSignal([{checked: false, id: 'tiny', label: '작아지기'}])
  render(() => (
    <SWidgetContextMenu
      x={40}
      y={40}
      actions={actions()}
      onToggle={vi.fn()}
      onDismiss={vi.fn()}
      onSelect={vi.fn()}
    />
  ))
  screen.getByRole('menuitemcheckbox', {name: '작아지기'}).focus()
  setActions([])
  expect(document.activeElement).toBe(screen.getByRole('menuitem', {name: '크기 조정'}))
  expect(screen.queryByRole('separator')).toBeNull()
})

test.each([0, 1, 2])('should preserve focus when imported settings reorder action %s', (index) => {
  const initial = Array.from({length: 3}, (_, item) => ({
    checked: false,
    id: `item-${item}`,
    label: `행동 ${item}`,
  }))
  const [actions, setActions] = createSignal(initial)
  render(() => (
    <SWidgetContextMenu
      x={40}
      y={40}
      actions={actions()}
      onToggle={vi.fn()}
      onDismiss={vi.fn()}
      onSelect={vi.fn()}
    />
  ))
  const selected = screen.getByRole('menuitemcheckbox', {name: `행동 ${index}`})
  selected.focus()
  setActions(initial.toReversed())
  expect(document.activeElement).toBe(selected)
})
