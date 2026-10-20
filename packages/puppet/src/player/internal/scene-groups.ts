import type {PuppetScene, PuppetSceneNode} from '../document'

const collectGroupIds = (nodes: ReadonlyArray<PuppetSceneNode>, ids: Set<string>) => {
  for (const node of nodes) {
    if (node.kind !== 'part') {
      if (node.kind === 'group') {
        ids.add(node.id)
      }
      collectGroupIds(node.children, ids)
    }
  }
  return ids
}

/** IDs of every scene group. */
export const getSceneGroupIds = (scene: PuppetScene | undefined): ReadonlySet<string> =>
  collectGroupIds(scene?.roots ?? [], new Set())
