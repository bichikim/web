import {
  composeParameterPartProperties,
  type PuppetParameterValueMap,
  type ResolvedPartRenderProperties,
} from '../../deformation'
import type {PuppetDocument, PuppetPart} from '../document'
import {getScenePartStates} from '../scene'
import {resolveParameterValue} from '../parameter-value'

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
  readonly partById: ReadonlyMap<string, PuppetPart>
}

interface StaticMaskStructure {
  readonly maskPartIds: ReadonlySet<string>
  readonly partById: ReadonlyMap<string, PuppetPart>
  readonly planByPartId: Map<string, PartMaskRenderPlan | undefined>
}

const createPartMaskPlan = (options: CreatePartMaskPlanOptions): PartMaskRenderPlan | undefined => {
  if (options.ancestorPartIds.has(options.partId)) {
    return undefined
  }

  const part = options.partById.get(options.partId)
  const maskPartIds = part?.properties?.clippingMaskIds ?? []
  if (maskPartIds.length === 0) {
    return undefined
  }

  const ancestorPartIds = new Set(options.ancestorPartIds)
  ancestorPartIds.add(options.partId)
  const sources = maskPartIds.flatMap((partId): ReadonlyArray<PartMaskSourcePlan> => {
    const sourcePart = options.partById.get(partId)
    if (sourcePart === undefined) {
      return []
    }

    return [
      {
        invertedMask: composeParameterPartProperties({
          document: options.document,
          partId,
        }).invertedMask,
        mask: createPartMaskPlan({
          ancestorPartIds,
          document: options.document,
          partById: options.partById,
          partId,
        }),
        partId,
      },
    ]
  })

  return {sources}
}

const maskStructureByDocument = new WeakMap<PuppetDocument, StaticMaskStructure>()

const getStaticMaskStructure = (document: PuppetDocument): StaticMaskStructure => {
  let structure = maskStructureByDocument.get(document)
  if (structure === undefined) {
    const partById = new Map<string, PuppetPart>()
    for (const part of document.parts) {
      if (!partById.has(part.id)) {
        partById.set(part.id, part)
      }
    }

    structure = {
      maskPartIds: new Set(
        document.parts.flatMap((part) => part.properties?.clippingMaskIds ?? []),
      ),
      partById,
      planByPartId: new Map(),
    }
    maskStructureByDocument.set(document, structure)
  }

  return structure
}

const getPartMaskPlan = (
  document: PuppetDocument,
  structure: StaticMaskStructure,
  partId: string,
): PartMaskRenderPlan | undefined => {
  if (!structure.planByPartId.has(partId)) {
    structure.planByPartId.set(
      partId,
      createPartMaskPlan({
        ancestorPartIds: new Set(),
        document,
        partById: structure.partById,
        partId,
      }),
    )
  }

  return structure.planByPartId.get(partId)
}

export const getPartRenderPlans = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
): ReadonlyArray<PartRenderPlan> => {
  const maskStructure = getStaticMaskStructure(document)

  const states = (document.layerOrderRules ?? []).reduce((orderedStates, rule) => {
    const total = rule.when.parameterIds.reduce((sum, id) => {
      const parameter = document.parameters?.find((candidate) => candidate.id === id)
      return (
        sum +
        (parameter === undefined ? 0 : resolveParameterValue(parameter, parameterValues?.[id]))
      )
    }, 0)
    const matches =
      rule.when.comparison === 'greater-than'
        ? total > rule.when.threshold
        : total < rule.when.threshold
    if (!matches) {
      return orderedStates
    }

    const selectedIds = new Set(rule.partIds)
    const selected = orderedStates.filter((state) => selectedIds.has(state.partId))
    const remaining = orderedStates.filter((state) => !selectedIds.has(state.partId))
    return remaining.flatMap((state) => {
      if (state.partId !== rule.referencePartId) {
        return [state]
      }
      return rule.placement === 'before' ? [...selected, state] : [state, ...selected]
    })
  }, getScenePartStates(document))

  return states.flatMap((state): ReadonlyArray<PartRenderPlan> => {
    const part = maskStructure.partById.get(state.partId)
    if (part === undefined) {
      return []
    }

    const properties = composeParameterPartProperties({
      document,
      parameterValues,
      partId: state.partId,
    })
    const render = !maskStructure.maskPartIds.has(state.partId) || properties.renderWhenUsedAsMask
    return [
      {
        mask: getPartMaskPlan(document, maskStructure, state.partId),
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
