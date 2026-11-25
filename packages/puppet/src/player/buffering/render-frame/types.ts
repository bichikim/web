import type {PuppetColorEffect} from '../../../deformation/group-properties'
import type {LayerRenderPlan, PartRenderFrame, PartRenderPlan} from '../../internal/render-plan'

export const PART_FRAME_VALUES = 10
export const PART_FRAME_FIELD = {
  multiplyBlue: 6,
  multiplyGreen: 5,
  multiplyRed: 4,
  opacity: 3,
  part: 0,
  render: 1,
  screenBlue: 9,
  screenGreen: 8,
  screenRed: 7,
  visible: 2,
} as const
export const LAYER_FRAME_VALUES = 9

export interface PartTemplate extends Omit<PartRenderPlan, 'properties' | 'render' | 'visible'> {
  readonly properties: Omit<PartRenderPlan['properties'], keyof PuppetColorEffect>
}
export interface LayerTemplate extends Omit<LayerRenderPlan, 'properties' | 'visible'> {
  readonly properties: Omit<LayerRenderPlan['properties'], keyof PuppetColorEffect>
}
/**
 * Ordered stream packet. Apply template replacements before its numeric values, including frames
 * the scheduler will discard. Decoded frames borrow immutable structure, never mutable colors.
 */
export interface PackedRenderFrame {
  readonly partTemplates: ReadonlyArray<readonly [number, PartTemplate]>
  readonly layerTemplates: ReadonlyArray<readonly [number, LayerTemplate]>
  readonly parts: Float64Array
  readonly layers: Float64Array
  readonly spatialPoses: PartRenderFrame['spatialPoses']
}
