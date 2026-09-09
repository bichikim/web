const FAHRENHEIT_SCALE = 9
const CELSIUS_SCALE = 5
const FAHRENHEIT_OFFSET = -32
const PYEONG_DENOMINATOR = 121
const PYEONG_NUMERATOR = 400
export type UnitCategory = 'length' | 'mass' | 'area' | 'volume' | 'temperature'
export interface Unit {
  readonly id: string
  readonly category: UnitCategory
  readonly scale: number
  readonly offset?: number
}
const UNITS: ReadonlyArray<Unit> = [
  {category: 'length', id: 'mm', scale: 0.001},
  {category: 'length', id: 'cm', scale: 0.01},
  {category: 'length', id: 'm', scale: 1},
  {category: 'length', id: 'km', scale: 1000},
  {category: 'length', id: 'in', scale: 0.0254},
  {category: 'length', id: 'ft', scale: 0.3048},
  {category: 'length', id: 'yd', scale: 0.9144},
  {category: 'length', id: 'mi', scale: 1609.344},
  {category: 'mass', id: 'g', scale: 0.001},
  {category: 'mass', id: 'kg', scale: 1},
  {category: 'mass', id: 'oz', scale: 0.028349523125},
  {category: 'mass', id: 'lb', scale: 0.45359237},
  {category: 'area', id: 'm2', scale: 1},
  {category: 'area', id: 'ft2', scale: 0.09290304},
  {category: 'area', id: 'ha', scale: 10000},
  {category: 'area', id: 'pyeong', scale: PYEONG_NUMERATOR / PYEONG_DENOMINATOR},
  {category: 'volume', id: 'mL', scale: 0.001},
  {category: 'volume', id: 'L', scale: 1},
  {category: 'volume', id: 'm3', scale: 1000},
  {category: 'volume', id: 'galUS', scale: 3.785411784},
  {category: 'temperature', id: 'C', scale: 1},
  {
    category: 'temperature',
    id: 'F',
    offset: (FAHRENHEIT_OFFSET * CELSIUS_SCALE) / FAHRENHEIT_SCALE,
    scale: CELSIUS_SCALE / FAHRENHEIT_SCALE,
  },
  {category: 'temperature', id: 'K', offset: -273.15, scale: 1},
]
export const getUnits = (category: UnitCategory, locale: string): ReadonlyArray<Unit> =>
  UNITS.filter((unit) => unit.category === category && (locale === 'ko' || unit.id !== 'pyeong'))
export interface ConvertUnitOptions {
  readonly value: string
  readonly from: string
  readonly to: string
}
export type ConversionResult =
  | {readonly kind: 'empty'}
  | {readonly kind: 'invalid'}
  | {readonly kind: 'valid'; readonly value: number}
export const convertUnit = (options: ConvertUnitOptions): ConversionResult => {
  const input = options.value.trim()
  if (!input) {
    return {kind: 'empty'}
  }
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+|\d{1,3}(?:,\d{3})+(?:\.\d*)?)(?:e[+-]?\d+)?$/iu.test(input)) {
    return {kind: 'invalid'}
  }
  const from = UNITS.find((unit) => unit.id === options.from)
  const to = UNITS.find((unit) => unit.id === options.to)
  if (from === undefined || to === undefined || from.category !== to.category) {
    return {kind: 'invalid'}
  }
  const number = Number(input.replaceAll(',', ''))
  const value = (number * from.scale + (from.offset ?? 0) - (to.offset ?? 0)) / to.scale
  return Number.isFinite(value)
    ? {kind: 'valid', value: Object.is(value, -0) ? 0 : value}
    : {kind: 'invalid'}
}
