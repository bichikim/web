import {rebindDeformer} from '../../deformation/binding'
import {getDocumentScene, type PuppetDocument, type PuppetPoint} from '../../player'
import {isDeformerRestEditable} from './deformer-placement'
import {findNode, updateNode} from './scene-tree'

interface PinLayoutOptions {
  readonly document: PuppetDocument
  readonly nodeId: string
  readonly index: number
  readonly operation: 'move' | 'append' | 'remove' | 'settings'
  readonly point?: PuppetPoint
  readonly radius?: number
  readonly strength?: number
  readonly preserve: boolean
}

export const editPinLayout = (options: PinLayoutOptions): PuppetDocument | undefined => {
  const scene = getDocumentScene(options.document)
  const node = findNode(scene.roots, options.nodeId)
  if (
    node?.kind !== 'deformer' ||
    node.pins === undefined ||
    !isDeformerRestEditable(options.document, node.id)
  ) {
    return undefined
  }
  const pin = node.pins[options.index]
  if (pin === undefined) {
    return undefined
  }
  const pins = [...node.pins]
  const controlPoints = [...node.controlPoints]
  switch (options.operation) {
    case 'move':
    case 'append': {
      const {point} = options
      if (!isFinitePoint(point)) {
        return undefined
      }
      if (options.operation === 'append') {
        pins.push({...pin, ...point})
        controlPoints.push(point.x, point.y)
      } else {
        pins[options.index] = {...pin, ...point}
        controlPoints.splice(options.index * 2, 2, point.x, point.y)
      }
      break
    }
    case 'remove':
      if (pins.length <= 1) {
        return undefined
      }
      pins.splice(options.index, 1)
      controlPoints.splice(options.index * 2, 2)
      break
    case 'settings': {
      const radius = options.radius ?? pin.radius
      const strength = options.strength ?? pin.strength
      if (!validSettings(radius, strength)) {
        return undefined
      }
      pins[options.index] = {...pin, radius, strength}
      break
    }
    default: {
      const exhaustive: never = options.operation
      return exhaustive
    }
  }
  const after = {...node, controlPoints, pins}
  return {
    ...options.document,
    scene: {
      ...scene,
      roots: updateNode(scene.roots, node.id, () =>
        options.preserve ? rebindDeformer(node, after) : after,
      ),
    },
  }
}

const isFinitePoint = (point: PuppetPoint | undefined): point is PuppetPoint =>
  point !== undefined && Number.isFinite(point.x) && Number.isFinite(point.y)
const validSettings = (radius: number, strength: number): boolean =>
  Number.isFinite(radius) &&
  radius > 0 &&
  Number.isFinite(strength) &&
  strength >= 0 &&
  strength <= 1
