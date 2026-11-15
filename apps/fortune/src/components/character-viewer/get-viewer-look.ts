import type {PuppetLookParameter, PuppetParameter} from '@winter-love/puppet/player'

interface GetViewerLookOptions {
  /** Model tracking entries; omitted, no entries are created. */
  readonly look?: ReadonlyArray<PuppetLookParameter>
  /** Head limits; omitted or missing, existing tracking coefficients are retained. */
  readonly parameters?: ReadonlyArray<PuppetParameter>
}

export const getViewerLook = (options: GetViewerLookOptions): ReadonlyArray<PuppetLookParameter> =>
  (options.look ?? []).map((look) => {
    const parameter = options.parameters?.find((entry) => entry.id === look.parameterId)
    if (parameter === undefined) {
      return look
    }
    const range = Math.max(
      parameter.maximum - parameter.defaultValue,
      parameter.defaultValue - parameter.minimum,
    )
    switch (look.parameterId) {
      case 'ParamAngleX':
        return {...look, x: range, xy: 0, y: 0}
      case 'ParamAngleY':
        return {...look, x: 0, xy: 0, y: range}
      default:
        return look
    }
  })
