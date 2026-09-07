import type {JSX} from 'solid-js'
import {pointsToCssPolygon} from './fold'
import type {PictureDiaryTurnView} from './use-page-turn'

interface PictureDiaryTurnProperties extends JSX.CSSProperties {
  '--picture-diary-flap-clip'?: string
  '--picture-diary-flap-transform'?: string
  '--picture-diary-flat-clip'?: string
  '--picture-diary-fold-shadow'?: string
  '--picture-diary-hard-angle'?: string
}

const HALF_TURN_DEGREES = 180
const PERCENT = 100

export const getTurnProperties = (turn: PictureDiaryTurnView): PictureDiaryTurnProperties => {
  const progress = turn.fold?.progress ?? 0
  const coverAngle =
    turn.direction === 'older'
      ? (progress / PERCENT) * HALF_TURN_DEGREES
      : (progress / PERCENT) * -HALF_TURN_DEGREES
  const properties: PictureDiaryTurnProperties = {
    '--picture-diary-hard-angle': `${coverAngle}deg`,
  }

  if (turn.fold === null) {
    return properties
  }

  const horizontalOffset = turn.direction === 'older' ? turn.pageWidth : 0
  const [scaleX, skewY, skewX, scaleY, translateX, translateY] = turn.fold.matrix
  const translatedHorizontal = translateX + horizontalOffset * (1 - scaleX)
  const translatedVertical = translateY - skewY * horizontalOffset

  return {
    ...properties,
    '--picture-diary-flap-clip': pointsToCssPolygon(turn.fold.flap, horizontalOffset),
    '--picture-diary-flap-transform':
      `matrix(${scaleX}, ${skewY}, ${skewX}, ${scaleY}, ` +
      `${translatedHorizontal}, ${translatedVertical})`,
    '--picture-diary-flat-clip': pointsToCssPolygon(turn.fold.flatPage, horizontalOffset),
    '--picture-diary-fold-shadow': `${Math.sin((progress / PERCENT) * Math.PI)}`,
  }
}
