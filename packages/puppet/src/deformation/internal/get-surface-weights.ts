export interface CubicWeights {
  readonly start: number
  readonly end: number
  readonly startTangent: number
  readonly endTangent: number
}

export interface CurveWeights {
  readonly point: CubicWeights
  readonly tangent: CubicWeights
}

export interface SurfaceWeights {
  readonly horizontal: CurveWeights
  readonly vertical: CurveWeights
}

export interface SurfaceWeightsOptions {
  readonly horizontalProgress: number
  readonly verticalProgress: number
  readonly topHasHandle: boolean
  readonly bottomHasHandle: boolean
}

const getCurveWeights = (progress: number): CurveWeights => {
  const squared = progress * progress
  const cubed = squared * progress
  const cubicWeight = 3
  const derivativeWeight = 6
  const tangentWeight = 4
  return {
    point: {
      end: cubicWeight * squared - 2 * cubed,
      endTangent: cubed - squared,
      start: 2 * cubed - cubicWeight * squared + 1,
      startTangent: cubed - 2 * squared + progress,
    },
    tangent: {
      end: derivativeWeight * progress - derivativeWeight * squared,
      endTangent: cubicWeight * squared - 2 * progress,
      start: derivativeWeight * squared - derivativeWeight * progress,
      startTangent: cubicWeight * squared - tangentWeight * progress + 1,
    },
  }
}

const applyTangentFallback = (
  weights: CubicWeights,
  options: SurfaceWeightsOptions,
): CubicWeights => {
  const startFallback = options.topHasHandle ? 0 : weights.startTangent
  const endFallback = options.bottomHasHandle ? 0 : weights.endTangent
  return {
    end: weights.end + startFallback + endFallback,
    endTangent: options.bottomHasHandle ? weights.endTangent : 0,
    start: weights.start - startFallback - endFallback,
    startTangent: options.topHasHandle ? weights.startTangent : 0,
  }
}

export const getSurfaceWeights = (options: SurfaceWeightsOptions): SurfaceWeights => {
  const vertical = getCurveWeights(options.verticalProgress)
  return {
    horizontal: getCurveWeights(options.horizontalProgress),
    vertical: {
      point: applyTangentFallback(vertical.point, options),
      tangent: applyTangentFallback(vertical.tangent, options),
    },
  }
}
