import type {CompositionPart, NumericField} from './types'
import composition from './composition.json'

export const createComposition = (): CompositionPart[] =>
  composition.parts.map((part) => ({...part}))

export interface CompositionField {
  key: NumericField
  label: string
  max: number
  min: number
  step: number
}

export const COMPOSITION_FIELDS: readonly CompositionField[] = [
  {key: 'x', label: '가로 위치 (%)', max: 300, min: -300, step: 0.1},
  {key: 'y', label: '세로 위치 (%)', max: 300, min: -300, step: 0.1},
  {key: 'scaleX', label: '가로 크기 (%)', max: 400, min: 1, step: 0.1},
  {key: 'scaleY', label: '세로 크기 (%)', max: 400, min: 1, step: 0.1},
  {key: 'rotation', label: '회전 (°)', max: 180, min: -180, step: 0.1},
  {key: 'opacity', label: '불투명도 (%)', max: 100, min: 0, step: 1},
]
