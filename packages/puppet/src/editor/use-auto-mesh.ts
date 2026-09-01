import {type Accessor, createMemo, createSignal} from 'solid-js'

import type {PuppetDocument, PuppetPart} from '../player'
import {
  autoMeshPart,
  type AutoMeshPartErrorCode,
  type AutoMeshPartResult,
  type AutoMeshSettings,
} from './auto-mesh-part'

export interface UseAutoMeshProps {
  readonly activePartId: Accessor<string | null>
  readonly document: Accessor<PuppetDocument>
  readonly onBeforeApply?: () => void
  readonly onDocumentChange: (document: PuppetDocument) => void
  readonly onNotice?: (message: string) => void
}

export interface UseAutoMeshResult {
  readonly generate: (settings: AutoMeshSettings) => Promise<boolean>
  readonly isOpen: Accessor<boolean>
  readonly onOpenChange: (open: boolean) => void
  readonly target: Accessor<PuppetPart | undefined>
}

const getAutoMeshErrorMessage = (code: AutoMeshPartErrorCode) => {
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
  const [isOpen, setIsOpen] = createSignal(false)
  let generation = 0
  const target = createMemo(() => {
    const partId = props.activePartId()
    return partId === null
      ? undefined
      : props.document().parts.find((candidate) => candidate.id === partId)
  })
  const generate = async (settings: AutoMeshSettings) => {
    generation += 1
    const activeGeneration = generation
    const document = props.document()
    const part = target()

    if (part === undefined) {
      props.onNotice?.('자동 메시를 적용할 파트를 먼저 선택하세요.')
      return false
    }

    let result: AutoMeshPartResult

    try {
      result = await autoMeshPart({document, partId: part.id, settings})
    } catch {
      if (activeGeneration !== generation) {
        return false
      }

      if (props.document() !== document || props.activePartId() !== part.id) {
        props.onNotice?.('편집 대상이 변경되어 자동 메시 결과를 적용하지 않았습니다.')
      } else {
        props.onNotice?.('자동 메시 생성 중 예상하지 못한 오류가 발생했습니다.')
      }

      return false
    }

    if (activeGeneration !== generation) {
      return false
    }

    if (props.document() !== document || props.activePartId() !== part.id) {
      props.onNotice?.('편집 대상이 변경되어 자동 메시 결과를 적용하지 않았습니다.')
      return false
    }

    if (!result.ok) {
      props.onNotice?.(getAutoMeshErrorMessage(result.error.code))
      return false
    }

    props.onBeforeApply?.()
    props.onDocumentChange(result.document)
    props.onNotice?.(`${part.id} 파트의 메시를 다시 생성했습니다.`)
    return true
  }

  const onOpenChange = (open: boolean) => {
    if (!open) {
      generation += 1
    }

    setIsOpen(open)
  }

  return {generate, isOpen, onOpenChange, target}
}
