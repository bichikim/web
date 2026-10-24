export interface RoundedPolygonProps {
  bottomLeft: number
  bottomRight: number
  padding: number
  topLeft: number
  topRight: number
}

/**
 * @experimental
 */
export const roundedPolygon = (props: RoundedPolygonProps) => {
  const {bottomLeft = 0, bottomRight = 0, topLeft = 0, topRight = 0, padding = 0} = props

  return `inset(${padding}px round ${topLeft}px ${topRight}px ${bottomRight}px ${bottomLeft}px)`
}
