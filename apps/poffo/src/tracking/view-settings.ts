import type {RuntimeView} from './types'
export const isRuntimeView = (value: unknown): value is RuntimeView => {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('fitted' in value) ||
    typeof value.fitted !== 'boolean' ||
    !('camera' in value)
  ) {
    return false
  }
  const {camera} = value
  return (
    typeof camera === 'object' &&
    camera !== null &&
    'x' in camera &&
    typeof camera.x === 'number' &&
    Number.isFinite(camera.x) &&
    'y' in camera &&
    typeof camera.y === 'number' &&
    Number.isFinite(camera.y) &&
    'zoom' in camera &&
    typeof camera.zoom === 'number' &&
    Number.isFinite(camera.zoom) &&
    camera.zoom > 0
  )
}
