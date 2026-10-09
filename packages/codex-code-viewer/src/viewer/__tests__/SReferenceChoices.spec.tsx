/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SReferenceChoices} from '../SReferenceChoices'

const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeEach(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterEach(() => {
  cleanup()
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
describe('SReferenceChoices', () => {
  it('should list usages in a height-limited menu and open the chosen position', () => {
    const locations = Array.from({length: 30}, (_, index) => ({
      column: 4,
      line: index + 1,
      path: index % 2 === 0 ? 'src/main.ts' : 'src/other.ts',
      preview: `greet("usage ${index}")`,
    }))
    const open = vi.fn()
    render(() => (
      <SReferenceChoices
        references={{label: 'greet', locations, point: {x: 100, y: 200}}}
        onOpen={open}
      />
    ))
    const menu = screen.getByRole('menu', {name: '사용처'})
    expect(menu).toHaveAttribute('popover', 'auto')
    expect(menu.style.getPropertyValue('--menu-limit')).toBe('320px')
    expect(screen.getByText('greet · 사용처 30개')).toBeInTheDocument()
    const main = screen.getByRole('group', {name: 'src/main.ts · 15개'})
    const other = screen.getByRole('group', {name: 'src/other.ts · 15개'})
    expect(screen.getAllByText('src/main.ts')).toHaveLength(1)
    expect(within(main).getAllByRole('menuitem')).toHaveLength(15)
    expect(within(other).getAllByRole('menuitem')).toHaveLength(15)
    expect(within(main).getByText('greet("usage 12")')).toBeInTheDocument()
    const chosen = within(main).getByRole('menuitem', {name: '13:4 greet("usage 12")'})
    fireEvent.keyDown(chosen, {key: 'End'})
    expect(document.activeElement).toBe(within(other).getAllByRole('menuitem').at(-1))
    fireEvent.click(chosen)
    expect(open).toHaveBeenCalledWith(locations[12])
    expect(screen.queryByRole('menu')).toBeNull()
  })
  it('should keep a reference without source preview navigable', () => {
    const location = {column: 2, line: 4, path: 'missing.ts'}
    const open = vi.fn()
    render(() => (
      <SReferenceChoices
        references={{label: 'greet', locations: [location], point: {x: 0, y: 0}}}
        onOpen={open}
      />
    ))
    const group = screen.getByRole('group', {name: 'missing.ts · 1개'})
    fireEvent.click(within(group).getByRole('menuitem', {name: '4:2'}))
    expect(open).toHaveBeenCalledWith(location)
  })
  it('should show an empty result and close with Escape while restoring focus', () => {
    const anchor = document.createElement('button')
    document.body.append(anchor)
    anchor.focus()
    render(() => (
      <SReferenceChoices references={{label: 'unused', locations: [], point: {x: 0, y: 0}}} />
    ))
    const menu = screen.getByRole('menu', {name: '사용처'})
    expect(screen.getByText('작업 폴더 안에서 사용처를 찾지 못했습니다.')).toBeInTheDocument()
    expect(document.activeElement).toBe(menu)
    fireEvent.keyDown(menu, {key: 'Escape'})
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(anchor)
    anchor.remove()
  })
})
