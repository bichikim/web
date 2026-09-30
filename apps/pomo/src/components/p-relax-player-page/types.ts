export type RelaxWeather = 'sunny' | 'rainy'
export type RelaxDepthInput = 'drag' | 'gyroscope'
export type RelaxDepthStatus =
  | 'ready'
  | 'requesting'
  | 'waiting'
  | 'active'
  | 'denied'
  | 'unavailable'

export interface RelaxDepthOffset {
  readonly x: number
  readonly y: number
}
