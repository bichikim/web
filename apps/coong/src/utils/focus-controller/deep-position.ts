import {type Direction, type DirectionName, getDirection} from './direction'
import {safeToNumber} from './safe-to-number'

export interface Position {
  x: number
  y: number
}

export const DEFAULT_ID = '?'
export const DEFAULT_SEPARATOR = ','
export const DEFAULT_CONNECTOR = '|'
export const ID_SEPARATOR = '::'

export interface KeyOptions {
  connector?: string
  separator?: string
}

export interface KeyDeepPositionOptions extends KeyOptions {
  id?: string
}

export const DEFAULT_KEY_OPTIONS: Required<KeyOptions> = {
  connector: DEFAULT_CONNECTOR,
  separator: DEFAULT_SEPARATOR,
}

export const DEFAULT_KEY_DEEP_POSITION_OPTIONS: Required<KeyDeepPositionOptions> = {
  id: DEFAULT_ID,
  ...DEFAULT_KEY_OPTIONS,
}

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

const splitIDKey = (idKey: string) => {
  const [key, id] = idKey.split(ID_SEPARATOR)

  return {id, key}
}

const joinIDKey = (id: string, key: string) => {
  return `${key}${ID_SEPARATOR}${id}`
}

export const getDeepPositionKey = (
  deepPosition: DeepPosition,
  options: KeyDeepPositionOptions = DEFAULT_KEY_OPTIONS,
) => {
  const {connector = DEFAULT_CONNECTOR, id = DEFAULT_ID, separator = DEFAULT_SEPARATOR} = options

  let key: string = ''

  // Concatenate the positions with the separator and connector
  for (const position of deepPosition) {
    key += `${position.x}${separator}${position.y}${connector}`
  }

  // Remove the last connector
  return joinIDKey(id, key.slice(0, -connector.length))
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
  options: KeyDeepPositionOptions = DEFAULT_KEY_OPTIONS,
): DeepPosition | null => {
  const {separator = DEFAULT_SEPARATOR, connector = DEFAULT_CONNECTOR} = options

  if (separator === '-') {
    // - is a special character in the key, so we need to return null
    return null
  }

  const {key: _key} = splitIDKey(key)

  if (_key === '') {
    return []
  }

  const positions: Position[] = []
  const posStringArray = _key.split(connector)

  for (const posString of posStringArray) {
    const [xString, yString] = posString.split(separator)
    const x = safeToNumber(xString)
    const y = safeToNumber(yString)

    if (x === null || y === null) {
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
