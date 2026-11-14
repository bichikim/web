import type {RuntimeView} from '../tracking/types'
/** Compares persisted camera values without relying on profile object identity. */
export const isRuntimeViewEqual = (previous: RuntimeView | undefined, next: RuntimeView) =>
  previous !== undefined &&
  previous.fitted === next.fitted &&
  previous.camera.x === next.camera.x &&
  previous.camera.y === next.camera.y &&
  previous.camera.zoom === next.camera.zoom
