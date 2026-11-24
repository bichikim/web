/* eslint-disable no-magic-numbers -- Authored fractional and child orders expose accidental cross-group sorting. */
import type {PuppetDocument} from '../../../document'
import {createOrderDocument} from './draw-order'

/** A high-order child remains behind an outside sibling until its group crosses that sibling. */
export const createIsolatedOrderDocument = (keyed: boolean): PuppetDocument => {
  const source = createOrderDocument('changing', 'group')
  return {
    ...source,
    parameterBindings: keyed ? source.parameterBindings : [],
    parts: source.parts.map((part) => ({
      ...part,
      properties: {drawOrder: part.id === 'plain' ? (keyed ? 500.25 : 600) : 900},
    })),
    scene: {
      roots: source.scene!.roots.map((node) =>
        node.kind === 'group' ? {...node, properties: {isolateOrder: true}} : node,
      ),
    },
  }
}
