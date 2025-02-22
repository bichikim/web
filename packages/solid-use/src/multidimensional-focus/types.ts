export interface Point {
  x: number
  y: number
}

export type FocusPosition = Point[]

export type AbstractInfo = Partial<Record<any, any>>

export interface PositionMap<Info extends Record<any, any>> {
  members: Set<string>
  positions: Map<string, Info>
}
