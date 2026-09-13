/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {expect, test, vi} from 'vitest'
import {createDemoDocument} from '../../player'
import type {importPsd} from '../import-psd'
import {useDocumentHistory} from '../use-document-history'
import {usePsdReimport} from '../use-psd-reimport'

test('should ignore a cancelled import and prevent applying a stale document', async () => {
  await createRoot(async (dispose) => {
    const readPsd = vi.fn<typeof importPsd>()
    const initial = createDemoDocument()
    const [document, setDocument] = createSignal(initial)
    const onChange = vi.fn()
    const controller = usePsdReimport({
      document,
      onDocumentChange: onChange,
      readPsd,
      onNotice: vi.fn(),
    })
    let resolve!: (result: Awaited<ReturnType<typeof importPsd>>) => void
    readPsd.mockImplementationOnce(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const loading = controller.load(new File([], 'model.psd'))
    controller.cancel()
    resolve({document: initial, ok: true, warnings: []})
    await loading
    expect(controller.state().kind).toBe('idle')
    readPsd.mockResolvedValue({document: initial, ok: true, warnings: []})
    await controller.load(new File([], 'model.psd'))
    expect(controller.state().kind).toBe('review')
    setDocument({...initial})
    controller.apply()
    expect(controller.state().kind).toBe('error')
    expect(onChange).not.toHaveBeenCalled()
    dispose()
  })
})

test('should apply reviewed additions as one undoable document change', async () => {
  await createRoot(async (dispose) => {
    const readPsd = vi.fn<typeof importPsd>()
    const initial = createDemoDocument()
    const history = useDocumentHistory({initialDocument: initial})
    const controller = usePsdReimport({
      document: history.document,
      onDocumentChange: history.setDocument,
      readPsd,
      onNotice: vi.fn(),
    })
    readPsd.mockResolvedValue({document: initial, ok: true, warnings: []})
    await controller.load(new File([], 'model.psd'))
    controller.apply()
    expect(history.canUndo()).toBe(false)
    expect(controller.selection().count).toBe(0)
    controller.setIncludeNew(true)
    expect(controller.selection().count).toBe(3)
    controller.apply()
    expect(controller.state().kind).toBe('idle')
    expect(history.document().parts).toHaveLength(6)
    expect(history.undoCount()).toBe(1)
    expect(history.undo()).toBe(true)
    expect(history.document()).toEqual(initial)
    expect(history.redo()).toBe(true)
    expect(history.document().parts).toHaveLength(6)
    dispose()
  })
})

test('should keep missing layers by default and delete them only when selected', async () => {
  await createRoot(async (dispose) => {
    const readPsd = vi.fn<typeof importPsd>()
    const demo = createDemoDocument()
    const original = {
      ...demo,
      parts: demo.parts.map((part, index) => ({
        ...part,
        psdSource: {
          layerId: index,
          path: [part.id],
          width: part.texture.width,
          x: 0,
          height: part.texture.height,
          y: 0,
        },
      })),
    }
    const history = useDocumentHistory({initialDocument: original})
    const controller = usePsdReimport({
      document: history.document,
      onDocumentChange: history.setDocument,
      readPsd,
      onNotice: vi.fn(),
    })
    readPsd.mockResolvedValue({
      document: {...original, parts: [original.parts[0]!]},
      ok: true,
      warnings: [],
    })
    await controller.load(new File([], 'model.psd'))
    controller.apply()
    expect(history.document().parts).toHaveLength(3)
    await controller.load(new File([], 'model.psd'))
    expect(controller.selection().count).toBe(1)
    controller.setRemoveMissing(true)
    expect(controller.selection().count).toBe(3)
    expect(controller.selection().rows.filter((row) => row.label === '삭제')).toHaveLength(2)
    controller.apply()
    expect(history.document().parts).toHaveLength(1)
    expect(history.undo()).toBe(true)
    expect(history.document().parts).toHaveLength(3)
    dispose()
  })
})

test('should show reader failures without changing the document', async () => {
  await createRoot(async (dispose) => {
    const document = createDemoDocument()
    const onDocumentChange = vi.fn()
    const readPsd = vi
      .fn<typeof importPsd>()
      .mockResolvedValueOnce({error: {code: 'invalid-file'}, ok: false})
      .mockRejectedValueOnce(new Error('decode'))
    const controller = usePsdReimport({
      document: () => document,
      onDocumentChange,
      onNotice: vi.fn(),
      readPsd,
    })
    await controller.load(new File([], 'bad.psd'))
    expect(controller.state()).toEqual({kind: 'error', message: 'PSD 파일을 선택하세요.'})
    await controller.load(new File([], 'broken.psd'))
    expect(controller.state()).toEqual({
      kind: 'error',
      message: 'PSD를 읽지 못했습니다. 파일을 다시 선택하세요.',
    })
    expect(onDocumentChange).not.toHaveBeenCalled()
    expect(controller.selection().count).toBe(0)
    dispose()
  })
})
