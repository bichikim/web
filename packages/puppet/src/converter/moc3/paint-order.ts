import type {Moc3Model} from '../read-moc3'
import {column, numberAt, range} from './tables'

/** Expands draw order groups in stored tie order without losing their placement among meshes. */
export const readMoc3PaintOrder = (model: Moc3Model): ReadonlyArray<number> => {
  const visited = new Set<number>()
  const expand = (group: number): ReadonlyArray<number> => {
    if (visited.has(group)) {
      throw new Error('MOC3 draw order hierarchy contains a cycle')
    }
    visited.add(group)
    const begin = numberAt(model, 'orderGroups', 'begin', group)
    const count = numberAt(model, 'orderGroups', 'count', group)
    return range(column(model, 'orderObjects', 'type'), begin, count).flatMap((type, offset) => {
      const index = begin + offset
      switch (type) {
        case 0:
          return [numberAt(model, 'orderObjects', 'index', index)]
        case 1:
          return expand(numberAt(model, 'orderObjects', 'self', index))
        default:
          throw new Error(`Unsupported MOC3 draw order object type: ${type}`)
      }
    })
  }
  return (model.counts.orderGroups ?? 0) === 0 ? [] : expand(0)
}
