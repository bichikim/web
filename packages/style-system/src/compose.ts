import {createParser} from './create-parser'

export const compose = (...parsers: any[]) => {
  const config = parsers.reduce((result, parser) => {
    if (parser && parser.config) {
      return Object.assign(result, parser.config)
    }
    return result
  }, {})

  return createParser(config)
}
