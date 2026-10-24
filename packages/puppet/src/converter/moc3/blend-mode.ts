/* eslint-disable no-magic-numbers -- Fixed Cubism binary flag fields. */
/* eslint-disable no-bitwise -- Cubism packs color and alpha modes into separate bytes. */
import type {PuppetPartRenderProperties} from '../../player/document'

const COLOR_MODES = [
  'normal',
  'add-compatible',
  'multiply-compatible',
  'linear-dodge',
  'add-glow',
  'darken',
  'multiply-over',
  'color-burn',
  'linear-burn',
  'lighten',
  'screen',
  'color-dodge',
  'overlay',
  'soft-light',
  'hard-light',
  'linear-light',
  'hue',
  'color',
] as const
const ALPHA_MODES = ['over', 'atop', 'out', 'conjoint-over', 'disjoint-over'] as const

/** Maps the packed Cubism 5.3 color/alpha composition descriptor to Poffo modes. */
export const readBlendMode = (
  value: number,
): Pick<PuppetPartRenderProperties, 'blendMode' | 'alphaBlendMode'> => {
  const blendMode = COLOR_MODES[value & 0xff]
  const alphaBlendMode = ALPHA_MODES[(value >> 8) & 0xff]
  if (blendMode === undefined || alphaBlendMode === undefined || value < 0 || value > 0xffff) {
    throw new Error(`Unsupported MOC3 blend mode: ${value}`)
  }
  return {alphaBlendMode, blendMode}
}
