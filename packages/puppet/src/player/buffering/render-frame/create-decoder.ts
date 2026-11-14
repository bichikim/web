/* eslint-disable no-magic-numbers -- Offsets describe the double-precision frame wire format. */
import type {PartRenderFrame, PartRenderPlan} from '../../internal/render-plan'
import {
  LAYER_FRAME_VALUES,
  type LayerTemplate,
  type PackedRenderFrame,
  PART_FRAME_VALUES,
  type PartTemplate,
} from './types'

const readColors = <Properties extends object>(
  values: Float64Array,
  offset: number,
  properties: Properties,
) => ({
  ...properties,
  multiplyColor: [values[offset + 1]!, values[offset + 2]!, values[offset + 3]!] as const,
  opacity: values[offset]!,
  screenColor: [values[offset + 4]!, values[offset + 5]!, values[offset + 6]!] as const,
})

interface PartColors {
  readonly values: ReadonlyArray<number>
  readonly properties: PartRenderPlan['properties']
}

/**
 * Snapshots queued values now; display objects are materialized once on demand.
 * Equal colors share immutable properties, retaining only the latest sample per template.
 */
export const createDecoder = (): ((packet: PackedRenderFrame) => PartRenderFrame) => {
  const parts: PartTemplate[] = []
  const layers: LayerTemplate[] = []
  const colors = new WeakMap<PartTemplate, PartColors>()
  const readPartColors = (values: Float64Array, offset: number, template: PartTemplate) => {
    const previous = colors.get(template)
    if (
      previous !== undefined &&
      previous.values.every((value, index) => Object.is(value, values[offset + index]))
    ) {
      return previous.properties
    }
    const properties = readColors(values, offset, template.properties)
    colors.set(template, {properties, values: Array.from(values.subarray(offset, offset + 7))})
    return properties
  }
  return (packet) => {
    packet.partTemplates.forEach(([index, value]) => {
      parts[index] = value
    })
    packet.layerTemplates.forEach(([index, value]) => {
      layers[index] = value
    })
    const partValues = packet.parts.slice()
    const layerValues = packet.layers.slice()
    const partTemplates = Array.from(
      {length: partValues.length / PART_FRAME_VALUES},
      (_, order) => {
        const template = parts[partValues[order * PART_FRAME_VALUES]!]
        if (template === undefined) {
          throw new Error('Missing playback part template')
        }
        return template
      },
    )
    const layerTemplates = Array.from(
      {length: layerValues.length / LAYER_FRAME_VALUES},
      (_, order) => {
        const template = layers[layerValues[order * LAYER_FRAME_VALUES]!]
        if (template === undefined) {
          throw new Error('Missing playback layer template')
        }
        return template
      },
    )
    let plans: PartRenderFrame['plans'] | undefined
    let restored: PartRenderFrame['layers'] | undefined
    return {
      get layers() {
        restored ??= new Map(
          layerTemplates.map((template, order) => {
            const offset = order * LAYER_FRAME_VALUES
            return [
              template.groupId,
              {
                groupId: template.groupId,
                layerIds: template.layerIds,
                mask: template.mask,
                properties: readColors(layerValues, offset + 2, template.properties),
                visible: layerValues[offset + 1] === 1,
              },
            ] as const
          }),
        )
        return restored
      },
      get plans() {
        plans ??= partTemplates.map((template, order) => {
          const offset = order * PART_FRAME_VALUES
          return {
            layerIds: template.layerIds,
            mask: template.mask,
            partId: template.partId,
            properties: readPartColors(partValues, offset + 3, template),
            render: partValues[offset + 1] === 1,
            visible: partValues[offset + 2] === 1,
          }
        })
        return plans
      },
      spatialPoses: packet.spatialPoses,
    }
  }
}
