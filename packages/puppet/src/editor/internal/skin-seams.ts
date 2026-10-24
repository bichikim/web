import type {PuppetDocument, PuppetSkinBinding} from '../../player/document'
import {getDocumentScene} from '../../player/scene'
import {getBoundaryEdges} from '../../mesh/boundary'
import {getSkinFrames, transformSkinPoint} from '../../deformation/skinning'
import {isSceneNodeLocked} from './scene-graph'
import {updateNode} from './scene-tree'

interface Reference {
  readonly partId: string
  readonly vertex: number
}
const indexSeams = (document: PuppetDocument, partId: string, binding: PuppetSkinBinding) => {
  const frames = getSkinFrames(getDocumentScene(document).roots)
  const bindings = new Map<string, PuppetSkinBinding>()
  const references = new Map<string, Reference>()
  const links = new Map<string, Set<string>>()
  const positions = new Map<string, string[]>()
  const connect = (first: string, second: string) => {
    if (!references.has(first) || !references.has(second)) {
      return
    }
    links.set(first, new Set([...(links.get(first) ?? []), second]))
    links.set(second, new Set([...(links.get(second) ?? []), first]))
  }
  for (const part of document.parts) {
    const node = frames.get(part.id)?.node
    const skin = part.id === partId ? binding : node?.kind === 'part' ? node.skinning : undefined
    if (skin !== undefined) {
      bindings.set(part.id, skin)
      const boundary = new Set(
        getBoundaryEdges(part.mesh).flatMap((edge) => [edge.firstIndex, edge.secondIndex]),
      )
      for (const vertex of boundary) {
        const key = `${part.id}:${vertex}`
        references.set(key, {partId: part.id, vertex})
        const point = transformSkinPoint(skin.bind, {
          x: part.mesh.vertices[vertex * 2]!,
          y: part.mesh.vertices[vertex * 2 + 1]!,
        })
        const PRECISION = 5
        const coordinate = `${point.x.toFixed(PRECISION)},${point.y.toFixed(PRECISION)}`
        const neighbors = positions.get(coordinate) ?? []
        for (const neighbor of neighbors) {
          connect(key, neighbor)
        }
        positions.set(coordinate, [...neighbors, key])
      }
    }
  }
  for (const glue of document.glue ?? []) {
    if (glue.strength > 0) {
      const first = `${glue.first.partId}:${glue.first.vertexIndex}`
      connect(first, `${glue.second.partId}:${glue.second.vertexIndex}`)
      if ('edge' in glue.second) {
        connect(first, `${glue.second.partId}:${glue.second.edge.endIndex}`)
      }
    }
  }
  return {bindings, links, references}
}

interface CopyOptions {
  readonly source: PuppetSkinBinding
  readonly target: PuppetSkinBinding
  readonly from: number
  readonly to: number
}
const copyDistribution = (options: CopyOptions): PuppetSkinBinding => {
  const {source, target, from, to} = options
  const missing = source.influences.filter(
    (influence) => !target.influences.some((other) => other.nodeId === influence.nodeId),
  )
  const influences = [
    ...target.influences,
    ...missing.map((influence) => ({
      ...influence,
      weights: target.influences[0]!.weights.map(() => 0),
    })),
  ]
  return {
    ...target,
    influences: influences.map((influence) => ({
      ...influence,
      weights: influence.weights.map((weight, vertex) =>
        vertex === to
          ? (source.influences.find((other) => other.nodeId === influence.nodeId)?.weights[from] ??
            0)
          : weight,
      ),
    })),
    syncSeams: source.syncSeams,
  }
}

const component = (links: ReadonlyMap<string, Set<string>>, key: string): Set<string> => {
  const found = new Set([key])
  for (const next of found) {
    for (const neighbor of links.get(next) ?? []) {
      found.add(neighbor)
    }
  }
  return found
}

/** Synchronizes changed weights on coincident or glued boundaries of skinned parts. */
export const synchronizeSkinSeams = (
  document: PuppetDocument,
  partId: string,
  binding: PuppetSkinBinding,
): PuppetDocument => {
  const scene = getDocumentScene(document)
  const original = getSkinFrames(scene.roots).get(partId)?.node
  const previous = original?.kind === 'part' ? original.skinning : undefined
  const {bindings, references, links} = indexSeams(document, partId, binding)
  const visited = new Set<string>()
  const changed = [...references].filter(
    ([, reference]) =>
      reference.partId === partId &&
      (previous === undefined ||
        previous.syncSeams !== binding.syncSeams ||
        binding.influences.some(
          (influence) =>
            influence.weights[reference.vertex] !==
            previous.influences.find((other) => other.nodeId === influence.nodeId)?.weights[
              reference.vertex
            ],
        )),
  )
  for (const [key, reference] of changed) {
    if (!visited.has(key)) {
      const connected = component(links, key)
      if ([...connected].some((key) => isSceneNodeLocked(document, references.get(key)!.partId))) {
        return document
      }
      const source = bindings.get(partId)!
      for (const next of connected) {
        visited.add(next)
        const target = references.get(next)!
        bindings.set(
          target.partId,
          copyDistribution({
            from: reference.vertex,
            source,
            target: bindings.get(target.partId)!,
            to: target.vertex,
          }),
        )
      }
    }
  }
  let {roots} = scene
  for (const [id, skinning] of bindings) {
    roots = updateNode(roots, id, (node) => (node.kind === 'part' ? {...node, skinning} : node))
  }
  return {...document, scene: {...scene, roots}}
}
