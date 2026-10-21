const RGBA_CHANNEL_COUNT = 4
const RGB_CHANNEL_COUNT = 3
const ALPHA_CHANNEL_INDEX = 3
const MAXIMUM_CHANNEL_VALUE = 255

/**
 * @typedef {object} RgbaImage
 * @property {Uint8Array} data R, G, B, A 순서로 저장한 호출자 소유 픽셀 값이다.
 */

/**
 * @typedef {object} RgbaError
 * @property {number} absoluteError 불투명도로 가중한 색 차이 절댓값의 합이다.
 * @property {number} squaredError 불투명도로 가중한 색 차이 제곱의 합이다.
 * @property {number} comparedValues 알파가 0이 아닌 픽셀에서 비교한 색 채널 수다.
 */

/**
 * 같은 크기의 RGBA 이미지에서 보이는 색 차이를 누적하고, 알파가 다르면 null을 반환한다.
 * @param {Readonly<RgbaImage>} source 비교 기준 픽셀이다. 데이터 getter는 순회 중 반복해서 읽는다.
 * @param {Readonly<RgbaImage>} output 비교 대상 픽셀이다. 숨겨진 색 값은 비교하지 않는다.
 * @returns {Readonly<RgbaError> | null} 색 차이 누적값 또는 알파 불일치다. 입력은 수정하지 않는다.
 */
export const measureRgbaError = (source, output) => {
  let absoluteError = 0
  let squaredError = 0
  let comparedValues = 0

  for (let index = 0; index < source.data.length; index += RGBA_CHANNEL_COUNT) {
    const alpha = source.data[index + ALPHA_CHANNEL_INDEX]

    if (alpha !== output.data[index + ALPHA_CHANNEL_INDEX]) {
      return null
    }

    if (alpha !== 0) {
      const opacity = alpha / MAXIMUM_CHANNEL_VALUE

      for (let channel = 0; channel < RGB_CHANNEL_COUNT; channel += 1) {
        const difference = (source.data[index + channel] - output.data[index + channel]) * opacity
        absoluteError += Math.abs(difference)
        squaredError += difference ** 2
        comparedValues += 1
      }
    }
  }

  return {absoluteError, comparedValues, squaredError}
}
