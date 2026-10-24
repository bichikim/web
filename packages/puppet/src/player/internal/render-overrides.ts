import type {PuppetColor} from '../document-render'
import type {PuppetSceneContainerNode} from '../document'

/**
 * Render values an app sets on a part or scene group while the model plays, replacing what the
 * document and motions give (Cubism's part opacity, multiply/screen color and culling
 * overrides). Omitted values are not overridden.
 */
export interface PuppetRenderOverride {
  /** Parts only. */
  readonly culling?: boolean
  readonly multiplyColor?: PuppetColor
  /** The node's own opacity; children and the model opacity still multiply it. */
  readonly opacity?: number
  readonly screenColor?: PuppetColor
}

export interface RenderOverrides {
  readonly groups: ReadonlyMap<string, PuppetRenderOverride>
  readonly parts: ReadonlyMap<string, PuppetRenderOverride>
}

/** Stores the normalized override of `id`, or removes it when it sets nothing. */
export const setRenderOverride = (
  overrides: Map<string, PuppetRenderOverride>,
  id: string,
  override: PuppetRenderOverride | undefined,
) => {
  const normalized = normalizeRenderOverride(override)
  if (normalized === undefined) {
    overrides.delete(id)
  } else {
    overrides.set(id, normalized)
  }
}

export const NO_RENDER_OVERRIDES: RenderOverrides = {groups: new Map(), parts: new Map()}

const unit = (value: number) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0)
const unitColor = (color: PuppetColor): PuppetColor => [
  unit(color[0]),
  unit(color[1]),
  unit(color[2]),
]

/** The override with opacity and colors limited to `0..1`; `undefined` when it sets nothing. */
export const normalizeRenderOverride = (
  override: PuppetRenderOverride | undefined,
): PuppetRenderOverride | undefined => {
  if (override === undefined) {
    return undefined
  }
  const normalized: PuppetRenderOverride = {
    ...(override.culling === undefined ? {} : {culling: override.culling}),
    ...(override.multiplyColor === undefined
      ? {}
      : {multiplyColor: unitColor(override.multiplyColor)}),
    ...(override.opacity === undefined ? {} : {opacity: unit(override.opacity)}),
    ...(override.screenColor === undefined ? {} : {screenColor: unitColor(override.screenColor)}),
  }
  return Object.keys(normalized).length === 0 ? undefined : normalized
}

type ColorKey = 'multiplyColor' | 'screenColor'

/**
 * The color an override sets on a part or offscreen layer: its own, else the nearest ancestor
 * group's, searching outward up to (not into) the nearest offscreen ancestor, whose override
 * applies to its layer instead (as Cubism applies a part's color to its drawables).
 */
export const getOverrideColor = (options: {
  /** Ancestors, outermost first. */
  readonly ancestors: ReadonlyArray<PuppetSceneContainerNode>
  readonly isOffscreen: (group: PuppetSceneContainerNode) => boolean
  readonly key: ColorKey
  readonly overrides: RenderOverrides
  readonly own?: PuppetRenderOverride
}): PuppetColor | undefined => {
  const own = options.own?.[options.key]
  if (own !== undefined) {
    return own
  }
  for (const group of options.ancestors.toReversed()) {
    if (options.isOffscreen(group)) {
      return undefined
    }
    const color = options.overrides.groups.get(group.id)?.[options.key]
    if (color !== undefined) {
      return color
    }
  }
  return undefined
}

/** The override colors of a part or layer below `ancestors`, as properties to spread. */
export const getOverrideColorProperties = (
  options: Omit<Parameters<typeof getOverrideColor>[0], 'key'>,
) => {
  const multiplyColor = getOverrideColor({...options, key: 'multiplyColor'})
  const screenColor = getOverrideColor({...options, key: 'screenColor'})
  return {
    ...(multiplyColor === undefined ? {} : {multiplyColor}),
    ...(screenColor === undefined ? {} : {screenColor}),
  }
}
