import type {TrackingParameter} from '../tracking/types'
import {translateLiteral} from '../localization/translate'
import type {InterfaceLanguage} from '../localization/types'
import catalog from './parameter-names.json'

const names = new Map(Object.entries(catalog))

export const parameterName = (
  parameter: Pick<TrackingParameter, 'id' | 'name'>,
  language: InterfaceLanguage,
): string => {
  const name = parameter.name || parameter.id
  return names.get(parameter.id) === name ? translateLiteral(language, name) : name
}
