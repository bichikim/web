/* eslint-disable no-magic-numbers -- Native MOC3 table components. */
import type {Moc3Model} from '../read-moc3'
import type {Moc3Record} from './types'

export const column = (model: Moc3Model, table: string, field: string) =>
  model.tables[table]?.columns[field] ?? []
export const numberAt = (model: Moc3Model, table: string, field: string, index: number): number => {
  const value = column(model, table, field)[index]
  if (value === undefined) {
    throw new Error(`MOC3 ${table}.${field} references missing index ${index}`)
  }
  return value
}
export const range = (values: ReadonlyArray<number>, begin: number, count: number) => {
  if (
    !Number.isInteger(begin) ||
    !Number.isInteger(count) ||
    begin < 0 ||
    count < 0 ||
    begin + count > values.length
  ) {
    throw new Error('MOC3 source range exceeds table bounds')
  }
  return values.slice(begin, begin + count)
}
export const readColors = (
  model: Moc3Model,
  source: Moc3Record,
  form: Moc3Record,
  delta = false,
) => {
  const colorBegin = column(model, source.table, 'colorBegin')[source.index]
  const offset = form.index - (column(model, source.table, 'begin')[source.index] ?? 0)
  const color = (name: string): readonly [number, number, number] => {
    const index =
      model.version >= 5
        ? column(model, form.table, name === 'multiplyColors' ? 'multiplyBegin' : 'screenBegin')[
            form.index
          ]
        : colorBegin === undefined
          ? undefined
          : colorBegin + offset
    const fallback = !delta && name === 'multiplyColors' ? 1 : 0
    if (index === undefined || index < 0) {
      return [fallback, fallback, fallback]
    }
    return [
      numberAt(model, name, 'red', index),
      numberAt(model, name, 'green', index),
      numberAt(model, name, 'blue', index),
    ]
  }
  return {multiplyColor: color('multiplyColors'), screenColor: color('screenColors')}
}
export const readPosition = (model: Moc3Model, table: string, form: number, vertices: number) =>
  range(
    column(model, 'positions', 'values'),
    numberAt(model, table, 'positionBegin', form),
    vertices * 2,
  ).map((value, index) => (model.canvas.reverseY && index % 2 === 1 ? -value : value))

/** Reversing the native coordinate convention also reverses the normalized grid's row domain. */
export const readWarpPosition = (model: Moc3Model, form: number, columns: number, rows: number) => {
  const width = columns + 1
  const positions = readPosition(model, 'warpKeyforms', form, width * (rows + 1))
  return model.canvas.reverseY
    ? Array.from({length: rows + 1}, (_, row) =>
        positions.slice((rows - row) * width * 2, (rows - row + 1) * width * 2),
      ).flat()
    : positions
}
