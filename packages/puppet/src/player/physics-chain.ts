import {clamp} from 'es-toolkit/math'

import {
  DEFAULT_PUPPET_CHAIN_FPS,
  DEFAULT_PUPPET_CHAIN_GRAVITY,
  type PuppetParameter,
  type PuppetPhysics,
  type PuppetPhysicsChain,
  type PuppetPhysicsOutput,
  type PuppetPhysicsRange,
} from './document'
import {boundParameterValue} from './parameter-value'

type Vector = readonly [number, number]
type Values = Readonly<Record<string, number>>

/** One pendulum's end point and velocity (chain units, `y` down) and the gravity it last felt. */
export interface ChainPendulumState {
  readonly gravity: Vector
  readonly position: Vector
  readonly velocity: Vector
}

/** A chain's pendulums, root, and output readings of the last two steps. */
export interface ChainState {
  readonly current: ReadonlyArray<number>
  readonly pendulums: ReadonlyArray<ChainPendulumState>
  readonly previous: ReadonlyArray<number>
  readonly root: Vector
}

/**
 * State shared by every chain: unstepped time, the parameter values the last step read
 * (inputs are interpolated between frames), and each chain by ID.
 */
export interface ChainsState {
  readonly accumulator: number
  readonly chains: ReadonlyMap<string, ChainState>
  readonly inputs: Values
}

interface ChainRoot {
  /** Gravity direction turned by the inputs' tilt. */
  readonly gravity: Vector
  readonly position: Vector
}

interface ChainWorld {
  /** Unit gravity direction in the untilted frame. */
  readonly gravity: Vector
  readonly parameters: ReadonlyMap<string, PuppetParameter>
  readonly step: number
  readonly wind: Vector
}

/** Pendulums turn toward a new gravity direction by this fraction of the change per step. */
const AIR_RESISTANCE = 5
/** End points closer than this share of the position range to `x = 0` snap onto it. */
const MOVEMENT_THRESHOLD = 0.001
/** Accumulated time beyond this is dropped instead of simulated. */
const MAX_ACCUMULATED_SECONDS = 5
/** `reaction` scales time in units of 1/30 s. */
const REACTION_RATE = 30
const HALF_TURN_DEGREES = 180
const FULL_TURN = 2 * Math.PI

const add = (first: Vector, second: Vector): Vector => [first[0] + second[0], first[1] + second[1]]
const subtract = (first: Vector, second: Vector): Vector => [
  first[0] - second[0],
  first[1] - second[1],
]
const scale = (vector: Vector, factor: number): Vector => [vector[0] * factor, vector[1] * factor]
const rotate = (vector: Vector, radians: number): Vector => {
  const [cos, sin] = [Math.cos(radians), Math.sin(radians)]
  return [vector[0] * cos - vector[1] * sin, vector[0] * sin + vector[1] * cos]
}
/** `vector` scaled to length 1, or `fallback` when it has no length. */
const unit = (vector: Vector, fallback: Vector): Vector => {
  const size = Math.hypot(vector[0], vector[1])
  return size > 0 ? scale(vector, 1 / size) : fallback
}
/** Signed angle (radians, -π..π) turning `from` onto `to`. */
const angleBetween = (from: Vector, to: Vector) => {
  const turn = Math.atan2(to[1], to[0]) - Math.atan2(from[1], from[0])
  return turn - FULL_TURN * Math.round(turn / FULL_TURN)
}

const getWorld = (
  physics: PuppetPhysics | undefined,
  parameters: ReadonlyMap<string, PuppetParameter>,
  deltaTime = 1 / DEFAULT_PUPPET_CHAIN_FPS,
): ChainWorld => ({
  gravity: unit(physics?.gravity ?? DEFAULT_PUPPET_CHAIN_GRAVITY, DEFAULT_PUPPET_CHAIN_GRAVITY),
  parameters,
  step: physics?.fps === 0 ? deltaTime : 1 / (physics?.fps ?? DEFAULT_PUPPET_CHAIN_FPS),
  wind: physics?.wind ?? [0, 0],
})

/** The parameter's value as physics reads it: finite, wrapped or limited to its range. */
const readValue = (parameter: PuppetParameter, values: Values) => {
  const value = values[parameter.id]
  return boundParameterValue(
    parameter,
    value === undefined || !Number.isFinite(value) ? parameter.defaultValue : value,
  )
}

/**
 * Maps the value's offset from the parameter default onto `range` around its center (each side
 * scaled separately) and points it the chain's way: positive values move the root toward `-x`
 * unless `reflect` is set.
 */
const normalize = (
  parameter: PuppetParameter,
  value: number,
  range: PuppetPhysicsRange,
  reflect: boolean,
) => {
  const offset = clamp(value, parameter.minimum, parameter.maximum) - parameter.defaultValue
  const [limit, end] =
    offset > 0 ? [parameter.maximum, range.maximum] : [parameter.minimum, range.minimum]
  const span = limit - parameter.defaultValue
  let normalized = range.center
  if (offset !== 0) {
    normalized = span === 0 ? 0 : (offset * (end - range.center)) / span + range.center
  }
  return reflect ? normalized : -normalized
}

