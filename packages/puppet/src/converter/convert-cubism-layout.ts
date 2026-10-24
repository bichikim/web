import type {PuppetDocument, PuppetLayout} from '../player/document'
import {jsonNumber, jsonObject} from './json-fields'

/** SDK 모델 행렬의 배치·등방 배율을 같은 종횡비의 Poffo 프레이밍 사각형으로 변환한다. */
export const convertCubismLayout = (
  value: unknown,
  viewport: PuppetDocument['viewport'],
): PuppetLayout => {
  const entries = Object.entries(jsonObject(value)).map(
    ([key, number]) => [key, jsonNumber(number)] as const,
  )
  const aspect = viewport.width / viewport.height
  let scale = 1
  for (const [key, number] of entries) {
    if (key === 'width' || key === 'height') {
      if (number <= 0) {
        throw new Error('Cubism layout size must be positive')
      }
      scale = key === 'width' ? number / (2 * aspect) : number / 2
    }
  }
  let x = 0
  let y = 0
  for (const [key, number] of entries) {
    switch (key) {
      case 'x':
      case 'left':
        x = number
        break
      case 'center_x':
        x = number - aspect * scale
        break
      case 'right':
        x = number - 2 * aspect * scale
        break
      case 'y':
      case 'top':
        y = number
        break
      case 'center_y':
        y = number - scale
        break
      case 'bottom':
        y = number - 2 * scale
        break
      default:
        break
    }
  }
  return {
    height: viewport.height / scale,
    width: viewport.width / scale,
    x: viewport.width / 2 - (viewport.width / 2 + (x * viewport.height) / 2) / scale,
    y: viewport.height / 2 - (viewport.height / 2 - (y * viewport.height) / 2) / scale,
  }
}
