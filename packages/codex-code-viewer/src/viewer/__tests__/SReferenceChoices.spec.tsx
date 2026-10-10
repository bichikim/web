/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SReferenceChoices} from '../SReferenceChoices'
import {createSignal} from 'solid-js'
import type {ReferenceChoices} from '../types'

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
  it.each(['definition', 'references'] as const)(
    'should change visible code lines for %s without losing the destination',
    (kind) => {
      const [lines, setLines] = createSignal(2)
      const location = {
        column: 11,
        line: 1,
        path: 'main.ts',
        preview: 'interface User {\n  id: string\n  name: string\n}',
      }
      const open = vi.fn()
      render(() => (
        <SReferenceChoices
          references={{kind, label: 'User', locations: [location], point: {x: 0, y: 0}}}
          previewLines={lines()}
          onOpen={open}
        />
      ))
      const row = screen.getByRole('menuitem', {name: '1:11 interface User { id: string'})
      expect(screen.queryByText('name: string')).toBeNull()
      setLines(3)
      expect(
        screen.getByRole('menuitem', {name: '1:11 interface User { id: string name: string'}),
      ).toBe(row)
      setLines(1)
      expect(screen.queryByText('id: string')).toBeNull()
      fireEvent.click(screen.getByRole('menuitem', {name: '1:11 interface User {'}))
      expect(open).toHaveBeenCalledWith(location)
    },
  )
  it('should label multiple definition destinations without calling them references', () => {
    const location = {column: 1, line: 2, path: 'first.ts'}
    const open = vi.fn()
    render(() => (
      <SReferenceChoices
        references={{
          kind: 'definition',
          label: 'greet',
          locations: [location, {...location, path: 'second.ts'}],
          point: {x: 0, y: 0},
        }}
        onOpen={open}
      />
    ))
    expect(screen.getByRole('menu', {name: '정의 위치'})).toBeInTheDocument()
    expect(screen.getByText('greet · 정의 위치 2개')).toBeInTheDocument()
    expect(screen.queryByRole('menu', {name: '사용처'})).toBeNull()
    fireEvent.click(screen.getAllByRole('menuitem', {name: '2:1'})[0])
    expect(open).toHaveBeenCalledWith(location)
  })
  it('should show pending results and retain focus and collapsed groups as more usages arrive', () => {
    const first = {column: 1, line: 2, path: 'first.ts', preview: 'greet()'}
    const [references, setReferences] = createSignal<ReferenceChoices>({
      label: 'greet',
      locations: [],
      point: {x: 0, y: 0},
      status: 'searching',
    })
    const close = vi.fn()
    render(() => <SReferenceChoices references={references()} onClose={close} />)
    const menu = screen.getByRole('menu', {name: '사용처'})
    expect(screen.getByText('greet · 사용처 0개')).toBeInTheDocument()
    expect(screen.getByRole('status', {name: '사용처 검색 중'})).toBeInTheDocument()
    expect(screen.queryByText('준비된 사용처부터 표시하고 있습니다.')).toBeNull()
    expect(screen.queryByText('작업 폴더 안에서 사용처를 찾지 못했습니다.')).toBeNull()
    setReferences((previous) => ({...previous, locations: [first]}))
    const header = screen.getByRole('menuitem', {name: 'first.ts · 1개'})
    fireEvent.click(header)
    expect(header).toHaveFocus()
    setReferences((previous) => ({
      ...previous,
      locations: [first, {...first, path: 'second.ts'}, {...first, path: 'ahead.ts'}],
    }))
    expect(screen.getByRole('menu', {name: '사용처'})).toBe(menu)
    expect(screen.getByRole('menuitem', {name: 'first.ts · 1개'})).toBe(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(header).toHaveFocus()
    expect(screen.getByRole('menuitem', {name: 'second.ts · 1개'})).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    setReferences((previous) => ({...previous, status: 'complete'}))
    expect(screen.getByText('greet · 사용처 3개')).toBeInTheDocument()
    expect(screen.queryByRole('status', {name: '사용처 검색 중'})).toBeNull()
    fireEvent.keyDown(header, {key: 'Escape'})
    expect(close).toHaveBeenCalledOnce()
  })
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
    const main = screen.getByRole('menuitem', {expanded: true, name: 'src/main.ts · 15개'})
    const other = screen.getByRole('menuitem', {expanded: true, name: 'src/other.ts · 15개'})
    expect(screen.getAllByText('src/main.ts')).toHaveLength(1)
    expect(main).toHaveAttribute('aria-expanded', 'true')
    expect(other).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('menuitem')).toHaveLength(32)
    expect(screen.getByText('greet("usage 12")')).toBeInTheDocument()
    const chosen = screen.getByRole('menuitem', {name: '13:4 greet("usage 12")'})
    fireEvent.keyDown(chosen, {key: 'End'})
    expect(document.activeElement).toBe(screen.getAllByRole('menuitem').at(-1))
    fireEvent.click(chosen)
    expect(open).toHaveBeenCalledWith(locations[12])
    expect(screen.queryByRole('menu')).toBeNull()
  })
  it('should start expanded and collapse each file independently without closing the menu', () => {
    const locations = [
      {column: 1, line: 2, path: 'first.ts', preview: 'greet("first")'},
      {column: 1, line: 3, path: 'first.ts', preview: 'greet("again")'},
      {column: 1, line: 9, path: 'second.ts', preview: 'greet("second")'},
    ]
    const open = vi.fn()
    render(() => (
      <SReferenceChoices
        references={{label: 'greet', locations, point: {x: 0, y: 0}}}
        onOpen={open}
      />
    ))
    const first = screen.getByRole('menuitem', {expanded: true, name: 'first.ts · 2개'})
    expect(screen.getByRole('menuitem', {name: '2:1 greet("first")'})).toBeInTheDocument()
    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('menuitem', {name: '2:1 greet("first")'})).toBeNull()
    expect(
      screen.getByRole('menuitem', {expanded: true, name: 'second.ts · 1개'}),
    ).toBeInTheDocument()
    expect(screen.getByRole('menuitem', {name: '9:1 greet("second")'})).toBeInTheDocument()
    expect(screen.getByText('greet · 사용처 3개')).toBeInTheDocument()
    expect(open).not.toHaveBeenCalled()
    fireEvent.keyDown(first, {key: 'ArrowRight'})
    expect(first).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('menuitem', {name: '3:1 greet("again")'}))
    expect(open).toHaveBeenCalledWith(locations[1])
    expect(screen.queryByRole('menu')).toBeNull()
  })
  it('should bound mounted rows for ten thousand usages and navigate to the last destination', () => {
    const locations = Array.from({length: 10000}, (_, index) => ({
      column: 1,
      line: (index % 1000) + 2,
      path: `src/caller-${Math.floor(index / 1000)}.ts`,
      preview: `greet(${index})`,
    }))
    const open = vi.fn()
    render(() => (
      <SReferenceChoices
        references={{label: 'greet', locations, point: {x: 0, y: 0}}}
        onOpen={open}
      />
    ))
    expect(screen.getByText('greet · 사용처 10000개')).toBeInTheDocument()
    const header = screen.getByRole('menuitem', {expanded: true, name: 'src/caller-0.ts · 1000개'})
    fireEvent.click(header)
    expect(screen.queryByRole('menuitem', {name: '2:1 greet(0)'})).toBeNull()
    expect(
      screen.getByRole('menuitem', {expanded: true, name: 'src/caller-1.ts · 1000개'}),
    ).toBeInTheDocument()
    fireEvent.keyDown(header, {key: 'ArrowRight'})
    expect(screen.getAllByRole('menuitem').length).toBeLessThan(50)
    expect(document.activeElement).toBe(screen.getAllByRole('menuitem')[0])
    fireEvent.keyDown(document.activeElement!, {key: 'End'})
    const last = screen.getByRole('menuitem', {name: '1001:1 greet(9999)'})
    expect(document.activeElement).toBe(last)
    expect(screen.getAllByRole('menuitem').length).toBeLessThan(50)
    fireEvent.keyDown(last, {key: 'ArrowDown'})
    const first = screen.getByRole('menuitem', {name: 'src/caller-0.ts · 1000개'})
    expect(document.activeElement).toBe(first)
    fireEvent.keyDown(first, {key: 'ArrowUp'})
    expect(document.activeElement).toBe(screen.getByRole('menuitem', {name: '1001:1 greet(9999)'}))
    fireEvent.click(document.activeElement!)
    expect(open).toHaveBeenCalledWith(locations.at(-1))
  })
  it('should window ten thousand file groups and reopen the final group before navigating', () => {
    const locations = Array.from({length: 10000}, (_, index) => ({
      column: 1,
      line: 2,
      path: `callers/caller-${String(index).padStart(5, '0')}.ts`,
      preview: `fanOut(${index})`,
    }))
    const open = vi.fn()
    render(() => (
      <SReferenceChoices
        references={{label: 'fanOut', locations, point: {x: 0, y: 0}}}
        onOpen={open}
      />
    ))
    const first = screen.getByRole('menuitem', {
      expanded: true,
      name: 'callers/caller-00000.ts · 1개',
    })
    expect(screen.getByText('fanOut · 사용처 10000개')).toBeInTheDocument()
    expect(screen.getAllByRole('menuitem').length).toBeLessThan(50)
    fireEvent.keyDown(first, {key: 'End'})
    const usage = screen.getByRole('menuitem', {name: '2:1 fanOut(9999)'})
    expect(document.activeElement).toBe(usage)
    expect(usage).toHaveAttribute('aria-description', locations.at(-1)!.path)
    fireEvent.keyDown(usage, {key: 'ArrowLeft'})
    const last = screen.getByRole('menuitem', {
      expanded: false,
      name: 'callers/caller-09999.ts · 1개',
    })
    expect(document.activeElement).toBe(last)
    expect(screen.queryByRole('menuitem', {name: '2:1 fanOut(9999)'})).toBeNull()
    expect(screen.getAllByRole('menuitem').length).toBeLessThan(50)
    fireEvent.keyDown(last, {key: 'Home'})
    const returned = screen.getByRole('menuitem', {
      expanded: true,
      name: 'callers/caller-00000.ts · 1개',
    })
    fireEvent.keyDown(returned, {key: 'End'})
    expect(document.activeElement).toBe(
      screen.getByRole('menuitem', {expanded: false, name: 'callers/caller-09999.ts · 1개'}),
    )
    fireEvent.keyDown(document.activeElement!, {key: 'ArrowRight'})
    fireEvent.keyDown(document.activeElement!, {key: 'ArrowDown'})
    fireEvent.click(screen.getByRole('menuitem', {name: '2:1 fanOut(9999)'}))
    expect(open).toHaveBeenCalledWith(locations.at(-1))
  })
  it('should retain all collapsed file headers and restore a group through keyboard navigation', () => {
    const locations = Array.from({length: 300}, (_, index) => ({
      column: 1,
      line: index + 1,
      path: `caller-${Math.floor(index / 100)}.ts`,
      preview: `greet(${index})`,
    }))
    render(() => (
      <SReferenceChoices references={{label: 'greet', locations, point: {x: 0, y: 0}}} />
    ))
    for (const path of ['caller-0.ts', 'caller-1.ts', 'caller-2.ts']) {
      fireEvent.click(screen.getByRole('menuitem', {expanded: true, name: `${path} · 100개`}))
    }
    expect(screen.getAllByRole('menuitem')).toHaveLength(3)
    expect(screen.getAllByRole('menuitem', {expanded: false})).toHaveLength(3)
    const middle = screen.getByRole('menuitem', {name: 'caller-1.ts · 100개'})
    fireEvent.focus(middle)
    fireEvent.keyDown(middle, {key: 'ArrowRight'})
    expect(middle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(middle, {key: 'ArrowDown'})
    const usage = screen.getByRole('menuitem', {name: '101:1 greet(100)'})
    expect(document.activeElement).toBe(usage)
    fireEvent.keyDown(usage, {key: 'ArrowLeft'})
    expect(document.activeElement).toBe(middle)
    expect(middle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getAllByRole('menuitem')).toHaveLength(3)
  })
  it('should retain focused references during manual scrolling and close with Escape', () => {
    const locations = Array.from({length: 300}, (_, index) => ({
      column: 1,
      line: 1,
      path: `file-${index}.ts`,
    }))
    render(() => (
      <SReferenceChoices references={{label: 'greet', locations, point: {x: 0, y: 0}}} />
    ))
    const first = screen.getAllByRole('menuitem')[0]
    const viewport = screen.getByRole('menu', {name: '사용처'}).querySelector('div')!
    viewport.scrollTop = 10000
    fireEvent.scroll(viewport)
    expect(first.isConnected).toBe(true)
    expect(document.activeElement).toBe(first)
    expect(screen.getAllByRole('menuitem').length).toBeLessThan(50)
    fireEvent.keyDown(first, {key: 'Home'})
    expect(viewport.scrollTop).toBe(0)
    fireEvent.keyDown(first, {key: 'Escape'})
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
    expect(screen.getByRole('menuitem', {name: 'missing.ts · 1개'})).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    fireEvent.click(screen.getByRole('menuitem', {name: '4:2'}))
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
