import type {PuppetDocument, PuppetSceneNode} from '../../../player/document'
import {getDocumentScene} from '../../../player/scene'
const sceneIds = (nodes: ReadonlyArray<PuppetSceneNode>): Array<string> =>
  nodes.flatMap((node) =>
    node.kind === 'part' ? [node.id] : [node.id, ...sceneIds(node.children)],
  )

export const collectDocumentIds = (document: PuppetDocument): ReadonlySet<string> =>
  new Set([
    ...document.parts.map((part) => part.id),
    ...document.parts.flatMap((part) =>
      part.psdSource?.documentId === undefined ? [] : [part.psdSource.documentId],
    ),
    ...sceneIds(getDocumentScene(document).roots),
    ...(document.parameters ?? []).map((parameter) => parameter.id),
    ...(document.parameterBindings ?? []).map((binding) => binding.id),
    ...(document.glue ?? []).map((glue) => glue.id),
    ...document.motions.map((motion) => motion.id),
    ...(document.physics?.pendulums ?? []).map((pendulum) => pendulum.id),
  ])
