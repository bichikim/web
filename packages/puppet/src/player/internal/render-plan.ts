import {
  composeParameterPartProperties,
  type PuppetParameterValueMap,
  type ResolvedPartRenderProperties,
} from '../../deformation'
import type {PuppetDocument} from '../document'
import {getScenePartStates} from '../scene'

export interface PartMaskSourcePlan {
  readonly invertedMask: boolean
  readonly mask?: PartMaskRenderPlan
  readonly partId: string
}

export interface PartMaskRenderPlan {
  readonly sources: ReadonlyArray<PartMaskSourcePlan>
}

export interface PartRenderPlan {
  readonly mask?: PartMaskRenderPlan
  readonly partId: string
  readonly properties: ResolvedPartRenderProperties
  readonly render: boolean
  readonly visible: boolean
}

interface CreatePartMaskPlanOptions {
  readonly ancestorPartIds: ReadonlySet<string>
  readonly document: PuppetDocument
  readonly partId: string
}

const createPartMaskPlan = (options: CreatePartMaskPlanOptions): PartMaskRenderPlan | undefined => {
  if (options.ancestorPartIds.has(options.partId)) {
    return undefined
  }

  const part = options.document.parts.find((candidate) => candidate.id === options.partId)
  const maskPartIds = part?.properties?.clippingMaskIds ?? []
  if (maskPartIds.length === 0) {
    return undefined
  }

  const ancestorPartIds = new Set(options.ancestorPartIds)
  ancestorPartIds.add(options.partId)
  const sources = maskPartIds.flatMap((partId): ReadonlyArray<PartMaskSourcePlan> => {
    const sourcePart = options.document.parts.find((candidate) => candidate.id === partId)
    if (sourcePart === undefined) {
      return []
    }

    return [
      {
        invertedMask: composeParameterPartProperties({
          document: options.document,
          partId,
        }).invertedMask,
        mask: createPartMaskPlan({ancestorPartIds, document: options.document, partId}),
        partId,
      },
    ]
  })

  return {sources}
}

export const getPartRenderPlans = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
): ReadonlyArray<PartRenderPlan> => {
  const maskPartIds = new Set(
    document.parts.flatMap((part) => part.properties?.clippingMaskIds ?? []),
  )

  return getScenePartStates(document).flatMap((state): ReadonlyArray<PartRenderPlan> => {
    const part = document.parts.find((candidate) => candidate.id === state.partId)
    if (part === undefined) {
      return []
    }

    const properties = composeParameterPartProperties({
      document,
      parameterValues,
      partId: state.partId,
    })
    const render = !maskPartIds.has(state.partId) || properties.renderWhenUsedAsMask
    return [
      {
        mask: createPartMaskPlan({
          ancestorPartIds: new Set(),
          document,
          partId: state.partId,
        }),
        partId: state.partId,
        properties,
        render,
        visible: state.visible && render,
      },
    ]
  })
}

const valuesEqual = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  first.length === second.length && first.every((value, index) => value === second[index])

export const canReusePartResources = (document: PuppetDocument, nextDocument: PuppetDocument) => {
  const maskPartIds = new Set(
    nextDocument.parts.flatMap((part) => part.properties?.clippingMaskIds ?? []),
  )

  return (
    nextDocument.parts.length === document.parts.length &&
    nextDocument.parts.every((part, index) => {
      const previousPart = document.parts[index]
      return (
        previousPart?.id === part.id &&
        previousPart.texture.src === part.texture.src &&
        (!maskPartIds.has(part.id) ||
          (valuesEqual(previousPart.mesh.indices, part.mesh.indices) &&
            valuesEqual(previousPart.mesh.uvs, part.mesh.uvs))) &&
        (previousPart.properties?.clippingMaskIds ?? []).join('\0') ===
          (part.properties?.clippingMaskIds ?? []).join('\0')
      )
    })
  )
}
