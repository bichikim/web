import {type Direction, getDirection, type DirectionName} from './direction'
import {safeToNumber} from './safe-to-number'

export interface Position {
  x: number
  y: number
}

export const DEFAULT_SEPARATOR = ','
export const DEFAULT_CONNECTOR = '|'

export type DeepPosition = Position[]

export const getNextPositionByDirectionName = (position: Position, directionName: DirectionName) => {
  return getNextPosition(position, getDirection(directionName))
}

export const getNextPosition = (position: Position, direction: Direction) => {
  return {
    x: position.x + direction.x,
    y: position.y + direction.y,
  }
}

export const getDeepPositionKey = (
  deepPosition: DeepPosition,
  separator: string = DEFAULT_SEPARATOR,
  connector: string = DEFAULT_CONNECTOR,
) => {
  let key: string = ''

  // Concatenate the positions with the separator and connector
  for (const position of deepPosition) {
    key += `${position.x}${separator}${position.y}${connector}`
  }

  // Remove the last connector
  return key.slice(0, -connector.length)
}

/**
 *
 * @param key - The string key to parse.
 * @param separator - Separator between x and y (default: ',') Do not use '-' as separator because it can be confused with minus value.
 * @param connector - Connector between positions (default: '|').
 * @returns DeepPosition array parsed from the key.
 */
export const getDeepPosition = (
  key: string,
  separator: string = DEFAULT_SEPARATOR,
  connector: string = DEFAULT_CONNECTOR,
): DeepPosition | null => {
  if (separator === '-') {
    // - is a special character in the key, so we need to return null
    return null
  }

  if (key === '') return []

  const positions: Position[] = []
  const posStrArr = key.split(connector)

  for (const posStr of posStrArr) {
    const [xStr, yStr] = posStr.split(separator)
    const x = safeToNumber(xStr)
    const y = safeToNumber(yStr)

    if (x == null || y == null) {
      return null
    }

    positions.push({x, y})
  }

  return positions
}

export const getParentPosition = (deepPosition: DeepPosition, deepIndex: number) => {
  if (deepIndex <= 0) {
    return []
  }

  const parentPosition = [...deepPosition]

  parentPosition.splice(deepIndex, parentPosition.length)

  return parentPosition
}
