import type {PuppetPhysics} from './document'

type Vector = readonly [number, number]

/**
 * Gravity and wind an app sets while the model plays (Cubism's physics options), replacing the
 * document's `physics.gravity` and `physics.wind` for pendulum chains. Omitted values keep the
 * document's.
 */
export interface PuppetPhysicsOptions {
  /** Direction `[x, y]` with `y` down; `[0, 0]` disables gravity. */
  readonly gravity?: Vector
  /** Added to every chain pendulum's pull, `[x, y]` with `y` down. */
  readonly wind?: Vector
}

const isFiniteVector = (vector: Vector | undefined) =>
  vector === undefined || (Number.isFinite(vector[0]) && Number.isFinite(vector[1]))

/** Whether the supplied vectors are finite. */
export const isValidPhysicsOptions = (options: PuppetPhysicsOptions) =>
  isFiniteVector(options.gravity) && isFiniteVector(options.wind)

/** The document's physics with the app's gravity and wind in place of its own. */
export const applyPhysicsOptions = (
  physics: PuppetPhysics | undefined,
  options: PuppetPhysicsOptions | undefined,
): PuppetPhysics | undefined =>
  physics === undefined || options === undefined
    ? physics
    : {
        ...physics,
        ...(options.gravity === undefined ? {} : {gravity: options.gravity}),
        ...(options.wind === undefined ? {} : {wind: options.wind}),
      }
