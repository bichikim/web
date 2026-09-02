import {type Accessor, createMemo, createSignal} from 'solid-js'

import type {PixelData} from '../mesh'
import {
  getScenePartStates,
  type PuppetDocument,
  type PuppetPart,
  type PuppetTexture,
} from '../player'
import {
  autoMeshPart,
  type AutoMeshPartErrorCode,
  type AutoMeshSettings,
  validateAutoMeshPart,
} from './auto-mesh-part'
import {
  readTexturePixels,
  type ReadTexturePixelsErrorCode,
  type ReadTexturePixelsResult,
} from './internal/read-texture-pixels'

export interface UseAutoMeshProps {
  readonly document: Accessor<PuppetDocument>
  readonly onBeforeApply?: () => void
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice?: (message: string) => void
  readonly partIds: Accessor<ReadonlyArray<string>>
}

export interface UseAutoMeshResult {
  readonly errorMessage: Accessor<string | null>
  readonly generate: (settings: AutoMeshSettings) => Promise<boolean>
  readonly isOpen: Accessor<boolean>
  readonly onOpenChange: (open: boolean) => void
  readonly targets: Accessor<ReadonlyArray<PuppetPart>>
}

type AutoMeshGenerationErrorCode = AutoMeshPartErrorCode | ReadTexturePixelsErrorCode

interface UnexpectedPixelReadFailure {
  readonly error: {readonly code: 'unexpected'}
  readonly ok: false
}

type AutoMeshPixelReadResult = ReadTexturePixelsResult | UnexpectedPixelReadFailure

const readAutoMeshPixels = async (texture: PuppetTexture): Promise<AutoMeshPixelReadResult> => {
  try {
    return await readTexturePixels({texture})
  } catch {
    return {error: {code: 'unexpected'}, ok: false}
  }
}

const getAutoMeshErrorMessage = (code: AutoMeshGenerationErrorCode) => {
  switch (code) {
    case 'decode-failed':
      return '선택한 파트의 텍스처를 해석하지 못했습니다.'
    case 'no-opaque-pixels':
      return '불투명한 픽셀이 없어 메시를 만들 수 없습니다.'
    case 'part-not-found':
      return '자동 메시를 적용할 파트를 찾지 못했습니다.'
    case 'render-failed':
      return '텍스처 픽셀을 분석할 캔버스를 만들지 못했습니다.'
    case 'too-large':
      return '텍스처가 너무 큽니다. 1,677만 픽셀 이하 이미지를 사용하세요.'
    case 'invalid-alpha-threshold':
    case 'invalid-cell-size':
    case 'invalid-pixel-data':
      return '자동 메시 생성 설정이 올바르지 않습니다.'
    default: {
      const exhaustiveCode: never = code
      return exhaustiveCode
    }
  }
}

export const useAutoMesh = (props: UseAutoMeshProps): UseAutoMeshResult => {
  const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
  const [isOpen, setIsOpen] = createSignal(false)
  let generation = 0
  const reportError = (message: string) => {
    setErrorMessage(message)
    props.onNotice?.(message)
  }
  const targets = createMemo(() => {
    const partIds = props.partIds()
    const document = props.document()
    const partStates = new Map(
      getScenePartStates(document).map((state) => [state.partId, state] as const),
    )
    const parts = partIds.flatMap((partId) => {
      const state = partStates.get(partId)
      const part = document.parts.find((candidate) => candidate.id === partId)
      return state?.visible === true && !state.locked && part !== undefined ? [part] : []
    })

    return parts.length === partIds.length ? parts : []
  })
  const generate = async (settings: AutoMeshSettings) => {
    generation += 1
    const activeGeneration = generation
    setErrorMessage(null)
    const document = props.document()
    const parts = targets()

    if (parts.length === 0) {
      reportError('자동 메시를 적용할 파트를 먼저 선택하세요.')
      return false
    }

    const validatedParts: Array<PuppetPart> = []

    for (const part of parts) {
      const validation = validateAutoMeshPart({document, partId: part.id, settings})

      if (!validation.ok) {
        reportError(getAutoMeshErrorMessage(validation.error.code))
        return false
      }

      validatedParts.push(validation.part)
    }

    const pixelResults = await Promise.all(
      validatedParts.map((part) => readAutoMeshPixels(part.texture)),
    )

    if (activeGeneration !== generation) {
      return false
    }

    const currentPartIds = props.partIds()
    if (
      props.document() !== document ||
      currentPartIds.length !== parts.length ||
      parts.some((part, index) => currentPartIds[index] !== part.id)
    ) {
      reportError('편집 대상이 변경되어 자동 메시 결과를 적용하지 않았습니다.')
      return false
    }

    const pixels: Array<PixelData> = []

    for (const pixelResult of pixelResults) {
      if (!pixelResult.ok) {
        reportError(
          pixelResult.error.code === 'unexpected'
            ? '자동 메시 생성 중 예상하지 못한 오류가 발생했습니다.'
            : getAutoMeshErrorMessage(pixelResult.error.code),
        )
        return false
      }

      pixels.push(pixelResult.pixels)
    }

    let generatedDocument = document

    for (const [index, part] of parts.entries()) {
      const result = autoMeshPart({
        document: generatedDocument,
        partId: part.id,
        pixels: pixels[index]!,
        settings,
      })

      if (!result.ok) {
        reportError(getAutoMeshErrorMessage(result.error.code))
        return false
      }

      generatedDocument = result.document
    }

    props.onBeforeApply?.()
    props.onDocumentChange(generatedDocument)
    props.onNotice?.(
      parts.length === 1
        ? `${parts[0]!.id} 파트의 메시를 다시 생성했습니다.`
        : `${parts.length}개 파트의 메시를 다시 생성했습니다.`,
    )
    return true
  }

  const onOpenChange = (open: boolean) => {
    setErrorMessage(null)

    if (!open) {
      generation += 1
    }

    setIsOpen(open)
  }

  return {errorMessage, generate, isOpen, onOpenChange, targets}
}
