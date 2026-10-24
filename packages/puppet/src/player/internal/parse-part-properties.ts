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

const isUnitColor = (value: unknown, unbounded: boolean) =>
  Array.isArray(value) &&
  value.length === COLOR_CHANNEL_COUNT &&
  value.every((channel) => isFiniteNumber(channel) && (unbounded || (channel >= 0 && channel <= 1)))

const hasBooleanFlags = (value: Record<string, unknown>, keys: ReadonlyArray<string>) =>
  keys.every((key) => value[key] === undefined || typeof value[key] === 'boolean')

const isOptionalRange = (value: unknown, maximum: number, unbounded: boolean) =>
  value === undefined || (isFiniteNumber(value) && (unbounded || (value >= 0 && value <= maximum)))

export const isPartRenderProperties = (
  value: unknown,
  unbounded = false,
): value is PuppetPartRenderProperties =>
  isRecord(value) &&
  (value.alphaBlendMode === undefined ||
    PUPPET_ALPHA_BLEND_MODES.some((alphaBlendMode) => alphaBlendMode === value.alphaBlendMode)) &&
  (value.blendMode === undefined ||
    PUPPET_PART_BLEND_MODES.some((blendMode) => blendMode === value.blendMode)) &&
  (value.clippingMaskIds === undefined || hasValidTargetIds(value.clippingMaskIds)) &&
  isOptionalRange(value.drawOrder, PUPPET_MAXIMUM_DRAW_ORDER, unbounded) &&
  hasBooleanFlags(value, ['culling', 'invertedMask', 'renderWhenUsedAsMask']) &&
  (value.multiplyColor === undefined || isUnitColor(value.multiplyColor, unbounded)) &&
  isOptionalRange(value.opacity, 1, unbounded) &&
  (value.screenColor === undefined || isUnitColor(value.screenColor, unbounded))

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
