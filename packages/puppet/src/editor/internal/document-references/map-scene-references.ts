import type {
  PuppetDeformerShape,
  PuppetSceneNode,
  PuppetSkinBinding,
} from '../../../player/document'
import type {ReferenceTransform} from './types'

const mapSkinning = (
  skinning: PuppetSkinBinding | undefined,
  transform: ReferenceTransform,
): PuppetSkinBinding | undefined => {
  if (
    skinning === undefined ||
    skinning.influences.some((influence) => transform.keepNode?.(influence.nodeId) === false)
  ) {
    return undefined
  }
  return {
    ...skinning,
    influences: skinning.influences.map((influence) => ({
      ...influence,
      nodeId: transform.rename(influence.nodeId),
    })),
  }
}

const mapShape = (
  shape: PuppetDeformerShape,
  transform: ReferenceTransform,
): PuppetDeformerShape => ({
  ...shape,
  boneWeights: shape.boneWeights
    ?.filter((value) => transform.keepPart(value.partId))
    .map((value) => ({...value, partId: transform.rename(value.partId)})),
  vertexInfluences: shape.vertexInfluences
    ?.filter((value) => transform.keepPart(value.partId))
    .map((value) => ({...value, partId: transform.rename(value.partId)})),
})

export const mapSceneReferences = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  transform: ReferenceTransform,
): Array<PuppetSceneNode> =>
  nodes.flatMap<PuppetSceneNode>((node) => {
    if (transform.keepNode?.(node.id) === false) {
      return []
    }
    switch (node.kind) {
      case 'part':
        return transform.keepPart(node.id)
          ? [
              {
                ...node,
                id: transform.rename(node.id),
                skinning: mapSkinning(node.skinning, transform),
              },
            ]
          : []
      case 'group':
        return [
          {
            ...node,
            children: mapSceneReferences(node.children, transform),
            id: transform.rename(node.id),
          },
        ]
      case 'deformer':
        return [
          {
            ...node,
            ...mapShape(node, transform),
            binding:
              node.binding === undefined
                ? undefined
                : {
                    rest: mapShape(node.binding.rest, transform),
                    steps: node.binding.steps.map((step) => ({
                      rest: step.rest === undefined ? undefined : mapShape(step.rest, transform),
                      shape: mapShape(step.shape, transform),
                    })),
                  },
            children: mapSceneReferences(node.children, transform),
            id: transform.rename(node.id),
          },
        ]
      default: {
        const exhaustive: never = node
        return exhaustive
      }
    }
  })
