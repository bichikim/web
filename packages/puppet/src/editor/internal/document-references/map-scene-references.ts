import type {PuppetDeformerShape, PuppetSceneNode} from '../../../player/document'
import type {ReferenceTransform} from './types'

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
    switch (node.kind) {
      case 'part':
        return transform.keepPart(node.id)
          ? [
              {
                ...node,
                id: transform.rename(node.id),
                skinning:
                  node.skinning === undefined
                    ? undefined
                    : {
                        ...node.skinning,
                        influences: node.skinning.influences.map((influence) => ({
                          ...influence,
                          nodeId: transform.rename(influence.nodeId),
                        })),
                      },
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
      case 'deformer': {
        const mappedNode = {...node, ...mapShape(node, transform)}
        const children = mapSceneReferences(node.children, transform)
        const id = transform.rename(node.id)
        const binding =
          node.binding === undefined
            ? undefined
            : {
                rest: mapShape(node.binding.rest, transform),
                steps: node.binding.steps.map((step) => ({
                  rest: step.rest === undefined ? undefined : mapShape(step.rest, transform),
                  shape: mapShape(step.shape, transform),
                })),
              }
        return [
          {
            ...mappedNode,
            binding,
            children,
            id,
          },
        ]
      }
      default: {
        const exhaustive: never = node
        return exhaustive
      }
    }
  })
