import {isParameterVisible} from '../parameter-visibility'
import {
  composeColorEffects,
  composeParameterDeformerProperties,
  composeParameterGroupProperties,
  composeParameterPartProperties,
  getGroupRenderProperties,
  IDENTITY_COLOR_EFFECT,
  type PuppetParameterValueMap,
  type ResolvedGroupRenderProperties,
  type ResolvedPartRenderProperties,
} from '../../deformation'
import type {
  PuppetDocument,
  PuppetPart,
  PuppetScene,
  PuppetSceneContainerNode,
  PuppetSceneGroupNode,
} from '../document'
import {resolveParameterValue} from '../parameter-value'
import {
  gatherLayers,
  getSceneLayerStructure,
  type InheritedGroupEffect,
  inheritGroupEffects,
} from './scene-layers'
import {getSpatialPartPose, type SpatialPartPose} from './spatial-part'
import {getDrawOrderedPartStates} from './scene-draw-order'
import {mixGroupOpacity, type MotionMix} from '../playback/mix-motion-frames'
import {
  getOverrideColorProperties,
  NO_RENDER_OVERRIDES,
  type PuppetRenderOverride,
  type RenderOverrides,
} from './render-overrides'

export interface PartMaskSourcePlan {
  readonly invertedMask: boolean
  readonly mask?: PartMaskRenderPlan
  readonly partId: string
}

export interface PartMaskRenderPlan {
  readonly sources: ReadonlyArray<PartMaskSourcePlan>
}

export interface PartRenderPlan {
  /** Offscreen groups the part is drawn into, outermost first. */
  readonly layerIds: ReadonlyArray<string>
  readonly mask?: PartMaskRenderPlan
  readonly partId: string
  readonly properties: ResolvedPartRenderProperties
  readonly render: boolean
  readonly visible: boolean
}

/** An offscreen group: its members are drawn into a layer that these properties composite. */
export interface LayerRenderPlan {
  readonly groupId: string
  /** Offscreen groups the layer is drawn into, outermost first. */
  readonly layerIds: ReadonlyArray<string>
  readonly mask?: PartMaskRenderPlan
  /** Includes the effect inherited from the plain groups above it. */
  readonly properties: Omit<ResolvedGroupRenderProperties, 'offscreen'>
  readonly visible: boolean
}

export interface PartRenderFrame {
  /** Offscreen groups by ID, outer layers before the layers inside them. */
  readonly layers: ReadonlyMap<string, LayerRenderPlan>
  readonly plans: ReadonlyArray<PartRenderPlan>
  readonly spatialPoses: ReadonlyMap<string, SpatialPartPose>
}

interface CreatePartMaskPlanOptions {
  readonly ancestorPartIds: ReadonlySet<string>
  readonly document: PuppetDocument
  readonly partId: string
  readonly partById: ReadonlyMap<string, PuppetPart>
}

interface StaticMaskStructure {
  readonly layerMaskByGroupId: ReadonlyMap<string, PartMaskRenderPlan | undefined>
  readonly maskPartIds: ReadonlySet<string>
  readonly partById: ReadonlyMap<string, PuppetPart>
  readonly planByPartId: Map<string, PartMaskRenderPlan | undefined>
}

const createPartMaskPlan = (options: CreatePartMaskPlanOptions): PartMaskRenderPlan | undefined => {
  if (options.ancestorPartIds.has(options.partId)) {
    return undefined
  }

  const ancestorPartIds = new Set(options.ancestorPartIds)
  ancestorPartIds.add(options.partId)
  return createMaskPlan(options.partById.get(options.partId)?.properties?.clippingMaskIds ?? [], {
    ...options,
    ancestorPartIds,
  })
}

