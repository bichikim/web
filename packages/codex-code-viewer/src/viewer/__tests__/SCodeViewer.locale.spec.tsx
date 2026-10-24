/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {EditorView} from '@codemirror/view'
import {SCodeViewer} from '../SCodeViewer'
import type {ViewerPort} from '../types'

describe('SCodeViewer language', () => {
  const dialogs = ['showModal', 'close'].map(
    (name) => [name, Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, name)] as const,
  )
  const popover = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
  const scroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
  beforeEach(() => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    })
    localStorage.setItem('codex-code-viewer.language', 'auto')
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('en-US')
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = true
      },
    })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value(this: HTMLDialogElement) {
        this.open = false
      },
    })
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
    localStorage.clear()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    for (const [name, descriptor] of dialogs) {
      if (descriptor === undefined) {
        Reflect.deleteProperty(HTMLDialogElement.prototype, name)
      } else {
        Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
      }
    }
    if (popover === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'showPopover', popover)
    }
    if (scroll === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scroll)
    }
  })
  const mount = () => {
    let locale: (value: string | undefined) => void = () => {}
    const port: ViewerPort = {
      call: vi.fn().mockResolvedValue({content: []}),
      context: vi.fn(),
      start: vi.fn<ViewerPort['start']>().mockResolvedValue(() => {}),
      subscribeLocale: (receive) => {
        locale = receive
        receive('ko-KR')
        return vi.fn()
      },
    }
    render(() => <SCodeViewer port={port} />)
    vi.mocked(port.start).mock.calls[0]![0]({
      document: {
        lines: [[{kind: 'plain', navigation: null, offset: 0, text: 'const 이름 = 1'}]],
        location: {column: 1, line: 1, path: '설정.ts'},
        revision: 'first',
        source: 'const 이름 = 1',
      },
      session: 'session',
      workspace: '/project',
    })
    return {locale, port}
  }
  it('should start in English without a saved language despite a Korean host locale', () => {
    localStorage.clear()
    mount()
    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByRole('button', {name: 'Settings'})).toBeInTheDocument()
  })
  it.each([
    ['日本語', 'ja', '設定', '言語'],
    ['简体中文', 'zh-CN', '设置', '语言'],
    ['Español', 'es', 'Configuración', 'Idioma'],
  ])(
    'should select and persist %s without changing file contents',
    (option, language, settings, label) => {
      const {locale} = mount()
      fireEvent.click(screen.getByRole('button', {name: '설정'}))
      fireEvent.click(screen.getByRole('combobox', {name: '언어'}))
      fireEvent.click(screen.getByRole('option', {name: option}))
      expect(screen.getByRole('dialog', {name: settings})).toBeInTheDocument()
      expect(screen.getByRole('combobox', {name: label})).toHaveTextContent(option)
      expect(document.documentElement.lang).toBe(language)
      expect(localStorage.getItem('codex-code-viewer.language')).toBe(language)
      locale('en-US')
      expect(screen.getByRole('dialog', {name: settings})).toBeInTheDocument()
      expect(screen.getByText('const 이름 = 1')).toBeInTheDocument()
    },
  )
  it('should switch UI and editor labels with the host while retaining the editor draft', () => {
    const {locale} = mount()
    fireEvent.click(screen.getByRole('button', {name: '편집'}))
    const textbox = screen.getByRole('textbox', {name: '코드 편집기'})
    const editor = EditorView.findFromDOM(textbox)!
    editor.dispatch({changes: {from: editor.state.doc.length, insert: '\n// 초안'}})
    locale('en-US')
    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByRole('textbox', {name: 'Code editor'})).toBe(textbox)
    expect(editor.state.sliceDoc()).toBe('const 이름 = 1\n// 초안')
    expect(screen.getByRole('button', {name: 'Edit'})).toBeInTheDocument()
    locale('ko-KR')
    expect(screen.getByRole('textbox', {name: '코드 편집기'})).toBe(textbox)
    expect(editor.state.sliceDoc()).toContain('// 초안')
  })
  it('should persist a manual choice and resume host language when Automatic is selected', () => {
    const {locale} = mount()
    fireEvent.click(screen.getByRole('button', {name: '설정'}))
    fireEvent.click(screen.getByRole('combobox', {name: '언어'}))
    fireEvent.click(screen.getByRole('option', {name: 'English'}))
    expect(screen.getByRole('dialog', {name: 'Settings'})).toBeInTheDocument()
    expect(screen.getByRole('combobox', {name: 'Preview lines'})).toHaveTextContent('2 lines')
    locale('ko-KR')
    expect(screen.getByRole('combobox', {name: 'Language'})).toHaveTextContent('English')
    cleanup()
    const next = mount()
    fireEvent.click(screen.getByRole('button', {name: 'Settings'}))
    fireEvent.click(screen.getByRole('combobox', {name: 'Language'}))
    fireEvent.click(screen.getByRole('option', {name: 'Automatic'}))
    expect(screen.getByRole('dialog', {name: '설정'})).toBeInTheDocument()
    next.locale('en-GB')
    expect(screen.getByRole('dialog', {name: 'Settings'})).toBeInTheDocument()
  })
  it('should localize connection feedback and preserve external diagnostic details', () => {
    const {locale, port} = mount()
    const report = vi.mocked(port.start).mock.calls[0]![1]
    locale('en-US')
    report({code: 'session-expired'})
    expect(screen.getByText('The connection closed. Reopen the file.')).toBeInTheDocument()
    locale('ko-KR')
    expect(screen.getByText('연결이 종료되었습니다. 파일을 다시 열어 주세요.')).toBeInTheDocument()
    report(new Error('External service: custom failure'))
    expect(screen.getByText('External service: custom failure')).toBeInTheDocument()
  })
})
