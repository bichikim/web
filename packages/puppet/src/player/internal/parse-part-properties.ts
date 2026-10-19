import {
  PUPPET_ALPHA_BLEND_MODES,
  PUPPET_MAXIMUM_DRAW_ORDER,
  PUPPET_PART_BLEND_MODES,
  type PuppetGroupRenderProperties,
  type PuppetPartRenderProperties,
} from '../document'
import {isFiniteNumber, isRecord} from './parse-primitives'

const COLOR_CHANNEL_COUNT = 3

/** Absent, or distinct non-empty IDs. */
export const hasValidTargetIds = (value: unknown) =>
  value === undefined ||
  (Array.isArray(value) &&
    value.every((partId) => typeof partId === 'string' && partId.length > 0) &&
    new Set(value).size === value.length)

const isUnitColor = (value: unknown) =>
  Array.isArray(value) &&
  value.length === COLOR_CHANNEL_COUNT &&
  value.every((channel) => isFiniteNumber(channel) && channel >= 0 && channel <= 1)

const hasBooleanFlags = (value: Record<string, unknown>, keys: ReadonlyArray<string>) =>
  keys.every((key) => value[key] === undefined || typeof value[key] === 'boolean')

export const isPartRenderProperties = (value: unknown): value is PuppetPartRenderProperties =>
  isRecord(value) &&
  (value.alphaBlendMode === undefined ||
    PUPPET_ALPHA_BLEND_MODES.some((alphaBlendMode) => alphaBlendMode === value.alphaBlendMode)) &&
  (value.blendMode === undefined ||
    PUPPET_PART_BLEND_MODES.some((blendMode) => blendMode === value.blendMode)) &&
  (value.clippingMaskIds === undefined || hasValidTargetIds(value.clippingMaskIds)) &&
  (value.drawOrder === undefined ||
    (isFiniteNumber(value.drawOrder) &&
      value.drawOrder >= 0 &&
      value.drawOrder <= PUPPET_MAXIMUM_DRAW_ORDER)) &&
  hasBooleanFlags(value, ['culling', 'invertedMask', 'renderWhenUsedAsMask']) &&
  (value.multiplyColor === undefined || isUnitColor(value.multiplyColor)) &&
  (value.opacity === undefined ||
    (isFiniteNumber(value.opacity) && value.opacity >= 0 && value.opacity <= 1)) &&
  (value.screenColor === undefined || isUnitColor(value.screenColor))

/**
 * Group properties whose mask sources are parts of the document. Blend modes and masks
 * composite an isolated layer, so they need `offscreen`.
 */
export const isGroupRenderProperties = (
  value: unknown,
  partIds: ReadonlySet<string>,
): value is PuppetGroupRenderProperties =>
  isRecord(value) &&
  (value.offscreen === undefined || typeof value.offscreen === 'boolean') &&
  (value.offscreen === true ||
    (value.alphaBlendMode === undefined &&
      value.blendMode === undefined &&
      value.clippingMaskIds === undefined &&
      value.invertedMask === undefined)) &&
  isPartRenderProperties({...value, offscreen: undefined}) &&
  value.renderWhenUsedAsMask === undefined &&
  value.culling === undefined &&
  (value.clippingMaskIds === undefined ||
    (value.clippingMaskIds as ReadonlyArray<string>).every((partId) => partIds.has(partId)))