const createMaskPlan = (
  maskPartIds: ReadonlyArray<string>,
  options: Omit<CreatePartMaskPlanOptions, 'partId'>,
): PartMaskRenderPlan | undefined => {
  if (maskPartIds.length === 0) {
    return undefined
  }

  const {ancestorPartIds} = options
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

    const {layers} = getSceneLayerStructure(document)
    structure = {
      layerMaskByGroupId: new Map(
        layers.map(({group}) => [
          group.id,
          createMaskPlan(getGroupRenderProperties(group).clippingMaskIds, {
            ancestorPartIds: new Set(),
            document,
            partById,
          }),
        ]),
      ),
      maskPartIds: new Set([
        ...document.parts.flatMap((part) => part.properties?.clippingMaskIds ?? []),
        ...layers.flatMap(({group}) => getGroupRenderProperties(group).clippingMaskIds),
      ]),
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

/** Per-frame inputs from playback: pose selections, motions' opacity tracks and app overrides. */
export interface FrameAdjustments {
  readonly mix?: MotionMix
  readonly overrides?: RenderOverrides
  readonly poseOpacityByPartId?: ReadonlyMap<string, number>
}

interface InheritedSample {
  readonly composition: PuppetDocument['colorComposition']
  readonly properties: ReadonlyArray<ResolvedGroupRenderProperties>
  readonly result: InheritedGroupEffect
}

const inheritedSamples = new WeakMap<ReadonlyArray<PuppetSceneContainerNode>, InheritedSample>()

const inheritFrameEffects = (
  groups: ReadonlyArray<PuppetSceneContainerNode>,
  resolve: (group: PuppetSceneContainerNode) => ResolvedGroupRenderProperties,
  composition: PuppetDocument['colorComposition'],
): InheritedGroupEffect => {
  const previous = inheritedSamples.get(groups)
  if (
    previous !== undefined &&
    previous.composition === composition &&
    groups.every((group, index) => resolve(group) === previous.properties[index])
  ) {
    return previous.result
  }
  const properties = groups.map(resolve)
  const result = inheritGroupEffects(groups, resolve, composition)
  inheritedSamples.set(groups, {composition, properties, result})
  return result
}

interface PropertySample {
  readonly composition: PuppetDocument['colorComposition']
  readonly inherited: InheritedGroupEffect['effect']
  readonly opacity: number
  readonly result: ResolvedPartRenderProperties
}

const propertySamples = new WeakMap<ResolvedPartRenderProperties, PropertySample>()

const composeFrameProperties = (
  composed: ResolvedPartRenderProperties,
  inherited: InheritedGroupEffect['effect'],
  opacity: number,
  composition: PuppetDocument['colorComposition'],
): ResolvedPartRenderProperties => {
  const previous = propertySamples.get(composed)
  if (
    previous?.inherited === inherited &&
    previous.composition === composition &&
    Object.is(previous.opacity, opacity)
  ) {
    return previous.result
  }
  const result = composeColorEffects({...composed, opacity}, inherited, composition)
  propertySamples.set(composed, {composition, inherited, opacity, result})
  return result
}

/** Parts in draw order, then moved by the layer order rules whose conditions hold. */
const getRuleOrderedPartStates = (
  document: PuppetDocument,
  parameterValues: PuppetParameterValueMap | undefined,
) =>
  (document.layerOrderRules ?? []).reduce(
    (orderedStates, rule) => {
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
    },
    getDrawOrderedPartStates(document, parameterValues),
  )

/** Combines a part override, pose selection and the motion's whole-model opacity. */
const resolveFrameOpacity = (
  partId: string,
  properties: ResolvedPartRenderProperties,
  adjustments: FrameAdjustments,
): number =>
  (adjustments.overrides?.parts.get(partId)?.opacity ??
    properties.opacity * (adjustments.poseOpacityByPartId?.get(partId) ?? 1)) *
  (adjustments.mix?.modelOpacity ?? 1)

export const getPartRenderFrame = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
  posedScene?: PuppetScene,
  adjustments: FrameAdjustments = {},
): PartRenderFrame => {
  const {mix} = adjustments
  const overrides = adjustments.overrides ?? NO_RENDER_OVERRIDES
  const maskStructure = getStaticMaskStructure(document)

  const states = getRuleOrderedPartStates(document, parameterValues)

  const poseByPartId = new Map(
    document.parts.flatMap((part) => {
      const pose = getSpatialPartPose({document, parameterValues, part, posedScene})
      return pose === undefined ? [] : [[part.id, pose] as const]
    }),
  )
  const spatialGroups = new Map<string, Array<(typeof states)[number]>>()
  for (const state of states) {
    const groupId = maskStructure.partById.get(state.partId)?.spatial?.groupId
    if (groupId !== undefined) {
      spatialGroups.set(groupId, [...(spatialGroups.get(groupId) ?? []), state])
    }
  }
  for (const group of spatialGroups.values()) {
    group.sort(
      (first, second) =>
        poseByPartId.get(first.partId)!.depth - poseByPartId.get(second.partId)!.depth,
    )
  }
  const sceneLayers = getSceneLayerStructure(document)
  const resolveSceneGroup = (group: PuppetSceneGroupNode) => {
    const composed = composeParameterGroupProperties({document, group, parameterValues})
    const opacity =
      overrides.groups.get(group.id)?.opacity ?? mixGroupOpacity(mix, group.id, composed.opacity)
    return Object.is(composed.opacity, opacity) ? composed : {...composed, opacity}
  }
  const resolvedGroups = new Map<PuppetSceneContainerNode, ResolvedGroupRenderProperties>()
  const resolveGroup = (group: PuppetSceneContainerNode) => {
    const cached = resolvedGroups.get(group)
    if (cached !== undefined) {
      return cached
    }
    const resolved =
      group.kind === 'group'
        ? resolveSceneGroup(group)
        : composeParameterDeformerProperties({deformer: group, document, parameterValues})
    resolvedGroups.set(group, resolved)
    return resolved
  }
  const inheritedByPartId = new Map(
    [...sceneLayers.groupsByPartId].map(([partId, groups]) => [
      partId,
      inheritFrameEffects(groups, resolveGroup, document.colorComposition),
    ]),
  )
  const layerIdsOf = (partId: string) => inheritedByPartId.get(partId)?.layerIds ?? []
  const overrideColors = (
    ancestors: ReadonlyArray<PuppetSceneContainerNode>,
    own: PuppetRenderOverride | undefined,
  ) =>
    overrides.groups.size === 0 &&
    own?.multiplyColor === undefined &&
    own?.screenColor === undefined
      ? {}
      : getOverrideColorProperties({
          ancestors,
          isOffscreen: (group) => resolveGroup(group).offscreen,
          overrides,
          own,
        })
  const orderedStates = gatherLayers(
    states.map((state) => {
      const groupId = maskStructure.partById.get(state.partId)?.spatial?.groupId
      return groupId === undefined ? state : (spatialGroups.get(groupId)?.shift() ?? state)
    }),
    (state) => layerIdsOf(state.partId),
  )

  const plans = orderedStates.flatMap((state): ReadonlyArray<PartRenderPlan> => {
    const part = maskStructure.partById.get(state.partId)
    if (part === undefined) {
      return []
    }

    const composed = composeParameterPartProperties({
      document,
      parameterValues,
      partId: state.partId,
    })
    const override = overrides.parts.get(state.partId)
    // Model opacity scales every part, as Cubism scales every drawable.
    const opacity = resolveFrameOpacity(state.partId, composed, adjustments)
    const inherited = inheritedByPartId.get(state.partId)
    const composedProperties = composeFrameProperties(
      composed,
      inherited?.effect ?? IDENTITY_COLOR_EFFECT,
      opacity,
      document.colorComposition,
    )
    const properties =
      overrides.parts.size === 0 && overrides.groups.size === 0
        ? composedProperties
        : {
            ...composedProperties,
            ...overrideColors(sceneLayers.groupsByPartId.get(state.partId) ?? [], override),
            ...(override?.culling === undefined ? {} : {culling: override.culling}),
          }
    const render = !maskStructure.maskPartIds.has(state.partId) || properties.renderWhenUsedAsMask
    return [
      {
        layerIds: inherited?.layerIds ?? [],
        mask: getPartMaskPlan(document, maskStructure, state.partId),
        partId: state.partId,
        properties,
        render,
        visible:
          state.visible &&
          render &&
          (part.spatial === undefined || poseByPartId.get(part.id)?.facing === true),
      },
    ]
  })
  const layers = new Map(
    sceneLayers.layers.map(({ancestors, group, visible}): [string, LayerRenderPlan] => {
      const inherited = inheritFrameEffects(ancestors, resolveGroup, document.colorComposition)
      const {offscreen: _offscreen, ...composed} = composeColorEffects(
        resolveGroup(group),
        inherited.effect,
        document.colorComposition,
      )
      const properties = {...composed, ...overrideColors(ancestors, overrides.groups.get(group.id))}
      return [
        group.id,
        {
          groupId: group.id,
          layerIds: inherited.layerIds,
          mask: maskStructure.layerMaskByGroupId.get(group.id),
          properties,
          visible:
            visible &&
            [group, ...ancestors].every((node) =>
              isParameterVisible(node, document, parameterValues),
            ),
        },
      ]
    }),
  )
  return {layers, plans, spatialPoses: poseByPartId}
}

export const getPartRenderPlans = (
  document: PuppetDocument,
  parameterValues?: PuppetParameterValueMap,
): ReadonlyArray<PartRenderPlan> => getPartRenderFrame(document, parameterValues).plans

const valuesEqual = (first: ReadonlyArray<number>, second: ReadonlyArray<number>) =>
  first.length === second.length && first.every((value, index) => value === second[index])

/**
 * 파트 리소스를 그대로 재사용할 수 있는지 판단한다. 마스크 메시는 생성 시점의 indices/uvs를
 * 복사하므로, 파트 마스크와 offscreen 그룹 마스크의 소스 파트는 메시 토폴로지가 같아야 한다.
 */
export const canReusePartResources = (document: PuppetDocument, nextDocument: PuppetDocument) => {
  const {maskPartIds} = getStaticMaskStructure(nextDocument)

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

const describeLayerResources = (document: PuppetDocument) =>
  getSceneLayerStructure(document)
    .layers.map(({group}) =>
      [group.id, ...getGroupRenderProperties(group).clippingMaskIds].join('\0'),
    )
    .join('\n')

/** Whether the offscreen groups and their mask sources are unchanged. */
export const canReuseLayerResources = (document: PuppetDocument, nextDocument: PuppetDocument) =>
  describeLayerResources(document) === describeLayerResources(nextDocument)
