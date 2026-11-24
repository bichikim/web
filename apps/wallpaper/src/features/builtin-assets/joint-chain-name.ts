import type {TouchJointChain} from '@winter-love/wallpaper/settings/touch'
import {translate, translateLiteral} from '../localization/translate'
import type {InterfaceLanguage} from '../localization/types'
import ash from '../connection-profiles/ash.json'

const names = new Map(ash.connections.touch.chains.map(({id, name}) => [id, name]))

export const jointChainName = (
  chain: Pick<TouchJointChain, 'id' | 'name'>,
  language: InterfaceLanguage,
): string => {
  const index = /^legacy-(?<index>\d+)$/u.exec(chain.id)?.groups?.index
  if (index !== undefined && chain.name === `연결 ${index}`) {
    return translate(language, '연결 {value0}', {value0: index})
  }
  const original = names.get(chain.id)
  return original !== undefined && chain.name === original
    ? translateLiteral(language, original)
    : chain.name
}
