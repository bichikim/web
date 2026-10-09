/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {batch, createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {CodeDocument} from '../../shared/contracts'
import {SCodeDocument} from '../SCodeDocument'

const documentFixture: CodeDocument = {
  lines: [
    [{kind: 'plain', navigation: null, offset: 0, text: 'const '}],
    [{kind: 'identifier', navigation: 'definition', offset: 7, text: 'hello'}],
    [{kind: 'plain', navigation: null, offset: 13, text: 'next'}],
  ],
  location: {column: 1, line: 1, path: 'src/main.ts'},
  revision: 'first',
  source: 'const \nhello\nnext',
}
const originalPopover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')

describe('SCodeDocument', () => {
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
    document.getSelection()?.removeAllRanges()
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

  it('should extend from the row selected by context menu rather than the old clicked anchor', () => {
    const [selection, setSelection] = createSignal({...documentFixture.location, endLine: 1})
    const onSelect = vi.fn((anchor: number, focus: number) => {
      setSelection({
        ...documentFixture.location,
        endLine: Math.max(anchor, focus),
        line: Math.min(anchor, focus),
      })
    })
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={vi.fn()}
        onSelect={onSelect}
        onCopy={vi.fn()}
        selection={selection()}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '1줄 선택'}))
    fireEvent.contextMenu(screen.getByRole('button', {name: '3줄 선택'}))
    fireEvent.keyDown(screen.getByRole('menuitem', {name: '코드 복사'}), {key: 'Escape'})
    fireEvent.keyDown(screen.getByRole('button', {name: '3줄 선택'}), {
      key: 'ArrowUp',
      shiftKey: true,
    })
    expect(onSelect).toHaveBeenLastCalledWith(3, 2)
  })

  it('should change the anchor when right-clicking a row inside a previous range', () => {
    const [selection, setSelection] = createSignal({...documentFixture.location, endLine: 1})
    const onSelect = vi.fn((anchor: number, focus: number) => {
      setSelection({
        ...documentFixture.location,
        endLine: Math.max(anchor, focus),
        line: Math.min(anchor, focus),
      })
    })
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={vi.fn()}
        onSelect={onSelect}
        onCopy={vi.fn()}
        selection={selection()}
      />
    ))
    fireEvent.click(screen.getByRole('button', {name: '3줄 선택'}))
    fireEvent.click(screen.getByRole('button', {name: '1줄 선택'}), {shiftKey: true})
    fireEvent.contextMenu(screen.getByRole('button', {name: '2줄 선택'}))
    fireEvent.keyDown(screen.getByRole('menuitem', {name: '코드 복사'}), {key: 'Escape'})
    fireEvent.keyDown(screen.getByRole('button', {name: '2줄 선택'}), {
      key: 'ArrowUp',
      shiftKey: true,
    })
    expect(onSelect).toHaveBeenLastCalledWith(2, 1)
  })

  it('should preserve navigation scrolling until an explicit search request', async () => {
    const [file, setFile] = createSignal(documentFixture)
    const [matches, setMatches] = createSignal([{end: 8, start: 6}])
    const [scrollRequest, setScrollRequest] = createSignal(1)
    render(() => (
      <SCodeDocument
        document={file()}
        onFollow={vi.fn()}
        matches={matches()}
        activeMatch={0}
        searchScrollRequest={scrollRequest()}
      />
    ))
    await Promise.resolve()
    vi.mocked(HTMLElement.prototype.scrollIntoView).mockClear()
    batch(() => {
      setFile({
        ...documentFixture,
        location: {...documentFixture.location, line: 3, path: 'src/other.ts'},
        revision: 'second',
      })
      setMatches([{end: 5, start: 0}])
    })
    await Promise.resolve()
    const lastTarget = () =>
      vi.mocked(HTMLElement.prototype.scrollIntoView).mock.contexts.at(-1) as HTMLElement
    expect(lastTarget().closest('[data-line]')?.getAttribute('data-line')).toBe('3')
    setScrollRequest(2)
    await Promise.resolve()
    expect(lastTarget().closest('[data-line]')?.getAttribute('data-line')).toBe('1')
  })

  it('should follow the original definition when a highlighted part of its token is clicked', () => {
    const onFollow = vi.fn()
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={onFollow}
        matches={[{end: 10, start: 8}]}
        activeMatch={0}
      />
    ))
    const link = screen.getByRole('link', {name: '정의·사용처 찾기: hello'})
    const highlight = link.querySelector('mark')!
    expect(link.textContent).toBe('hello')
    expect(highlight.textContent).toBe('el')
    fireEvent.click(highlight)
    expect(onFollow).toHaveBeenCalledWith(documentFixture.lines[1]![0], {x: 0, y: 0})
  })

  it('should retain a selected range for context actions and select an outside clicked row', () => {
    const onSelect = vi.fn()
    const onCopy = vi.fn()
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={vi.fn()}
        onSelect={onSelect}
        onCopy={onCopy}
        selection={{...documentFixture.location, endLine: 2}}
      />
    ))
    fireEvent.contextMenu(screen.getByLabelText('소스 코드'))
    expect(onSelect).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('menuitem', {name: '코드 복사'}))
    expect(onCopy).toHaveBeenCalledWith('const \nhello')
    fireEvent.contextMenu(screen.getByRole('button', {name: '3줄 선택'}))
    expect(onSelect).toHaveBeenLastCalledWith(3, 3)
  })

  it('should attach the exact code token without following its definition', () => {
    const onShare = vi.fn()
    const onSelectText = vi.fn()
    const onFollow = vi.fn()
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={onFollow}
        onSelect={vi.fn()}
        onSelectText={onSelectText}
        onShare={onShare}
      />
    ))
    fireEvent.contextMenu(screen.getByRole('link', {name: '정의·사용처 찾기: hello'}))
    expect(onSelectText).toHaveBeenCalledWith({
      column: 1,
      endColumn: 6,
      endLine: 2,
      line: 2,
      path: 'src/main.ts',
    })
    fireEvent.click(screen.getByRole('menuitem', {name: '채팅창에 추가'}))
    expect(onShare).toHaveBeenCalledWith({
      column: 1,
      endColumn: 6,
      endLine: 2,
      line: 2,
      path: 'src/main.ts',
    })
    expect(onFollow).not.toHaveBeenCalled()
  })

  it('should keep a native selection ending on a link instead of navigating after its pointer click', () => {
    const onFollow = vi.fn()
    const onSelectText = vi.fn()
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={onFollow}
        onSelect={vi.fn()}
        onSelectText={onSelectText}
      />
    ))
    const link = screen.getByRole('link', {name: '정의·사용처 찾기: hello'})
    document.getSelection()!.setBaseAndExtent(link.firstChild!, 1, link.firstChild!, 4)
    fireEvent.click(link, {detail: 1})
    expect(onFollow).not.toHaveBeenCalled()
    expect(onSelectText).toHaveBeenCalledWith({column: 2, endColumn: 5, endLine: 2, line: 2})
  })

  it('should preserve a partial native selection under the pointer when menu focus clears it', () => {
    const onShare = vi.fn()
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={vi.fn()}
        onSelect={vi.fn()}
        onSelectText={vi.fn()}
        onShare={onShare}
      />
    ))
    const link = screen.getByRole('link', {name: '정의·사용처 찾기: hello'})
    document.getSelection()!.setBaseAndExtent(link.firstChild!, 1, link.firstChild!, 4)
    const range = document.getSelection()!.getRangeAt(0)
    range.getClientRects = () =>
      [{bottom: 30, left: 10, right: 40, top: 10}] as unknown as DOMRectList
    fireEvent.contextMenu(link, {clientX: 20, clientY: 20})
    document.getSelection()?.removeAllRanges()
    fireEvent.click(screen.getByRole('menuitem', {name: '채팅창에 추가'}))
    expect(onShare).toHaveBeenCalledWith({
      column: 2,
      endColumn: 5,
      endLine: 2,
      line: 2,
      path: 'src/main.ts',
    })
  })

  it('should select the clicked row blank space instead of a native selection elsewhere', () => {
    const onShare = vi.fn()
    const onSelect = vi.fn()
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={vi.fn()}
        onSelect={onSelect}
        onShare={onShare}
        selection={{...documentFixture.location, endLine: 3}}
      />
    ))
    const link = screen.getByRole('link', {name: '정의·사용처 찾기: hello'})
    document.getSelection()!.setBaseAndExtent(link.firstChild!, 1, link.firstChild!, 4)
    document.getSelection()!.getRangeAt(0).getClientRects = () =>
      [{bottom: 30, left: 10, right: 40, top: 10}] as unknown as DOMRectList
    fireEvent.contextMenu(
      screen.getByRole('button', {name: '2줄 선택'}).parentElement!.querySelector('code')!,
      {clientX: 80, clientY: 20},
    )
    expect(onSelect).toHaveBeenLastCalledWith(2, 2)
    fireEvent.click(screen.getByRole('menuitem', {name: '채팅창에 추가'}))
    expect(onShare).toHaveBeenCalledWith({column: 1, endLine: 2, line: 2, path: 'src/main.ts'})
  })

  it('should select the clicked token when the pointer is outside a selection within that same token', () => {
    const onShare = vi.fn()
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={vi.fn()}
        onSelectText={vi.fn()}
        onShare={onShare}
      />
    ))
    const link = screen.getByRole('link', {name: '정의·사용처 찾기: hello'})
    document.getSelection()!.setBaseAndExtent(link.firstChild!, 1, link.firstChild!, 3)
    document.getSelection()!.getRangeAt(0).getClientRects = () =>
      [{bottom: 30, left: 10, right: 30, top: 10}] as unknown as DOMRectList
    fireEvent.contextMenu(link, {clientX: 40, clientY: 20})
    fireEvent.click(screen.getByRole('menuitem', {name: '채팅창에 추가'}))
    expect(onShare).toHaveBeenCalledWith({
      column: 1,
      endColumn: 6,
      endLine: 2,
      line: 2,
      path: 'src/main.ts',
    })
    expect(document.getSelection()?.isCollapsed).toBe(true)
  })

  it('should exclude a terminal row from line highlighting when the selected range ends at its first column', () => {
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={vi.fn()}
        selection={{...documentFixture.location, column: 2, endColumn: 1, endLine: 3}}
      />
    ))
    expect(screen.getByRole('button', {name: '2줄 선택'}).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', {name: '3줄 선택'}).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('should preserve the exact stored range when right-clicking below all rows', () => {
    const onShare = vi.fn()
    const selected = {column: 2, endColumn: 4, endLine: 2, line: 1, path: 'src/main.ts'}
    render(() => (
      <SCodeDocument
        document={documentFixture}
        onFollow={vi.fn()}
        onSelect={vi.fn()}
        onShare={onShare}
        selection={selected}
      />
    ))
    fireEvent.contextMenu(screen.getByLabelText('소스 코드'))
    fireEvent.click(screen.getByRole('menuitem', {name: '채팅창에 추가'}))
    expect(onShare).toHaveBeenCalledWith(selected)
  })

  it('should dismiss stale context actions when another file is opened', () => {
    const [file, setFile] = createSignal(documentFixture)
    render(() => <SCodeDocument document={file()} onFollow={vi.fn()} onCopy={vi.fn()} />)
    fireEvent.contextMenu(screen.getByRole('link', {name: '정의·사용처 찾기: hello'}))
    expect(screen.getByRole('menu', {name: '코드 작업'})).toBeDefined()
    setFile({...documentFixture, location: {...documentFixture.location, path: 'src/other.ts'}})
    expect(screen.queryByRole('menu', {name: '코드 작업'})).toBeNull()
  })
})
