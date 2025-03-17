import {FocusPosition} from './types'
import {stringifyPoint} from './stringify-focus-position'

export const genDepthKeys = (focusPosition: FocusPosition) => {
  const result: string[] = []
  let previousKey = ''

  for (const point of focusPosition) {
    const currentKey = stringifyPoint(point)

    result.push(`${previousKey}${currentKey}`)
    previousKey += `${currentKey}|`
  }

  return result
}
