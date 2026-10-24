// oxlint-disable no-magic-numbers -- The epsilon matches the official APG implementation.

const MIN_CONDITIONED_NORM = 1e-8
const NEGATIVE_PROMPT_CFG_SCALE = 1.5
const NEGATIVE_PROMPT_APG_SCALE = 0

export interface CreateClassifierFreeGuidedVelocityOptions {
  readonly apgScale: number
  readonly cfgScale: number
  readonly latent: Float32Array
  readonly negativeVelocity: Float32Array
  readonly positiveVelocity: Float32Array
  readonly timestep: number
}

type CreateNegativePromptGuidedVelocityOptions = Omit<
  CreateClassifierFreeGuidedVelocityOptions,
  'apgScale' | 'cfgScale'
>

/** Combines positive and negative rectified-flow velocities with adaptive projected guidance. */
export function createClassifierFreeGuidedVelocity(
  options: CreateClassifierFreeGuidedVelocityOptions,
): Float32Array {
  const {apgScale, cfgScale, latent, negativeVelocity, positiveVelocity, timestep} = options
  const positiveDenoised = new Float32Array(latent.length)
  const negativeDenoised = new Float32Array(latent.length)
  let conditionedNormSquared = 0
  let differenceDotConditioned = 0

  for (let index = 0; index < latent.length; index += 1) {
    const positiveValue = latent[index] - timestep * positiveVelocity[index]
    const negativeValue = latent[index] - timestep * negativeVelocity[index]
    const difference = positiveValue - negativeValue
    positiveDenoised[index] = positiveValue
    negativeDenoised[index] = negativeValue
    conditionedNormSquared += positiveValue * positiveValue
    differenceDotConditioned += difference * positiveValue
  }

  const conditionedNorm = Math.max(Math.sqrt(conditionedNormSquared), MIN_CONDITIONED_NORM)
  const parallelScale = differenceDotConditioned / (conditionedNorm * conditionedNorm)
  const guidance = cfgScale - 1
  const guidedVelocity = new Float32Array(latent.length)

  for (let index = 0; index < latent.length; index += 1) {
    const difference = positiveDenoised[index] - negativeDenoised[index]
    const parallelDifference = parallelScale * positiveDenoised[index]
    const orthogonalDifference = difference - parallelDifference
    const guidedDifference =
      apgScale <= 0
        ? difference
        : apgScale >= 1
          ? orthogonalDifference
          : apgScale * orthogonalDifference + (1 - apgScale) * difference
    const guidedDenoised = positiveDenoised[index] + guidance * guidedDifference
    guidedVelocity[index] = (latent[index] - guidedDenoised) / timestep
  }

  return guidedVelocity
}

/** Applies the browser-tuned guidance used for an optional negative prompt. */
export function createNegativePromptGuidedVelocity(
  options: CreateNegativePromptGuidedVelocityOptions,
): Float32Array {
  return createClassifierFreeGuidedVelocity({
    ...options,
    apgScale: NEGATIVE_PROMPT_APG_SCALE,
    cfgScale: NEGATIVE_PROMPT_CFG_SCALE,
  })
}
