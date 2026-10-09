import {afterEach, describe, expect, it, vi} from 'vitest'
import type {CodeDocument} from '../../shared/contracts'
import {createPort, createViewerFixture, document, initial} from './fixtures/viewer'

describe('useViewer context', () => {
  const {mount, dispose} = createViewerFixture()
  afterEach(() => {
    dispose()
    vi.unstubAllGlobals()
  })
  it('should copy an absolute tree path and preserve the viewed file and selection', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', {clipboard: {writeText}})
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(3, 5)
    const previous = viewer.session()?.document
    await viewer.copyPath('/project/src/my file.ts')
    expect(writeText).toHaveBeenCalledWith('/project/src/my file.ts')
    expect(viewer.notice()?.message).toBe('경로를 복사했습니다.')
    expect(viewer.session()?.document).toBe(previous)
    expect(viewer.selection()).toMatchObject({endLine: 5, line: 3})
    expect(port.call).not.toHaveBeenCalled()
    expect(port.context).not.toHaveBeenCalled()
    await viewer.copy('code text')
    expect(writeText).toHaveBeenLastCalledWith('code text')
    expect(viewer.notice()?.message).toBe('코드를 복사했습니다.')
  })

  it('should report a rejected path copy without announcing success', async () => {
    vi.stubGlobal('navigator', {
      clipboard: {writeText: vi.fn().mockRejectedValue(new Error('clipboard denied'))},
    })
    const viewer = mount(createPort())
    await viewer.copyPath('/project/src')
    expect(viewer.notice()?.message).toBe('clipboard denied')
  })

  it('should add a tree path without changing the viewed document, line selection or history', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(3, 5)
    const previous = viewer.session()?.document
    await viewer.sharePath({kind: 'directory', path: '/project/src'})
    expect(port.context).toHaveBeenCalledWith({kind: 'directory', path: '/project/src'})
    expect(viewer.session()?.document).toBe(previous)
    expect(viewer.selection()).toMatchObject({endLine: 5, line: 3})
    expect(port.call).not.toHaveBeenCalled()
    expect(viewer.canBack()).toBe(false)
    expect(viewer.notice()?.message).toBe('폴더를 다음 채팅 메시지에 추가했습니다.')
  })

  it('should attach selected draft text without saving it or replacing it with disk content', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.editing.toggle()
    viewer.editing.change('const draft = 42')
    const snippet = {
      column: 1,
      endColumn: 17,
      endLine: 1,
      kind: 'code' as const,
      line: 1,
      path: 'main.tsx',
      text: 'const draft = 42',
    }
    await viewer.share(snippet)
    expect(port.context).toHaveBeenCalledWith({...snippet, path: '/project/main.tsx'})
    expect(port.call).not.toHaveBeenCalled()
    expect(viewer.editing.dirty()).toBe(true)
    expect(viewer.notice()?.message).toBe('선택한 코드를 다음 채팅 메시지에 추가했습니다.')
  })

  it('should report a rejected tree attachment without announcing success', async () => {
    const port = createPort()
    vi.mocked(port.context).mockRejectedValue(new Error('context failed'))
    const viewer = mount(port)
    await viewer.sharePath({kind: 'file', path: '/project/main.tsx'})
    expect(viewer.notice()?.message).toBe('context failed')
  })

  it('should reject a tree attachment from a previous workspace', async () => {
    const port = createPort()
    const viewer = mount(port)
    await viewer.sharePath({kind: 'file', path: '/other/file.ts'})
    expect(port.context).not.toHaveBeenCalled()
  })

  it('should select a line locally and add its address to chat without navigating', async () => {
    const port = createPort()
    const viewer = mount(port)
    const previous = viewer.session()?.document
    viewer.selectLines(8)
    expect(viewer.selection()).toEqual({column: 1, endLine: 8, line: 8, path: 'main.tsx'})
    expect(viewer.session()?.document).toBe(previous)
    expect(port.call).not.toHaveBeenCalled()
    expect(viewer.canBack()).toBe(false)
    await viewer.share()
    expect(port.context).toHaveBeenCalledWith({
      column: 1,
      endLine: 8,
      line: 8,
      path: '/project/main.tsx',
    })
  })

  it('should retain exact columns and attach a menu snapshot after the current selection changes', async () => {
    const port = createPort()
    const file: CodeDocument = {
      ...initial.document,
      lines: [[{kind: 'plain', navigation: null, offset: 0, text: 'hello world'}]],
      source: 'hello world',
    }
    port.start = async (receive) => {
      receive({...initial, document: file})
      return () => {}
    }
    const viewer = mount(port)
    viewer.selectText({column: 3, endColumn: 7, endLine: 1, line: 1})
    expect(viewer.address()).toBe('main.tsx:1:3-1:7')
    const snapshot = viewer.selection()!
    viewer.selectLines(1)
    await viewer.share(snapshot)
    expect(port.context).toHaveBeenCalledWith({
      column: 3,
      endColumn: 7,
      endLine: 1,
      line: 1,
      path: '/project/main.tsx',
    })
  })

  it('should attach SVG as a file by default and retain an explicit source selection', async () => {
    const port = createPort()
    port.start = async (receive) => {
      receive({
        ...initial,
        document: {
          ...document('icon.svg'),
          media: {kind: 'image', mimeType: 'image/svg+xml', size: 10},
        },
      })
      return () => {}
    }
    const viewer = mount(port)
    await viewer.share()
    expect(port.context).toHaveBeenLastCalledWith({kind: 'file', path: '/project/icon.svg'})
    await viewer.share({column: 2, endColumn: 5, endLine: 1, line: 1, path: 'icon.svg'})
    expect(port.context).toHaveBeenLastCalledWith({
      column: 2,
      endColumn: 5,
      endLine: 1,
      line: 1,
      path: '/project/icon.svg',
    })
  })

  it('should normalize an upward selection and add the entire range to chat', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(9, 3)
    expect(viewer.selection()).toMatchObject({endLine: 9, line: 3})
    await viewer.share()
    expect(port.context).toHaveBeenCalledWith({
      column: 1,
      endLine: 9,
      line: 3,
      path: '/project/main.tsx',
    })
  })

  it('should show chat context confirmation without replacing the selected address', async () => {
    const viewer = mount(createPort())
    viewer.selectLines(3, 5)
    await viewer.share()
    expect(viewer.notice()?.message).toBe(
      '선택한 파일과 줄 정보를 다음 채팅 메시지에 추가했습니다.',
    )
    expect(viewer.address()).toBe('main.tsx:3:1-5:1')
    viewer.selectLines(8)
    expect(viewer.address()).toBe('main.tsx:8:1')
    expect(viewer.notice()?.message).toBe(
      '선택한 파일과 줄 정보를 다음 채팅 메시지에 추가했습니다.',
    )
  })

  it('should attach an unsaved diff without saving or changing the selected address', async () => {
    const port = createPort()
    const viewer = mount(port)
    viewer.selectLines(3, 5)
    viewer.editing.change('edited source')
    await viewer.shareChanges()
    expect(port.context).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'changes',
        patch: expect.stringContaining('+edited source\n'),
        path: '/project/main.tsx',
        revision: 'main.tsx',
      }),
    )
    expect(port.call).not.toHaveBeenCalled()
    expect(viewer.editing.dirty()).toBe(true)
    expect(viewer.notice()?.message).toBe('변경 내용을 다음 채팅 메시지에 추가했습니다.')
    expect(viewer.address()).toBe('main.tsx:3:1-5:1')
  })
})
