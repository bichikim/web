/* eslint-disable no-magic-numbers -- Offsets describe the double-precision frame wire format. */
import type {PartRenderFrame, PartRenderPlan} from '../../internal/render-plan'
import {
  LAYER_FRAME_VALUES,
  type LayerTemplate,
  type PackedRenderFrame,
  PART_FRAME_FIELD,
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

interface PackedParts {
  readonly templates: ReadonlyArray<PartTemplate>
  readonly values: Float64Array
}

const packedParts = new WeakMap<PartRenderFrame, PackedParts>()

/** Gets the ordered numeric rows and template snapshots owned by a decoded frame. */
export const getPackedParts = (frame: PartRenderFrame): PackedParts | undefined =>
  packedParts.get(frame)

/**
 * Snapshots borrowed values or retains exclusively transferred arrays; display objects are lazy.
 * Equal colors share immutable properties, retaining only the latest sample per template.
 */
export const createDecoder = (
  ownership: 'borrowed' | 'transferred' = 'borrowed',
): ((packet: PackedRenderFrame) => PartRenderFrame) => {
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
    const partValues = ownership === 'transferred' ? packet.parts : packet.parts.slice()
    const layerValues = ownership === 'transferred' ? packet.layers : packet.layers.slice()
    const partTemplates = Array.from(
      {length: partValues.length / PART_FRAME_VALUES},
      (_, order) => {
        const template = parts[partValues[order * PART_FRAME_VALUES + PART_FRAME_FIELD.part]!]
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
    const frame: PartRenderFrame = {
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
            properties: readPartColors(partValues, offset + PART_FRAME_FIELD.opacity, template),
            render: partValues[offset + PART_FRAME_FIELD.render] === 1,
            visible: partValues[offset + PART_FRAME_FIELD.visible] === 1,
          }
        })
        return plans
      },
      spatialPoses: packet.spatialPoses,
    }
    packedParts.set(frame, {templates: partTemplates, values: partValues})
    return frame
  }
}
