import {getPackedParts} from '../../buffering/render-frame/create-decoder'
import {
  PART_FRAME_FIELD,
  PART_FRAME_VALUES,
  type PartTemplate,
} from '../../buffering/render-frame/types'
import type {PartRenderFrame} from '../../internal/render-plan'

const CHANNELS = 13
const FIELD = {
  culling: 11,
  invertedMask: 10,
  multiplyBlue: 6,
  multiplyCompatible: 12,
  multiplyGreen: 5,
  multiplyRed: 4,
  opacity: 3,
  part: 0,
  render: 2,
  screenBlue: 9,
  screenGreen: 8,
  screenRed: 7,
  visible: 1,
} as const

const partNumber = (parts: ReadonlyMap<string, number>, partId: string) => {
  const part = parts.get(partId)
  if (part === undefined) {
    throw new Error(`Unknown GPU part ${partId}`)
  }
  return part
}

const packNumericDisplay = (
  templates: ReadonlyArray<PartTemplate>,
  source: Float64Array,
  parts: ReadonlyMap<string, number>,
): Float32Array => {
  const values = new Float32Array(templates.length * CHANNELS)
  templates.forEach(({partId, properties}, index) => {
    const input = index * PART_FRAME_VALUES
    const offset = index * CHANNELS
    values[offset + FIELD.part] = partNumber(parts, partId)
    values[offset + FIELD.visible] = Number(source[input + PART_FRAME_FIELD.visible] === 1)
    values[offset + FIELD.render] = Number(source[input + PART_FRAME_FIELD.render] === 1)
    values[offset + FIELD.opacity] = source[input + PART_FRAME_FIELD.opacity]!
    values[offset + FIELD.multiplyRed] = source[input + PART_FRAME_FIELD.multiplyRed]!
    values[offset + FIELD.multiplyGreen] = source[input + PART_FRAME_FIELD.multiplyGreen]!
    values[offset + FIELD.multiplyBlue] = source[input + PART_FRAME_FIELD.multiplyBlue]!
    values[offset + FIELD.screenRed] = source[input + PART_FRAME_FIELD.screenRed]!
    values[offset + FIELD.screenGreen] = source[input + PART_FRAME_FIELD.screenGreen]!
    values[offset + FIELD.screenBlue] = source[input + PART_FRAME_FIELD.screenBlue]!
    values[offset + FIELD.invertedMask] = Number(properties.invertedMask)
    values[offset + FIELD.culling] = Number(properties.culling)
    values[offset + FIELD.multiplyCompatible] = Number(
      properties.blendMode === 'multiply-compatible',
    )
  })
  return values
}

/** Packs the current paint order and uniforms without rounding authored geometry. */
export const packDisplay = (
  frame: PartRenderFrame,
  parts: ReadonlyMap<string, number>,
): Float32Array => {
  const packed = getPackedParts(frame)
  if (packed !== undefined) {
    return packNumericDisplay(packed.templates, packed.values, parts)
  }
  const {plans} = frame
  const values = new Float32Array(plans.length * CHANNELS)
  plans.forEach((plan, index) => {
    const {blendMode, culling, invertedMask, multiplyColor, opacity, screenColor} = plan.properties
    const [multiplyRed, multiplyGreen, multiplyBlue] = multiplyColor
    const [screenRed, screenGreen, screenBlue] = screenColor
    const offset = index * CHANNELS
    values[offset + FIELD.part] = partNumber(parts, plan.partId)
    values[offset + FIELD.visible] = Number(plan.visible)
    values[offset + FIELD.render] = Number(plan.render)
    values[offset + FIELD.opacity] = opacity
    values[offset + FIELD.multiplyRed] = multiplyRed
    values[offset + FIELD.multiplyGreen] = multiplyGreen
    values[offset + FIELD.multiplyBlue] = multiplyBlue
    values[offset + FIELD.screenRed] = screenRed
    values[offset + FIELD.screenGreen] = screenGreen
    values[offset + FIELD.screenBlue] = screenBlue
    values[offset + FIELD.invertedMask] = Number(invertedMask)
    values[offset + FIELD.culling] = Number(culling)
    values[offset + FIELD.multiplyCompatible] = Number(blendMode === 'multiply-compatible')
  })
  return values
}
