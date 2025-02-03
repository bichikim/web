import {Position} from '@winter-love/utils'

export type DragState = 'start' | 'move' | 'end'
export interface DragPayload {
  point: Position | undefined
  state?: DragState
}
export interface InfoIds {
  ids: Set<string>
  point: Position | undefined
}

export interface DragInfoIds extends InfoIds {
  state: 'move' | 'start' | 'end'
}

export interface UseGlobalTouchEmitterOptions {
  // prevent browser touch default action
  preventTouchContext?: boolean
  // Apply only the top-level element
  topLevelElementOnly?: boolean
}

export interface DownEventPayload {
  channelName?: string | number
  down: boolean
  renderOnly: boolean
}
