/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SCodeDocument} from '../SCodeDocument'
import {ViewStateContext} from '../view-state/context'
import type {CodeDocument} from '../../shared/contracts'
import type {FileViewState} from '../view-state/types'

const source = 'function greet() {\n  const value = {\n    name: "Kim"\n  }\n  return value\n}\n'
const document: CodeDocument = {
  lines: source.split('\n').map((text, index) => [
    {
      kind: 'plain',
      navigation: null,
      offset: source.split('\n').slice(0, index).join('\n').length + (index > 0 ? 1 : 0),
      text,
    },
  ]),
  location: {column: 1, line: 1, path: 'main.ts'},
  revision: 'v1',
  source,
}

describe('SCodeDocument folding', () => {
  const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => {
      queueMicrotask(callback)
      return 1
    })
    vi.stubGlobal('cancelIdleCallback', vi.fn())
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    if (scrollDescriptor === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor)
    }
  })
  it('should fold nested bodies without selecting or renumbering lines', async () => {
    const onSelect = vi.fn()
    render(() => <SCodeDocument document={document} onFollow={vi.fn()} onSelect={onSelect} />)
    fireEvent.click(await screen.findByRole('button', {name: '2줄 접기'}))
    expect(screen.queryByRole('button', {name: '3줄 선택'})).toBeNull()
    expect(screen.getByRole('button', {name: '4줄 선택'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name: '1줄 접기'}))
    expect(screen.queryByRole('button', {name: '2줄 선택'})).toBeNull()
    expect(screen.getByRole('button', {name: '6줄 선택'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name: '1줄 펼치기'}))
    expect(screen.getByRole('button', {name: '2줄 펼치기'})).toBeTruthy()
    expect(onSelect).not.toHaveBeenCalled()
  })
  it('should reveal every parent fold for search and explicit location changes', async () => {
    const [file, setFile] = createSignal(document)
    const [request, setRequest] = createSignal(0)
    render(() => (
      <SCodeDocument
        document={file()}
        onFollow={vi.fn()}
        matches={[{end: source.indexOf('Kim') + 3, start: source.indexOf('Kim')}]}
        activeMatch={0}
        searchScrollRequest={request()}
      />
    ))
    fireEvent.click(await screen.findByRole('button', {name: '2줄 접기'}))
    fireEvent.click(screen.getByRole('button', {name: '1줄 접기'}))
    setRequest(1)
    expect(screen.getByRole('button', {name: '3줄 선택'})).toBeTruthy()
    const closing = screen.getByRole('button', {name: '6줄 선택'})
    fireEvent.click(screen.getByRole('button', {name: '1줄 접기'}))
    setFile({...document, location: {...document.location, line: 5}})
    expect(screen.getByRole('button', {name: '5줄 선택'})).toBeTruthy()
    expect(screen.getByRole('button', {name: '6줄 선택'})).toBe(closing)
  })
  it('should restore fold state for the same revision and discard it when contents change', async () => {
    let saved: FileViewState = {}
    const binding = {
      read: () => saved,
      request: () => ({restore: true, version: 0}),
      update: (patch: Partial<FileViewState>) => {
        saved = {...saved, ...patch}
      },
    }
    const mount = (file: CodeDocument) =>
      render(() => (
        <ViewStateContext.Provider value={{bind: () => binding}}>
          <SCodeDocument document={file} onFollow={vi.fn()} />
        </ViewStateContext.Provider>
      ))
    const first = mount(document)
    fireEvent.click(await screen.findByRole('button', {name: '1줄 접기'}))
    first.unmount()
    const second = mount(document)
    expect(await screen.findByRole('button', {name: '1줄 펼치기'})).toBeTruthy()
    second.unmount()
    mount({...document, revision: 'v2'})
    expect(await screen.findByRole('button', {name: '1줄 접기'})).toBeTruthy()
  })
  it('should discard pending fold discovery when the open file changes', () => {
    const callbacks: (() => void)[] = []
    vi.stubGlobal('requestIdleCallback', (callback: () => void) => callbacks.push(callback))
    const [file, setFile] = createSignal(document)
    render(() => <SCodeDocument document={file()} onFollow={vi.fn()} />)
    setFile({
      ...document,
      lines: [[{kind: 'plain', navigation: null, offset: 0, text: 'const value = 1'}]],
      location: {...document.location, path: 'other.ts'},
      revision: 'v2',
      source: 'const value = 1',
    })
    expect(callbacks).toHaveLength(2)
    callbacks[0]()
    expect(screen.queryByRole('button', {name: '1줄 접기'})).toBeNull()
    callbacks[1]()
    expect(screen.queryByRole('button', {name: '1줄 접기'})).toBeNull()
  })
})
