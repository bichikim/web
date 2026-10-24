import type {
  PuppetChainPendulum,
  PuppetDocument,
  PuppetPhysics,
  PuppetPhysicsChain,
  PuppetPhysicsInput,
  PuppetPhysicsOutput,
} from '../../player'

const NORMALIZATION_LIMIT = 10
const DEFAULT_RANGE = {center: 0, maximum: NORMALIZATION_LIMIT, minimum: -NORMALIZATION_LIMIT}

/** Typical Cubism settings: as long as a full input swing, swinging freely. */
export const DEFAULT_CHAIN_PENDULUM: PuppetChainPendulum = {
  acceleration: 1.5,
  length: 10,
  mobility: 0.9,
  reaction: 0.9,
}

/** Angle outputs read radians: 10 turns a 0.1 rad swing into 1 parameter unit. */
const DEFAULT_OUTPUT_SCALE = 10

const getPhysics = (document: PuppetDocument): PuppetPhysics => document.physics ?? {pendulums: []}

const withChains = (
  document: PuppetDocument,
  chains: ReadonlyArray<PuppetPhysicsChain>,
): PuppetDocument => {
  const {chains: _previous, ...physics} = getPhysics(document)
  return {...document, physics: chains.length === 0 ? physics : {...physics, chains}}
}

const nextChainId = (chains: ReadonlyArray<PuppetPhysicsChain>) => {
  const ids = new Set(chains.map((chain) => chain.id))
  let index = chains.length + 1
  while (ids.has(`chain-${index}`)) {
    index += 1
  }
  return `chain-${index}`
}

/** Chains with an input among `parameterIds` (all chains when omitted). */
export const getParameterChains = (
  document: PuppetDocument,
  parameterIds?: ReadonlyArray<string>,
) =>
  (getPhysics(document).chains ?? []).filter(
    (chain) =>
      parameterIds === undefined ||
      chain.inputs.some((input) => parameterIds.includes(input.parameterId)),
  )

/** A one-pendulum chain moved horizontally by `inputParameterId`, without outputs yet. */
export const addPhysicsChain = (document: PuppetDocument, inputParameterId: string) => {
  if (!(document.parameters ?? []).some((parameter) => parameter.id === inputParameterId)) {
    return undefined
  }
  const chains = getPhysics(document).chains ?? []
  const chain: PuppetPhysicsChain = {
    id: nextChainId(chains),
    inputs: [{axis: 'x', parameterId: inputParameterId, weight: 1}],
    normalization: {angle: DEFAULT_RANGE, position: DEFAULT_RANGE},
    outputs: [],
    pendulums: [DEFAULT_CHAIN_PENDULUM],
  }
  return {chain, document: withChains(document, [...chains, chain])}
}

export const removePhysicsChain = (document: PuppetDocument, chainId: string) =>
  withChains(
    document,
    (getPhysics(document).chains ?? []).filter((chain) => chain.id !== chainId),
  )

/**
 * Replaces one chain. Returns `undefined` when the result would let an output feed its own
 * chain's input, point past the last pendulum, or leave no pendulum.
 */
export const updatePhysicsChain = (
  document: PuppetDocument,
  chainId: string,
  update: (chain: PuppetPhysicsChain) => PuppetPhysicsChain,
): PuppetDocument | undefined => {
  const chains = getPhysics(document).chains ?? []
  const current = chains.find((chain) => chain.id === chainId)
  if (current === undefined) {
    return undefined
  }
  const next = update(current)
  const inputIds = new Set(next.inputs.map((input) => input.parameterId))
  const valid =
    next.pendulums.length > 0 &&
    next.outputs.every(
      (output) => !inputIds.has(output.parameterId) && output.pendulumIndex < next.pendulums.length,
    )
  return valid
    ? withChains(
        document,
        chains.map((chain) => (chain.id === chainId ? next : chain)),
      )
    : undefined
}

/** Replaces item `index` of a chain list with `changes` merged in. */
export const patchItem = <Item>(
  items: ReadonlyArray<Item>,
  index: number,
  changes: Partial<Item>,
): ReadonlyArray<Item> => items.map((item, at) => (at === index ? {...item, ...changes} : item))

/** An output the first unused, non-input parameter would take, if any. */
export const createChainOutput = (
  document: PuppetDocument,
  chain: PuppetPhysicsChain,
): PuppetPhysicsOutput | undefined => {
  const used = new Set([
    ...chain.inputs.map((input) => input.parameterId),
    ...chain.outputs.map((output) => output.parameterId),
  ])
  const parameter = (document.parameters ?? []).find((candidate) => !used.has(candidate.id))
  return parameter === undefined
    ? undefined
    : {
        axis: 'angle',
        parameterId: parameter.id,
        pendulumIndex: chain.pendulums.length - 1,
        scale: DEFAULT_OUTPUT_SCALE,
        weight: 1,
      }
}

/** A further input from the first parameter that is not an output of the chain. */
export const createChainInput = (
  document: PuppetDocument,
  chain: PuppetPhysicsChain,
): PuppetPhysicsInput | undefined => {
  const outputs = new Set(chain.outputs.map((output) => output.parameterId))
  const parameter = (document.parameters ?? []).find((candidate) => !outputs.has(candidate.id))
  return parameter === undefined ? undefined : {axis: 'angle', parameterId: parameter.id, weight: 1}
}

/** Sets the world gravity, wind or step rate shared by every chain. */
export const setPhysicsWorld = (
  document: PuppetDocument,
  changes: Pick<PuppetPhysics, 'fps' | 'gravity' | 'wind'>,
): PuppetDocument => ({...document, physics: {...getPhysics(document), ...changes}})
