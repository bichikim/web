import type {Direction} from './direction'
import {createLine} from './line'

export interface MoveDeepPositionByElementOptions {
  /**
   * 1 칸 당 센싱 간격 px
   */
  sensorGap: number
}

export const moveDeepPositionByElement = (elementFrom: HTMLElement, direction: Direction) => {
  //
}

export const getElementLine = (
  elementFrom: HTMLElement,
  direction: Direction,
  range: number,
  includeOrigin: boolean = false,
) => {
  const elementRect = elementFrom.getBoundingClientRect()
  const line = createLine({x: elementRect.top, y: elementRect.left}, direction, range, includeOrigin)

  return line
}
