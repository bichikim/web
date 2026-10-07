/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {CodeDocument} from '../../shared/contracts'
import {SFileDocument} from '../SFileDocument'
import type {ViewerPort} from '../types'

describe('SFileDocument', () => {
  const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
  beforeEach(() =>
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    }),
  )
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    if (originalScroll === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
    }
  })
  const port: ViewerPort = {call: vi.fn(), context: vi.fn(), start: vi.fn()}
  const document = {
    lines: [[{kind: 'plain' as const, navigation: null, offset: 0, text: '# 문서'}]],
    location: {column: 1, line: 1, path: 'README.md'},
    revision: 'first',
    source: '# 문서',
  }
  it('should switch Markdown to original during search and keep it after search closes', () => {
    const [visible, setVisible] = createSignal(false)
    render(() => (
      <SFileDocument
        document={document}
        port={port}
        session="session"
        searchVisible={visible()}
        onFollow={vi.fn()}
      />
    ))
    expect(screen.getByRole('heading', {name: '문서'})).toBeTruthy()
    setVisible(true)
    expect(screen.getByLabelText('소스 코드').textContent).toContain('# 문서')
    setVisible(false)
    expect(screen.getByLabelText('소스 코드')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name: '미리보기'}))
    expect(screen.getByRole('heading', {name: '문서'})).toBeTruthy()
  })
  it('should display HTML literally without rendering markup or executable content', () => {
    const source = '<h1>HTML title</h1><script>throw new Error("execute")</script>'
    render(() => (
      <SFileDocument
        document={{
          ...document,
          lines: [[{kind: 'plain', navigation: null, offset: 0, text: source}]],
          location: {...document.location, path: 'index.html'},
          source,
        }}
        port={port}
        session="session"
        onFollow={vi.fn()}
      />
    ))
    const code = screen.getByLabelText('소스 코드')
    expect(code.textContent).toContain(source)
    expect(code.querySelector('script, iframe, h1')).toBeNull()
    expect(screen.queryByRole('button', {name: '미리보기'})).toBeNull()
  })
  it('should show CSV as a table and switch to literal source for file search', () => {
    const [visible, setVisible] = createSignal(false)
    const source = 'name,value\nAlpha,2'
    render(() => (
      <SFileDocument
        document={{
          ...document,
          lines: source
            .split('\n')
            .map((text) => [{kind: 'plain', navigation: null, offset: 0, text}]),
          location: {...document.location, path: 'data.csv'},
          source,
        }}
        port={port}
        session="session"
        searchVisible={visible()}
        onFollow={vi.fn()}
      />
    ))
    expect(screen.getByRole('table')).toBeTruthy()
    setVisible(true)
    expect(screen.getByLabelText('소스 코드').textContent).toContain('Alpha,2')
    fireEvent.click(screen.getByRole('button', {name: '미리보기'}))
    expect(screen.getByRole('table')).toBeTruthy()
  })
  it('should report malformed CSV and fall back to original source', () => {
    const source = 'a,b\n1,"unfinished'
    const onError = vi.fn()
    render(() => (
      <SFileDocument
        document={{
          ...document,
          lines: [[{kind: 'plain', navigation: null, offset: 0, text: source}]],
          location: {...document.location, path: 'broken.csv'},
          source,
        }}
        port={port}
        session="session"
        onFollow={vi.fn()}
        onError={onError}
      />
    ))
    expect(screen.getByLabelText('소스 코드').textContent).toContain(source)
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
    expect(screen.queryByRole('table')).toBeNull()
  })
  it('should keep malformed CSV in original mode when changing files in an existing viewer', () => {
    const onError = vi.fn()
    const [current, setCurrent] = createSignal({
      ...document,
      location: {...document.location, path: 'good.csv'},
      source: 'a,b\n1,2',
    })
    render(() => (
      <SFileDocument
        document={current()}
        port={port}
        session="session"
        onFollow={vi.fn()}
        onError={onError}
      />
    ))
    expect(screen.getByRole('table')).toBeTruthy()
    setCurrent({
      ...document,
      location: {...document.location, path: 'bad.csv'},
      source: 'a,b\n1,"unfinished',
    })
    expect(screen.getByLabelText('소스 코드')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
    expect(onError).toHaveBeenCalledOnce()
    setCurrent({
      ...document,
      location: {...document.location, path: 'good.csv'},
      source: 'a,b\n1,2',
    })
    expect(screen.getByRole('table')).toBeTruthy()
  })
  it('should display SVG source literally and return to image preview', async () => {
    vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:svg'), revokeObjectURL: vi.fn()})
    const source = '<svg><script>alert(1)</script></svg>'
    const mediaPort: ViewerPort = {
      ...port,
      call: vi.fn().mockResolvedValue({
        content: [],
        structuredContent: {data: btoa(source), next: source.length},
      }),
    }
    render(() => (
      <SFileDocument
        document={{
          ...document,
          lines: [[{kind: 'plain', navigation: null, offset: 0, text: source}]],
          location: {...document.location, path: 'icon.svg'},
          media: {kind: 'image', mimeType: 'image/svg+xml', size: source.length},
          source,
        }}
        port={mediaPort}
        session="session"
        onFollow={vi.fn()}
      />
    ))
    expect(await screen.findByRole('img', {name: 'icon.svg'})).toBeTruthy()
    fireEvent.click(screen.getByRole('button', {name: '원문'}))
    const code = screen.getByLabelText('소스 코드')
    expect(code.textContent).toContain(source)
    expect(code.querySelector('svg, script')).toBeNull()
    fireEvent.click(screen.getByRole('button', {name: '미리보기'}))
    expect(await screen.findByRole('img', {name: 'icon.svg'})).toBeTruthy()
  })
  it('should stop audio and release its URL when switching to a text document', async () => {
    vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:audio'), revokeObjectURL: vi.fn()})
    const pause = vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
    const mediaPort: ViewerPort = {
      call: vi.fn().mockResolvedValue({content: [], structuredContent: {data: 'AA==', next: 1}}),
      context: vi.fn(),
      start: vi.fn(),
    }
    const [current, setCurrent] = createSignal<CodeDocument>({
      lines: [[]],
      location: {column: 1, line: 1, path: 'track.mp3'},
      media: {kind: 'audio', mimeType: 'audio/mpeg', size: 1},
      revision: 'audio',
      source: '',
    })
    render(() => (
      <SFileDocument document={current()} port={mediaPort} session="session" onFollow={vi.fn()} />
    ))
    await screen.findByLabelText('track.mp3')
    setCurrent(document)
    expect(screen.getByRole('heading', {name: '문서'})).toBeTruthy()
    expect(pause).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:audio')
  })
})
