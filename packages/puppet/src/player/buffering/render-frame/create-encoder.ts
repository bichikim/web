/* eslint-disable no-magic-numbers -- Offsets describe the double-precision frame wire format. */
import {isEqual} from 'es-toolkit'
import type {PuppetColorEffect} from '../../../deformation/group-properties'
import type {PartRenderFrame} from '../../internal/render-plan'
import {
  LAYER_FRAME_VALUES,
  type LayerTemplate,
  type PackedRenderFrame,
  PART_FRAME_VALUES,
  type PartTemplate,
} from './types'

const sameStructure = (
  previous: PartTemplate | LayerTemplate,
  next: PartTemplate | LayerTemplate,
) => {
  const first = previous.properties
  const second = next.properties
  return (
    previous.layerIds.length === next.layerIds.length &&
    previous.layerIds.every((id, index) => id === next.layerIds[index]) &&
    isEqual(previous.mask, next.mask) &&
    first.alphaBlendMode === second.alphaBlendMode &&
    first.blendMode === second.blendMode &&
    first.invertedMask === second.invertedMask &&
    isEqual(first.clippingMaskIds, second.clippingMaskIds)
  )
}

const writeColors = (values: Float64Array, offset: number, effect: PuppetColorEffect) => {
  const {opacity, multiplyColor, screenColor} = effect
  values[offset] = opacity
  values[offset + 1] = multiplyColor[0]
  values[offset + 2] = multiplyColor[1]
  values[offset + 3] = multiplyColor[2]
  values[offset + 4] = screenColor[0]
  values[offset + 5] = screenColor[1]
  values[offset + 6] = screenColor[2]
}

/** Owns one Worker stream's structural templates; numeric packets retain double precision. */
export const createEncoder = (): ((frame: PartRenderFrame) => PackedRenderFrame) => {
  const parts = new Map<string, {index: number; value: PartTemplate}>()
  const layers = new Map<string, {index: number; value: LayerTemplate}>()
  return (frame) => {
    const partTemplates: Array<readonly [number, PartTemplate]> = []
    const layerTemplates: Array<readonly [number, LayerTemplate]> = []
    const partValues = new Float64Array(frame.plans.length * PART_FRAME_VALUES)
    const layerValues = new Float64Array(frame.layers.size * LAYER_FRAME_VALUES)
    frame.plans.forEach((plan, order) => {
      let entry = parts.get(plan.partId)
      if (
        entry === undefined ||
        !sameStructure(entry.value, plan) ||
        entry.value.properties.culling !== plan.properties.culling ||
        entry.value.properties.renderWhenUsedAsMask !== plan.properties.renderWhenUsedAsMask
      ) {
        const {
          opacity: _opacity,
          multiplyColor: _multiplyColor,
          screenColor: _screenColor,
          ...properties
        } = plan.properties
        entry = {
          index: entry?.index ?? parts.size,
          value: {layerIds: plan.layerIds, mask: plan.mask, partId: plan.partId, properties},
        }
        parts.set(plan.partId, entry)
        partTemplates.push([entry.index, entry.value])
      }
      const offset = order * PART_FRAME_VALUES
      partValues[offset] = entry.index
      partValues[offset + 1] = Number(plan.render)
      partValues[offset + 2] = Number(plan.visible)
      writeColors(partValues, offset + 3, plan.properties)
    })
    let order = 0
    for (const [groupId, plan] of frame.layers) {
      let entry = layers.get(groupId)
      if (entry === undefined || !sameStructure(entry.value, plan)) {
        const {
          opacity: _opacity,
          multiplyColor: _multiplyColor,
          screenColor: _screenColor,
          ...properties
        } = plan.properties
        entry = {
          index: entry?.index ?? layers.size,
          value: {groupId: plan.groupId, layerIds: plan.layerIds, mask: plan.mask, properties},
        }
        layers.set(groupId, entry)
        layerTemplates.push([entry.index, entry.value])
      }
      const offset = order * LAYER_FRAME_VALUES
      layerValues[offset] = entry.index
      layerValues[offset + 1] = Number(plan.visible)
      writeColors(layerValues, offset + 2, plan.properties)
      order += 1
    }
    return {
      layers: layerValues,
      layerTemplates,
      parts: partValues,
      partTemplates,
      spatialPoses: frame.spatialPoses,
    }
  }
}
