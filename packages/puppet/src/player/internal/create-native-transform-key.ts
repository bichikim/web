import {getDeformerShape} from '../../deformation/binding'
import type {PuppetParameterBinding, PuppetSceneDeformerNode} from '../document'

type KeyformCoordinates = readonly [keyform: number, signature: number]
type BindingCoordinates = readonly [layout: number, samples: readonly KeyformCoordinates[]]
type BindingsByNode = Map<string, BindingCoordinates[]>

// JSON's default normalization would merge -0 with +0 and change cancellation at the boundary.
const serialize = (input: unknown) =>
  JSON.stringify(input, (_key, value: unknown) =>
    typeof value === 'number' && Object.is(value, -0) ? 'number:-0' : value,
  )

const intern = (signatures: Map<string, number>, input: unknown) => {
  const key = serialize(input)
  const previous = signatures.get(key)
  if (previous !== undefined) {
    return previous
  }
  const id = signatures.size
  signatures.set(key, id)
  return id
}

const collectSamples = (
  binding: PuppetParameterBinding,
  targets: readonly string[],
  signatures: Map<string, number>,
) => {
  const samplesByNode = new Map<string, KeyformCoordinates[]>(targets.map((id) => [id, []]))
  for (const [index, form] of binding.keyforms.entries()) {
    const seen = new Set<string>()
    for (const deformer of form.deformers ?? []) {
      const samples = samplesByNode.get(deformer.nodeId)
      if (samples !== undefined && !seen.has(deformer.nodeId)) {
        const {nodeId, properties: _properties, ...coordinates} = deformer
        seen.add(nodeId)
        samples.push([index, intern(signatures, coordinates)])
      }
    }
  }
  return samplesByNode
}

const layoutsByBindings = new WeakMap<ReadonlyArray<PuppetParameterBinding>, BindingsByNode>()
const getBindingCoordinates = (bindings: ReadonlyArray<PuppetParameterBinding>) => {
  const cached = layoutsByBindings.get(bindings)
  if (cached !== undefined) {
    return cached
  }
  const byNode: BindingsByNode = new Map()
  const layouts = new Map<string, number>()
  const signatures = new Map<string, number>()
  for (const binding of bindings) {
    const targets = binding.targetDeformerIds
    if (targets !== undefined && targets.length > 0) {
      const layout = intern(layouts, {
        influenceMode: binding.influenceMode,
        influences: binding.influences,
        interpolation: binding.interpolation,
        keyformRange: binding.keyformRange,
        parameterIds: binding.parameterIds,
        sampling: binding.sampling,
        values: binding.keyforms.map((form) => form.values),
      })
      for (const [node, samples] of collectSamples(binding, targets, signatures)) {
        const inputs = byNode.get(node) ?? []
        inputs.push([layout, samples])
        byNode.set(node, inputs)
      }
    }
  }
  layoutsByBindings.set(bindings, byNode)
  return byNode
}

/** Identifies equal coordinate calculations within one scene using its indexed binding inputs. */
export const createNativeTransformKey = (bindings: ReadonlyArray<PuppetParameterBinding>) => {
  const byNode = getBindingCoordinates(bindings)
  return (node: PuppetSceneDeformerNode): string =>
    serialize([node.coordinateSpace, getDeformerShape(node), byNode.get(node.id) ?? []])
}