/** The root's position and the tilted gravity from the chain's weighted inputs. */
const getRoot = (chain: PuppetPhysicsChain, world: ChainWorld, values: Values): ChainRoot => {
  const sum = chain.inputs.reduce(
    (total, input) => {
      const parameter = world.parameters.get(input.parameterId)
      if (parameter === undefined) {
        return total
      }
      const range =
        input.axis === 'angle' ? chain.normalization.angle : chain.normalization.position
      const share =
        normalize(parameter, readValue(parameter, values), range, input.reflect === true) *
        input.weight
      return {...total, [input.axis]: total[input.axis] + share}
    },
    {angle: 0, x: 0, y: 0},
  )
  const tilt = (-sum.angle * Math.PI) / HALF_TURN_DEGREES
  return {gravity: rotate(world.gravity, tilt), position: rotate([sum.x, sum.y], tilt)}
}

/** Moves end points within the threshold onto `x = 0`, steadying a chain at rest. */
const snap = (point: Vector, chain: PuppetPhysicsChain): Vector =>
  Math.abs(point[0]) < MOVEMENT_THRESHOLD * chain.normalization.position.maximum
    ? [0, point[1]]
    : point

const force = (root: ChainRoot, world: ChainWorld, acceleration: number) =>
  add(scale(root.gravity, acceleration), world.wind)

/** Each pendulum hanging still along its force. */
const hangPendulums = (chain: PuppetPhysicsChain, root: ChainRoot, world: ChainWorld) =>
  chain.pendulums.reduce<Array<ChainPendulumState>>((placed, pendulum) => {
    const parent = placed.at(-1)?.position ?? root.position
    const along = unit(force(root, world, pendulum.acceleration), root.gravity)
    const position = snap(add(parent, scale(along, pendulum.length)), chain)
    return [...placed, {gravity: root.gravity, position, velocity: [0, 0]}]
  }, [])

/**
 * One step of `world.step` seconds. Each pendulum keeps its direction from the moved parent,
 * turned by a fifth of the gravity change, moves by its velocity and force over its reaction
 * time, and is put back at its length from the parent.
 */
const stepPendulums = (
  chain: PuppetPhysicsChain,
  state: ChainState,
  root: ChainRoot,
  world: ChainWorld,
) =>
  chain.pendulums.reduce<Array<ChainPendulumState>>((placed, pendulum, index) => {
    const parent = placed.at(-1)?.position ?? root.position
    const previous = state.pendulums[index] ?? {
      gravity: root.gravity,
      position: parent,
      velocity: [0, 0],
    }
    const time = pendulum.reaction * world.step * REACTION_RATE
    const turned = rotate(
      subtract(previous.position, parent),
      angleBetween(previous.gravity, root.gravity) / AIR_RESISTANCE,
    )
    const moved = add(
      add(parent, turned),
      add(
        scale(previous.velocity, time),
        scale(force(root, world, pendulum.acceleration), time * time),
      ),
    )
    const position = snap(
      add(parent, scale(unit(subtract(moved, parent), root.gravity), pendulum.length)),
      chain,
    )
    const velocity =
      time === 0
        ? previous.velocity
        : scale(subtract(position, previous.position), pendulum.mobility / time)
    return [...placed, {gravity: root.gravity, position, velocity}]
  }, [])

/**
 * An output's reading: the pendulum's offset from its parent (`x`, `y`), or its angle in radians
 * from the parent pendulum's direction (gravity for the first). `reflect` negates it.
 */
const read = (
  pendulums: ReadonlyArray<ChainPendulumState>,
  root: Vector,
  world: ChainWorld,
  output: PuppetPhysicsOutput,
) => {
  const at = (index: number) => pendulums[index]?.position ?? root
  const segment = subtract(at(output.pendulumIndex), at(output.pendulumIndex - 1))
  let reading = output.axis === 'x' ? segment[0] : segment[1]
  if (output.axis === 'angle') {
    const reference =
      output.pendulumIndex === 0
        ? world.gravity
        : subtract(at(output.pendulumIndex - 1), at(output.pendulumIndex - 2))
    reading = angleBetween(reference, segment)
  }
  return output.reflect === true ? -reading : reading
}

/** `reading × scale`, limited to the parameter's range, blended over `values` by weight. */
const writeOutputs = (
  chain: PuppetPhysicsChain,
  readings: ReadonlyArray<number>,
  world: ChainWorld,
  values: Values,
): Values =>
  chain.outputs.reduce((written, output, index) => {
    const parameter = world.parameters.get(output.parameterId)
    const reading = readings[index] ?? 0
    if (parameter === undefined || !Number.isFinite(reading)) {
      return written
    }
    const target = clamp(reading * output.scale, parameter.minimum, parameter.maximum)
    const current = readValue(parameter, written)
    const value =
      output.weight >= 1 ? target : current * (1 - output.weight) + target * output.weight
    return {...written, [parameter.id]: value}
  }, values)

