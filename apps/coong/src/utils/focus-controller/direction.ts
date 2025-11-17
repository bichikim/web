import {type Position} from './deep-position'

export type DirectionName = 'down' | 'left' | 'right' | 'up'
export type Direction = Position

export const directionNameMap = Object.freeze({
  down: {x: 0, y: 1},
  left: {x: -1, y: 0},
  right: {x: 1, y: 0},
  up: {x: 0, y: -1},
})

export const getDirection = (directionName: DirectionName): Direction => {
  return directionNameMap[directionName] ?? {x: 0, y: 0}
}
