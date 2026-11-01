import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
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
    const toggle = vi.fn()
    const started = Date.now()
    const view = render(() => (
      <SWidgetContextMenu
        x={innerWidth - 2}
        y={innerHeight - 2}
        actions={actions}
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
    fireEvent.click(entries.at(-1)!)
    expect(toggle).toHaveBeenCalledExactlyOnceWith(`entry-${count - 1}`)
    console.info(`Context menu ${count}: ready ${elapsed}ms`)
    view.unmount()
    expect(screen.queryByRole('menu')).toBeNull()
  },
)
