import {clamp} from 'es-toolkit/math'
import {
  PUPPET_DEFAULT_DRAW_ORDER,
  PUPPET_MAXIMUM_DRAW_ORDER,
  type PuppetColor,
  type PuppetParameterKeyform,
  type PuppetPoint,
} from '../../player'

const blendVector = (
  first: readonly number[],
  second: readonly number[],
  base: readonly number[],
) => base.map((value, index) => (first[index] ?? value) + (second[index] ?? value) - value)
const blendTriple = (
  first?: PuppetColor,
  second?: PuppetColor,
  base?: PuppetColor,
): PuppetColor | undefined =>
  base === undefined
    ? undefined
    : [
        (first?.[0] ?? base[0]) + (second?.[0] ?? base[0]) - base[0],
        (first?.[1] ?? base[1]) + (second?.[1] ?? base[1]) - base[1],
        (first?.[2] ?? base[2]) + (second?.[2] ?? base[2]) - base[2],
      ]
const constrainColor = (color?: PuppetColor): PuppetColor | undefined =>
  color === undefined
    ? undefined
    : [clamp(color[0], 0, 1), clamp(color[1], 0, 1), clamp(color[2], 0, 1)]
const blendPoint = (
  first?: PuppetPoint,
  second?: PuppetPoint,
  base?: PuppetPoint,
): PuppetPoint | undefined =>
  base === undefined
    ? undefined
    : {
        x: (first?.x ?? base.x) + (second?.x ?? base.x) - base.x,
        y: (first?.y ?? base.y) + (second?.y ?? base.y) - base.y,
      }

// Keyforms require a positive scale.
const MINIMUM_SCALE = 0.01
const blendScale = (first?: number, second?: number, base?: number) =>
  base === undefined
    ? undefined
    : Math.max(MINIMUM_SCALE, (first ?? base) + (second ?? base) - base)

/** Opacity and colors keyed on a part, group or deformer keyform. */
interface RenderProperties {
  readonly drawOrder?: number
  readonly multiplyColor?: PuppetColor
  readonly opacity?: number
  readonly screenColor?: PuppetColor
}

/** 그리기 순서의 기준값에서 벗어난 차이를 합성한다. */
const blendDrawOrder = (first?: number, second?: number, base?: number) =>
  first === undefined && second === undefined && base === undefined
    ? undefined
    : clamp(
        (first ?? base ?? PUPPET_DEFAULT_DRAW_ORDER) +
          (second ?? base ?? PUPPET_DEFAULT_DRAW_ORDER) -
          (base ?? PUPPET_DEFAULT_DRAW_ORDER),
        0,
        PUPPET_MAXIMUM_DRAW_ORDER,
      )

/** Composes both displacements from `base`, keeping opacity and colors within 0..1. */
const blendRenderProperties = (
  first: RenderProperties | undefined,
  second: RenderProperties | undefined,
  base: RenderProperties,
) => ({
  drawOrder: blendDrawOrder(first?.drawOrder, second?.drawOrder, base.drawOrder),
  multiplyColor: constrainColor(
    blendTriple(first?.multiplyColor, second?.multiplyColor, base.multiplyColor),
  ),
  opacity: clamp(
    (first?.opacity ?? base.opacity ?? 1) +
      (second?.opacity ?? base.opacity ?? 1) -
      (base.opacity ?? 1),
    0,
    1,
  ),
  screenColor: constrainColor(
    blendTriple(first?.screenColor, second?.screenColor, base.screenColor),
  ),
})

/**
 * Adds two forms' displacement from the same reference, including part, group and deformer render
 * properties and connection properties. Entries missing from `base` are dropped.
 */
export const blendKeyformDeltas = (
  first: PuppetParameterKeyform,
  second: PuppetParameterKeyform,
  base: PuppetParameterKeyform,
): Pick<PuppetParameterKeyform, 'deformers' | 'groups' | 'parts'> => ({
  deformers: base.deformers?.map((node) => {
    const x = first.deformers?.find((entry) => entry.nodeId === node.nodeId) ?? node
    const y = second.deformers?.find((entry) => entry.nodeId === node.nodeId) ?? node
    return {
      ...node,
      controlPoints: blendVector(x.controlPoints, y.controlPoints, node.controlPoints),
      curveHandles: node.curveHandles?.map((handle) => {
        const horizontal =
          x.curveHandles?.find((entry) => entry.pointIndex === handle.pointIndex) ?? handle
        const vertical =
          y.curveHandles?.find((entry) => entry.pointIndex === handle.pointIndex) ?? handle
        return {
          ...handle,
          horizontal: blendPoint(horizontal.horizontal, vertical.horizontal, handle.horizontal)!,
          vertical: blendPoint(horizontal.vertical, vertical.vertical, handle.vertical)!,
        }
      }),
      properties:
        node.properties === undefined
          ? undefined
          : blendRenderProperties(x.properties, y.properties, node.properties),
      rotationOrigin: blendPoint(x.rotationOrigin, y.rotationOrigin, node.rotationOrigin),
      rotationScale: blendScale(x.rotationScale, y.rotationScale, node.rotationScale),
      spatialMeshPosition: blendTriple(
        x.spatialMeshPosition,
        y.spatialMeshPosition,
        node.spatialMeshPosition,
      ),
      spatialOrigin: blendTriple(x.spatialOrigin, y.spatialOrigin, node.spatialOrigin),
      spatialRotation: blendTriple(x.spatialRotation, y.spatialRotation, node.spatialRotation),
      spatialScale: blendTriple(x.spatialScale, y.spatialScale, node.spatialScale),
      spatialTranslation: blendTriple(
        x.spatialTranslation,
        y.spatialTranslation,
        node.spatialTranslation,
      ),
    }
  }),
  groups: base.groups?.map((group) => ({
    ...group,
    properties: blendRenderProperties(
      first.groups?.find((entry) => entry.groupId === group.groupId)?.properties,
      second.groups?.find((entry) => entry.groupId === group.groupId)?.properties,
      group.properties,
    ),
  })),
  parts: base.parts.map((part) => {
    const x = first.parts.find((entry) => entry.partId === part.partId) ?? part
    const y = second.parts.find((entry) => entry.partId === part.partId) ?? part
    return {
      ...part,
      glue: part.glue?.map((glue) => {
        const horizontal = x.glue?.find((entry) => entry.id === glue.id) ?? glue
        const vertical = y.glue?.find((entry) => entry.id === glue.id) ?? glue
        return {
          ...glue,
          strength: clamp(horizontal.strength + vertical.strength - glue.strength, 0, 1),
          weight: clamp(horizontal.weight + vertical.weight - glue.weight, 0, 1),
        }
      }),
      properties:
        part.properties === undefined
          ? undefined
          : blendRenderProperties(x.properties, y.properties, part.properties),
      vertices: blendVector(x.vertices, y.vertices, part.vertices),
    }
  }),
})
