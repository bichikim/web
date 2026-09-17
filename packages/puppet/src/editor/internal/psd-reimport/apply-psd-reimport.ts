import type {PuppetDocument, PuppetSceneNode} from '../../../player/document'
import {getDocumentScene} from '../../../player/scene'
import type {PsdReimportPlan} from './types'
export const applyPsdReimport = (plan: PsdReimportPlan): PuppetDocument => {
  const updates = new Map(
    plan.rows.flatMap((row) =>
      row.kind === 'update'
        ? [
            [
              row.id,
              {
                ...row.part,
                psdSource:
                  row.part.psdSource === undefined
                    ? undefined
                    : {
                        ...row.part.psdSource,
                        documentId: plan.sourceId ?? row.part.psdSource.documentId,
                      },
              },
            ] as const,
          ]
        : [],
    ),
  )
  const additions = plan.rows.flatMap((row) => (row.kind === 'add' ? [row.part] : []))
  const mapping = new Map(plan.mapping)
  const ids = new Set<string>()
  const collect = (nodes: ReadonlyArray<PuppetSceneNode>) => {
    for (const node of nodes) {
      ids.add(node.id)
      if (node.kind !== 'part') {
        collect(node.children)
      }
    }
  }
  collect(getDocumentScene(plan.document).roots)
  const allocate = (id: string) => {
    let next = id
    let index = 1
    while (ids.has(next)) {
      next = `${id}-${index}`
      index += 1
    }
    ids.add(next)
    return next
  }
  additions.forEach((part) => mapping.set(part.id, allocate(part.id)))
  const selected = new Set(additions.map((part) => part.id))
  const copy = (nodes: ReadonlyArray<PuppetSceneNode>): Array<PuppetSceneNode> =>
    nodes.flatMap<PuppetSceneNode>((node) => {
      if (node.kind === 'part') {
        return selected.has(node.id) ? [{...node, id: mapping.get(node.id)!}] : []
      }
      const children = copy(node.children)
      return children.length === 0 ? [] : [{...node, children, id: allocate(node.id)}]
    })
  const addedNodes = copy(getDocumentScene(plan.incoming).roots)
  return {
    ...plan.document,
    parts: [
      ...plan.document.parts.map((part) => updates.get(part.id) ?? part),
      ...additions.map((part) => ({
        ...part,
        id: mapping.get(part.id)!,
        properties: {
          ...part.properties,
          clippingMaskIds: part.properties?.clippingMaskIds?.map((id) => mapping.get(id)!),
        },
        psdSource:
          part.psdSource === undefined
            ? undefined
            : {
                ...part.psdSource,
                documentId: plan.sourceId ?? part.psdSource.documentId,
                fileName:
                  plan.sources.find((source) => source.id === plan.sourceId)?.fileName ??
                  part.psdSource.fileName,
              },
      })),
    ],
    scene: {roots: [...getDocumentScene(plan.document).roots, ...addedNodes]},
  }
}
