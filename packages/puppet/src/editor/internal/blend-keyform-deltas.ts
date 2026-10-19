import {clamp} from 'es-toolkit/math'
import type {PuppetColor, PuppetParameterKeyform, PuppetPoint} from '../../player'

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

/** Adds two forms' displacement from the same reference, including render and connection properties. */
export const blendKeyformDeltas = (
  first: PuppetParameterKeyform,
  second: PuppetParameterKeyform,
  base: PuppetParameterKeyform,
): Pick<PuppetParameterKeyform, 'deformers' | 'parts'> => ({
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
      rotationOrigin: blendPoint(x.rotationOrigin, y.rotationOrigin, node.rotationOrigin),
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
          : {
              multiplyColor: constrainColor(
                blendTriple(
                  x.properties?.multiplyColor,
                  y.properties?.multiplyColor,
                  part.properties.multiplyColor,
                ),
              ),
              opacity: clamp(
                (x.properties?.opacity ?? part.properties.opacity ?? 1) +
                  (y.properties?.opacity ?? part.properties.opacity ?? 1) -
                  (part.properties.opacity ?? 1),
                0,
                1,
              ),
              screenColor: constrainColor(
                blendTriple(
                  x.properties?.screenColor,
                  y.properties?.screenColor,
                  part.properties.screenColor,
                ),
              ),
            },
      vertices: blendVector(x.vertices, y.vertices, part.vertices),
    }
  }),
})
