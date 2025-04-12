import {AbstractInfo, FocusPosition, PositionMap} from './types'
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

export const createPositionMap = <Info extends AbstractInfo>(): PositionMap<Info> => {
  return {
    members: new Set(),
    positions: new Map(),
  }
}
