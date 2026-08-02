import {defaultSpatialNeighborOptions, type SpatialNeighborOptions} from './types'

/** 부분 {@link SpatialNeighborOptions}를 기본값으로 채워 Required로 반환한다. */
export const resolveSpatialNeighborOptions = (
  options?: SpatialNeighborOptions,
): Required<SpatialNeighborOptions> => {
  return {
    angleLimit: options?.angleLimit ?? defaultSpatialNeighborOptions.angleLimit,
    requireOverlap: options?.requireOverlap ?? defaultSpatialNeighborOptions.requireOverlap,
  }
}
