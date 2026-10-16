/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {SReferenceList} from '../SReferenceList'
import type {NavigationLocation} from '../../shared/contracts'

afterEach(cleanup)
describe('SReferenceList', () => {
  it('should open a file from its icon without toggling its expanded group', () => {
    const select = vi.fn()
    render(() => (
      <SReferenceList locations={[{column: 7, line: 12, path: 'caller.ts'}]} onSelect={select} />
    ))
    const header = screen.getByRole('menuitem', {name: 'caller.ts · 1개'})
    const open = screen.getByRole('menuitem', {name: '파일로 이동: caller.ts'})
    expect(header.nextElementSibling).toBe(open)
    fireEvent.click(open)
    expect(select).toHaveBeenCalledWith({column: 1, line: 1, path: 'caller.ts'})
    expect(header).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(header)
    fireEvent.click(open)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(select).toHaveBeenCalledTimes(2)
  })
  it('should show file groups before details and retain collapse state as details arrive', () => {
    const [locations, setLocations] = createSignal<NavigationLocation[]>([])
    const select = vi.fn()
    render(() => (
      <SReferenceList
        groups={[{count: 2, path: 'caller.ts'}]}
        locations={locations()}
        onSelect={select}
      />
    ))
    const header = screen.getByRole('menuitem', {name: 'caller.ts · 2개'})
    expect(screen.getByRole('menuitem', {name: '파일로 이동: caller.ts'})).toBeInTheDocument()
    fireEvent.click(header)
    setLocations([{column: 1, line: 3, path: 'caller.ts', preview: 'greet()'}])
    expect(screen.getByRole('menuitem', {name: 'caller.ts · 2개'})).toBe(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('greet()')).toBeNull()
    fireEvent.click(header)
    expect(screen.getByText('greet()')).toBeInTheDocument()
  })
  it('should reach the file action and toggle separately with arrow keys', () => {
    render(() => (
      <SReferenceList locations={[{column: 1, line: 2, path: 'caller.ts'}]} onSelect={vi.fn()} />
    ))
    const header = screen.getByRole('menuitem', {name: 'caller.ts · 1개'})
    const open = screen.getByRole('menuitem', {name: '파일로 이동: caller.ts'})
    header.focus()
    fireEvent.keyDown(header, {key: 'ArrowDown'})
    expect(open).toHaveFocus()
    fireEvent.keyDown(open, {key: 'ArrowUp'})
    expect(header).toHaveFocus()
    fireEvent.keyDown(header, {key: 'ArrowLeft'})
    expect(header).toHaveAttribute('aria-expanded', 'false')
  })
})
