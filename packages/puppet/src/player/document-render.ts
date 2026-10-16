/** Render properties of parts, groups and deformers: blending, masks, opacity, colors, draw order. */

/**
 * `normal`, `add`, `multiply` and `screen` keep the PixiJS fixed-function blending. The other
 * modes, and any mode with a non-`over` alpha blend, use the W3C Compositing and Blending
 * formulas against the pixels already drawn, one part at a time. `linear-dodge` is Cubism's
 * Add; `add-glow` is Cubism's Add (Glow), the same sum without limiting it to 1, which shows
 * where the part or its backdrop is translucent. Cubism publishes no formula for Add (Glow),
 * so this reading is unverified.
 */
export const PUPPET_PART_BLEND_MODES = [
  'normal',
  'add',
  'multiply',
  'screen',
  'darken',
  'lighten',
  'color-burn',
  'linear-burn',
  'color-dodge',
  'linear-dodge',
  'overlay',
  'soft-light',
  'hard-light',
  'linear-light',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
  'add-glow',
] as const

/**
 * Porter-Duff style alpha compositing with the overlap models of
 * `KHR_blend_equation_advanced`: `over`, `atop` and `out` assume uncorrelated coverage;
 * `conjoint-over` and `disjoint-over` assume maximally and minimally overlapping coverage.
 * As in Cubism, `out` erases the backdrop by the part's alpha (destination-out), so a fully
 * transparent part never changes its backdrop in any mode.
 */
export const PUPPET_ALPHA_BLEND_MODES = [
  'over',
  'atop',
  'out',
  'conjoint-over',
  'disjoint-over',
] as const

export type PuppetPartBlendMode = (typeof PUPPET_PART_BLEND_MODES)[number]
export type PuppetAlphaBlendMode = (typeof PUPPET_ALPHA_BLEND_MODES)[number]
export type PuppetColor = readonly [number, number, number]

export interface PuppetPartRenderProperties {
  readonly alphaBlendMode?: PuppetAlphaBlendMode
  readonly blendMode?: PuppetPartBlendMode
  readonly clippingMaskIds?: ReadonlyArray<string>
  /**
   * Hides triangles that deformation has turned over relative to the rest mesh (Cubism's
   * culling); off, both sides are drawn.
   */
  readonly culling?: boolean
  /**
   * Cubism's draw order, 0..1000 (default 500): higher draws in front of the parts and draw
   * order groups it is sorted with; equal values keep scene order. Keyable.
   */
  readonly drawOrder?: number
  readonly invertedMask?: boolean
  readonly multiplyColor?: PuppetColor
  readonly opacity?: number
  readonly renderWhenUsedAsMask?: boolean
  readonly screenColor?: PuppetColor
}

/**
 * Rest render properties of a scene group. Without `offscreen`, `opacity`, `multiplyColor` and
 * `screenColor` apply to every descendant as if each part had them after its own (the colors as
 * a second color effect). With `offscreen`, the descendants are drawn into an isolated,
 * transparent layer instead, and these properties, the blend modes and the clipping mask apply
 * once when that layer is drawn over the pixels behind it, as Cubism's offscreen drawing does.
 * The descendants of an offscreen group always paint together, at the position of the first one
 * in paint order.
 */
/** Draw order range end and the value of parts and draw order groups that omit it. */
export const PUPPET_MAXIMUM_DRAW_ORDER = 1000
export const PUPPET_DEFAULT_DRAW_ORDER = 500

export interface PuppetGroupRenderProperties {
  readonly alphaBlendMode?: PuppetAlphaBlendMode
  readonly blendMode?: PuppetPartBlendMode
  readonly clippingMaskIds?: ReadonlyArray<string>
  /**
   * Makes the group a draw order group (Cubism's grouped part): its descendants sort among
   * themselves and paint together at this draw order (0..1000). Offscreen groups are draw
   * order groups at 500 when omitted; other groups without it pass their descendants' draw
   * orders through. Keyable.
   */
  readonly drawOrder?: number
  readonly invertedMask?: boolean
  readonly multiplyColor?: PuppetColor
  readonly offscreen?: boolean
  readonly opacity?: number
  readonly screenColor?: PuppetColor
}

/**
 * Opacity and colors of a deformer (Cubism's warp and rotation deformer opacity and multiply and
 * screen colors), applied to every descendant after its own, as a plain group's are. Keyable.
 */
export type PuppetDeformerRenderProperties = Pick<
  PuppetGroupRenderProperties,
  'multiplyColor' | 'opacity' | 'screenColor'
>
