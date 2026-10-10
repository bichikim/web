import {isSceneContainerNode, type PuppetSceneNode} from '../../player'

export const getFilteredLayerIds = (
  nodes: ReadonlyArray<PuppetSceneNode>,
  filter: string,
): ReadonlySet<string> => {
  const query = filter.trim().toLocaleLowerCase()
  const visible = new Set<string>()
  const visit = (node: PuppetSceneNode): boolean => {
    const descendants = isSceneContainerNode(node) ? node.children.map(visit).some(Boolean) : false
    const matches = node.name.toLocaleLowerCase().includes(query)
    if (matches || descendants) {
      visible.add(node.id)
    }
    return matches || descendants
  }
  nodes.forEach(visit)
  return visible
}
