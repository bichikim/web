/** Physics: single damped pendulums and Cubism-style pendulum chains. */

export interface PuppetPendulum {
  /** Velocity damping coefficient per second. */
  readonly damping: number
  /** Downward acceleration used by the pendulum solver. */
  readonly gravity: number
  readonly id: string
  readonly inputParameterId: string
  /** Converts input parameter units into the pendulum's target position. */
  readonly inputScale: number
  /** Pendulum length in solver units. */
  readonly length: number
  readonly outputParameterId: string
  /** Lag outputs the difference between the simulated and current target positions. */
  readonly outputMode?: 'position' | 'lag'
  /** Converts pendulum position into output parameter units. */
  readonly outputScale: number
}

export const PUPPET_PHYSICS_AXES = ['x', 'y', 'angle'] as const

/** Horizontal or vertical position, or tilt, of a chain's root or one of its pendulums. */
export type PuppetPhysicsAxis = (typeof PUPPET_PHYSICS_AXES)[number]

/** Simulation steps per second. */
export const DEFAULT_PUPPET_CHAIN_FPS = 60
/** Straight down (`y` points down). */
export const DEFAULT_PUPPET_CHAIN_GRAVITY = [0, 1] as const

/**
 * Maps a parameter's offset from its default onto `minimum..maximum` around `center`, each side
 * scaled separately (Cubism's normalization).
 * The center may lie outside the endpoints, as permitted by Cubism runtime data.
 */
export interface PuppetPhysicsRange {
  readonly center: number
  readonly maximum: number
  readonly minimum: number
}

/**
 * A parameter moving or tilting the chain's root. Inputs of one axis add up. As in Cubism,
 * a normalized value moves the root toward `-x` (and tilts it the matching way) unless
 * `reflect` is set; tilt turns gravity the opposite way, so the chain swings after it.
 */
export interface PuppetPhysicsInput {
  readonly axis: PuppetPhysicsAxis
  readonly parameterId: string
  /** Keeps the normalized value's sign instead of negating it. */
  readonly reflect?: boolean
  /** Share of the normalized value, 0..1. */
  readonly weight: number
}

/** One pendulum of a chain, hanging from the previous one (the first from the root). */
export interface PuppetChainPendulum {
  /** Gravity's pull (Cubism's acceleration). */
  readonly acceleration: number
  /** Distance from the point it hangs from, in normalized position units (Cubism's radius). */
  readonly length: number
  /** Share of velocity kept per step, 0..1: larger swings more and longer (Cubism's mobility). */
  readonly mobility: number
  /** Time scale per 1/30 s: larger reacts faster (Cubism's delay). */
  readonly reaction: number
}

/** A parameter driven by one pendulum, relative to the pendulum it hangs from. */
export interface PuppetPhysicsOutput {
  /**
   * `angle` in radians from the parent pendulum's direction (gravity for the first pendulum);
   * `x`/`y` as the offset from the parent pendulum in position units.
   */
  readonly axis: PuppetPhysicsAxis
  readonly parameterId: string
  readonly pendulumIndex: number
  /** Negates the reading. */
  readonly reflect?: boolean
  /** Converts the reading into the parameter value (not offset from the default). */
  readonly scale: number
  /** Share of the result over the incoming value, 0..1; 1 overwrites it. */
  readonly weight: number
}

/**
 * A chain of pendulums (Cubism's physics setting): inputs move and tilt its root, gravity and
 * wind pull the pendulums, and outputs read their angles or offsets. Behaves like Cubism's
 * physics, with its defects fixed (see the package README).
 */
export interface PuppetPhysicsChain {
  readonly id: string
  readonly inputs: ReadonlyArray<PuppetPhysicsInput>
  /** Normalization of `x`/`y` inputs (chain units) and `angle` inputs (degrees). */
  readonly normalization: {
    readonly angle: PuppetPhysicsRange
    readonly position: PuppetPhysicsRange
  }
  readonly outputs: ReadonlyArray<PuppetPhysicsOutput>
  readonly pendulums: ReadonlyArray<PuppetChainPendulum>
}

export interface PuppetPhysics {
  readonly chains?: ReadonlyArray<PuppetPhysicsChain>
  /** 체인의 초당 고정 계산 횟수. 0이면 현재 프레임의 경과 시간을 사용한다. */
  readonly fps?: number
  /** Gravity direction for chains, `[x, y]` with `y` down; its length is ignored. */
  readonly gravity?: readonly [number, number]
  readonly pendulums: ReadonlyArray<PuppetPendulum>
  /** Wind added to every pendulum's pull, `[x, y]` with `y` down. */
  readonly wind?: readonly [number, number]
}
