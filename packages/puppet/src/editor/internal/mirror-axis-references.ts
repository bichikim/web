import {
  getDocumentScene,
  type PuppetDocument,
  type PuppetPoint,
  type PuppetSceneNode,
} from '../../player'
import {getDeformerRotationOrigin} from './deformer-transform'

/** A named point a mirror line can pass through. */
export interface MirrorAxisReference {
  readonly label: string
  readonly point: PuppetPoint
}

const collectRotationDeformers = (
  nodes: ReadonlyArray<PuppetSceneNode>,
): ReadonlyArray<MirrorAxisReference> =>
  nodes.flatMap((node) => {
    if (node.kind === 'part') {
      return []
    }
    const inner = collectRotationDeformers(node.children)
    return node.kind === 'deformer' && node.deformerType === 'rotation'
      ? [{label: `${node.name} 중심`, point: getDeformerRotationOrigin(node)}, ...inner]
      : inner
  })

/**
 * Where mesh mirroring can center (Cubism's motion mirroring axis): the canvas center, then
 * each rotation deformer's pivot.
 */
export const getMirrorAxisReferences = (
  document: PuppetDocument,
): ReadonlyArray<MirrorAxisReference> => [
  {
    label: '캔버스 중심',
    point: {x: document.viewport.width / 2, y: document.viewport.height / 2},
  },
  ...collectRotationDeformers(getDocumentScene(document).roots),
]