const readAll = (
  chain: PuppetPhysicsChain,
  pendulums: ReadonlyArray<ChainPendulumState>,
  root: Vector,
  world: ChainWorld,
) => chain.outputs.map((output) => read(pendulums, root, world, output))

/** Every parameter's value as physics reads it. */
const snapshot = (world: ChainWorld, values: Values): Values =>
  Object.fromEntries(
    [...world.parameters.values()].map((parameter) => [parameter.id, readValue(parameter, values)]),
  )

/** All chains hanging still for `values`; outputs are written as they settle. */
export const settleChains = (options: {
  readonly parameters: ReadonlyMap<string, PuppetParameter>
  readonly physics: PuppetPhysics | undefined
  readonly values: Values
}): {readonly state: ChainsState; readonly values: Values} => {
  const world = getWorld(options.physics, options.parameters)
  const chains = new Map<string, ChainState>()
  let {values} = options
  for (const chain of options.physics?.chains ?? []) {
    const root = getRoot(chain, world, values)
    const pendulums = hangPendulums(chain, root, world)
    const readings = readAll(chain, pendulums, root.position, world)
    values = writeOutputs(chain, readings, world, values)
    chains.set(chain.id, {current: readings, pendulums, previous: readings, root: root.position})
  }
  return {state: {accumulator: 0, chains, inputs: snapshot(world, options.values)}, values}
}

/** Writes each output blended between its last two step readings by `alpha`. */
const interpolateOutputs = (
  physics: PuppetPhysics | undefined,
  state: ChainsState,
  world: ChainWorld,
  options: {readonly alpha: number; readonly values: Values},
) =>
  (physics?.chains ?? []).reduce((values, chain) => {
    const chainState = state.chains.get(chain.id)
    const readings = chain.outputs.map(
      (_output, index) =>
        (chainState?.previous[index] ?? 0) * (1 - options.alpha) +
        (chainState?.current[index] ?? 0) * options.alpha,
    )
    return chainState === undefined ? values : writeOutputs(chain, readings, world, values)
  }, options.values)

/** One fixed step of every chain on `values`; later chains read earlier chains' outputs. */
const stepChains = (
  physics: PuppetPhysics | undefined,
  state: ChainsState,
  world: ChainWorld,
  values: Values,
) => {
  const chains = new Map<string, ChainState>()
  let stepped = values
  for (const chain of physics?.chains ?? []) {
    const previous = state.chains.get(chain.id)
    if (previous !== undefined) {
      const root = getRoot(chain, world, stepped)
      const pendulums = stepPendulums(chain, previous, root, world)
      const current = readAll(chain, pendulums, root.position, world)
      stepped = writeOutputs(chain, current, world, stepped)
      chains.set(chain.id, {current, pendulums, previous: previous.current, root: root.position})
    }
  }
  return chains
}

/** `from` moved toward `to` by `share` (parameters missing from `from` start at `to`). */
const moveInputs = (from: Values, to: Values, share: number): Values =>
  Object.fromEntries(
    Object.entries(to).map(([id, value]) => [
      id,
      (from[id] ?? value) * (1 - share) + value * share,
    ]),
  )

/**
 * Advances every chain by `deltaTime` in fixed steps of `1 / fps`. Each step reads the inputs
 * moved from the last step's values toward `values` by its share of the remaining time; the
 * outputs written to `values` blend the last two steps by the time left over.
 */
export const advanceChains = (options: {
  readonly deltaTime: number
  readonly parameters: ReadonlyMap<string, PuppetParameter>
  readonly physics: PuppetPhysics | undefined
  readonly state: ChainsState
  readonly values: Values
}): {readonly state: ChainsState; readonly values: Values} => {
  const world = getWorld(
    options.physics,
    options.parameters,
    options.deltaTime > 0 ? options.deltaTime : undefined,
  )
  const target = snapshot(world, options.values)
  const deltaTime = Number.isFinite(options.deltaTime) ? Math.max(0, options.deltaTime) : 0
  let accumulator = options.state.accumulator + deltaTime
  if (accumulator > MAX_ACCUMULATED_SECONDS) {
    accumulator = 0
  }
  let {state} = options
  // Without time passing, only the outputs are written again.
  const due = deltaTime > 0 ? world.step : Number.POSITIVE_INFINITY
  for (; accumulator >= due; accumulator -= world.step) {
    const inputs = moveInputs(state.inputs, target, world.step / accumulator)
    state = {accumulator, chains: stepChains(options.physics, state, world, inputs), inputs}
  }
  state = {...state, accumulator}
  const values = interpolateOutputs(options.physics, state, world, {
    alpha: accumulator / world.step,
    values: options.values,
  })
  return {state, values}
}

/** Whether `state` holds every chain of `physics` with its pendulum and output counts. */
export const matchesChains = (state: ChainsState, physics: PuppetPhysics | undefined) =>
  (physics?.chains ?? []).every((chain) => {
    const chainState = state.chains.get(chain.id)
    return (
      chainState !== undefined &&
      chainState.pendulums.length === chain.pendulums.length &&
      chainState.current.length === chain.outputs.length
    )
  })
