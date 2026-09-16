import type {PuppetPendulum} from './document'

const PHYSICS_STEPS_PER_SECOND = 120
const FIXED_TIME_STEP = 1 / PHYSICS_STEPS_PER_SECOND
const MAX_CATCH_UP_STEPS = 240
const MAX_CATCH_UP_TIME = MAX_CATCH_UP_STEPS * FIXED_TIME_STEP
const TIME_EPSILON = 1e-9

export interface PendulumState {
  readonly accumulator: number
  readonly position: number
  readonly velocity: number
}

export interface AdvancePendulumOptions {
  readonly deltaTime: number
  readonly input: number
  readonly pendulum: PuppetPendulum
  readonly state: PendulumState
}

export const createPendulumState = (): PendulumState => ({
  accumulator: 0,
  position: 0,
  velocity: 0,
})

const advanceStep = (
  state: Omit<PendulumState, 'accumulator'>,
  target: number,
  pendulum: PuppetPendulum,
): Omit<PendulumState, 'accumulator'> => {
  const acceleration =
    ((target - state.position) * pendulum.gravity) / pendulum.length -
    pendulum.damping * state.velocity
  const velocity = state.velocity + acceleration * FIXED_TIME_STEP
  const position = state.position + velocity * FIXED_TIME_STEP

  if (!Number.isFinite(acceleration) || !Number.isFinite(velocity) || !Number.isFinite(position)) {
    return state
  }

  return {
    position,
    velocity,
  }
}

/** Advances a pendulum with a fixed-step, deterministic damped-spring solver. */
export const advancePendulum = (options: AdvancePendulumOptions): PendulumState => {
  const deltaTime = Number.isFinite(options.deltaTime) ? Math.max(0, options.deltaTime) : 0
  const accumulator = Number.isFinite(options.state.accumulator)
    ? Math.min(MAX_CATCH_UP_TIME, Math.max(0, options.state.accumulator))
    : 0
  const totalTime = Math.min(MAX_CATCH_UP_TIME, accumulator + deltaTime)
  const stepCount = Math.min(
    MAX_CATCH_UP_STEPS,
    Math.floor((totalTime + TIME_EPSILON) / FIXED_TIME_STEP),
  )
  let state: Omit<PendulumState, 'accumulator'> = {
    position: Number.isFinite(options.state.position) ? options.state.position : 0,
    velocity: Number.isFinite(options.state.velocity) ? options.state.velocity : 0,
  }
  const input = Number.isFinite(options.input) ? options.input : 0
  const targetValue = input * options.pendulum.inputScale
  const target = Number.isFinite(targetValue) ? targetValue : state.position

  for (let step = 0; step < stepCount; step += 1) {
    state = advanceStep(state, target, options.pendulum)
  }

  return {
    ...state,
    accumulator: Math.max(0, totalTime - stepCount * FIXED_TIME_STEP),
  }
}
