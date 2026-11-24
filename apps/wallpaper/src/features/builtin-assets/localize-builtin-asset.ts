import type {PuppetAsset} from '@winter-love/wallpaper/settings/repository'
import {translateLiteral} from '../localization/translate'
import type {InterfaceLanguage} from '../localization/types'
import catalog from '../../../builtin-assets.json'

const names = new Map([...catalog.puppets, ...catalog.media].map(({id, name}) => [id, name]))

export const localizeBuiltinAsset = <Asset extends PuppetAsset>(
  asset: Asset,
  language: InterfaceLanguage,
): Asset => {
  const original = names.get(asset.id)
  if (original === undefined) {
    return asset
  }
  const name = translateLiteral(language, original)
  return name === asset.name ? asset : {...asset, name}
}
