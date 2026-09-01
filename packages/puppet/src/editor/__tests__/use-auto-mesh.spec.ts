import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, test, vi} from 'vitest'

import {createDemoDocument, type PuppetDocument} from '../../player'
import {useAutoMesh} from '../use-auto-mesh'

const mocks = vi.hoisted(() => ({
  autoMeshPart: vi.fn(),
}))

vi.mock('../auto-mesh-part', () => ({
  autoMeshPart: mocks.autoMeshPart,
}))

afterEach(() => {
  vi.clearAllMocks()
})

describe('useAutoMesh', () => {
  test('should apply a generated document through the latest callbacks', async () => {
    const document = createDemoDocument()
    const generatedDocument = {...document, motions: []}
    const onBeforeApply = vi.fn()
    const onDocumentChange = vi.fn()
    const onNotice = vi.fn()
    mocks.autoMeshPart.mockResolvedValue({document: generatedDocument, ok: true})

    await createRoot(async (dispose) => {
      const [activePartId] = createSignal<string | null>('mesh-preview')
      const [sourceDocument] = createSignal<PuppetDocument>(document)
      const autoMesh = useAutoMesh({
        activePartId,
        document: sourceDocument,
        onBeforeApply,
        onDocumentChange,
        onNotice,
      })

      await expect(autoMesh.generate({alphaThreshold: 16, cellSize: 32})).resolves.toBe(true)
      expect(onBeforeApply).toHaveBeenCalledOnce()
      expect(onDocumentChange).toHaveBeenCalledWith(generatedDocument)
      expect(onNotice).toHaveBeenCalledWith('mesh-preview 파트의 메시를 다시 생성했습니다.')
      dispose()
    })
  })

  test('should discard a result when the document changes during generation', async () => {
    const document = createDemoDocument()
    let resolveGeneration:
      | ((value: {readonly document: PuppetDocument; readonly ok: true}) => void)
      | undefined
    mocks.autoMeshPart.mockReturnValue(
      new Promise((resolve) => {
        resolveGeneration = resolve
      }),
    )
    const onDocumentChange = vi.fn()
    const onNotice = vi.fn()

    await createRoot(async (dispose) => {
      const [activePartId] = createSignal<string | null>('mesh-preview')
      const [sourceDocument, setSourceDocument] = createSignal<PuppetDocument>(document)
      const autoMesh = useAutoMesh({
        activePartId,
        document: sourceDocument,
        onDocumentChange,
        onNotice,
      })
      const generation = autoMesh.generate({alphaThreshold: 16, cellSize: 32})

      setSourceDocument({...document})
      resolveGeneration?.({document, ok: true})

      await expect(generation).resolves.toBe(false)
      expect(onDocumentChange).not.toHaveBeenCalled()
      expect(onNotice).toHaveBeenCalledWith(
        '편집 대상이 변경되어 자동 메시 결과를 적용하지 않았습니다.',
      )
      dispose()
    })
  })

  test('should discard a result after the dialog is dismissed', async () => {
    const document = createDemoDocument()
    let resolveGeneration:
      | ((value: {readonly document: PuppetDocument; readonly ok: true}) => void)
      | undefined
    mocks.autoMeshPart.mockReturnValue(
      new Promise((resolve) => {
        resolveGeneration = resolve
      }),
    )
    const onDocumentChange = vi.fn()
    const onNotice = vi.fn()

    await createRoot(async (dispose) => {
      const [activePartId] = createSignal<string | null>('mesh-preview')
      const [sourceDocument] = createSignal<PuppetDocument>(document)
      const autoMesh = useAutoMesh({
        activePartId,
        document: sourceDocument,
        onDocumentChange,
        onNotice,
      })

      autoMesh.onOpenChange(true)
      const generation = autoMesh.generate({alphaThreshold: 16, cellSize: 32})
      autoMesh.onOpenChange(false)
      resolveGeneration?.({document, ok: true})

      await expect(generation).resolves.toBe(false)
      expect(autoMesh.isOpen()).toBe(false)
      expect(onDocumentChange).not.toHaveBeenCalled()
      expect(onNotice).not.toHaveBeenCalled()
      dispose()
    })
  })

  test('should convert an unexpected generation rejection into an actionable notice', async () => {
    const document = createDemoDocument()
    const onDocumentChange = vi.fn()
    const onNotice = vi.fn()
    mocks.autoMeshPart.mockRejectedValue(new Error('unexpected'))

    await createRoot(async (dispose) => {
      const [activePartId] = createSignal<string | null>('mesh-preview')
      const [sourceDocument] = createSignal<PuppetDocument>(document)
      const autoMesh = useAutoMesh({
        activePartId,
        document: sourceDocument,
        onDocumentChange,
        onNotice,
      })

      await expect(autoMesh.generate({alphaThreshold: 16, cellSize: 32})).resolves.toBe(false)
      expect(onDocumentChange).not.toHaveBeenCalled()
      expect(onNotice).toHaveBeenCalledWith('자동 메시 생성 중 예상하지 못한 오류가 발생했습니다.')
      dispose()
    })
  })
})
