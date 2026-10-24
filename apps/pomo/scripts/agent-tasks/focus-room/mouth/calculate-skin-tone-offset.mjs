const RGBA_CHANNEL_COUNT = 4
const RGB_CHANNEL_COUNT = 3
const ALPHA_CHANNEL_INDEX = 3

/**
 * @typedef {object} SampleBounds
 * @property {number} bottom 제외되는 아래쪽 행 경계.
 * @property {number} left 포함되는 왼쪽 열 경계.
 * @property {number} right 제외되는 오른쪽 열 경계.
 * @property {number} top 포함되는 위쪽 행 경계.
 */

/**
 * @typedef {object} CalculateSkinToneOffsetOptions
 * @property {ArrayLike<number>} generated 원본과 크기·좌표가 같은 디코딩된 RGBA 바이트. 변경하지 않는다.
 * @property {SampleBounds} mouthExclusion 표본에서 제외할 입 영역. 경계는 패치 좌표다.
 * @property {number} opaqueAlphaThreshold 두 이미지 모두 충족해야 하는 알파 하한.
 * @property {ArrayLike<number>} original 기준 이미지의 디코딩된 RGBA 바이트. 변경하지 않는다.
 * @property {{width: number}} patch 두 버퍼의 행 너비. 표본 좌표는 버퍼 범위 안이어야 한다.
 * @property {SampleBounds} sampleBounds 평균을 구할 패치 영역.
 */

/**
 * 함께 불투명한 피부 표본의 원본−생성 RGB 차이 평균을 새 배열로 반환한다.
 * 표본이 없으면 Error를 던진다. 버퍼·영역의 유효성 검사는 호출자가 소유한다.
 * @param {CalculateSkinToneOffsetOptions} options 디코딩된 표본과 호출자가 정한 보정 영역.
 * @returns {number[]} RGB 순서의 부호 있는 평균 차이.
 */
export const calculateSkinToneOffset = ({
  generated,
  mouthExclusion,
  opaqueAlphaThreshold,
  original,
  patch,
  sampleBounds,
}) => {
  const channelOffsets = [0, 0, 0]
  let sampleCount = 0
  for (let y = sampleBounds.top; y < sampleBounds.bottom; y += 1) {
    for (let x = sampleBounds.left; x < sampleBounds.right; x += 1) {
      const isMouth =
        x >= mouthExclusion.left &&
        x < mouthExclusion.right &&
        y >= mouthExclusion.top &&
        y < mouthExclusion.bottom
      const pixelOffset = (y * patch.width + x) * RGBA_CHANNEL_COUNT
      const isOpaqueSkin =
        !isMouth &&
        original[pixelOffset + ALPHA_CHANNEL_INDEX] >= opaqueAlphaThreshold &&
        generated[pixelOffset + ALPHA_CHANNEL_INDEX] >= opaqueAlphaThreshold
      if (isOpaqueSkin) {
        for (let channel = 0; channel < RGB_CHANNEL_COUNT; channel += 1) {
          channelOffsets[channel] +=
            original[pixelOffset + channel] - generated[pixelOffset + channel]
        }
        sampleCount += 1
      }
    }
  }
  if (sampleCount === 0) {
    throw new Error('Could not find opaque skin pixels for mouth color matching.')
  }
  return channelOffsets.map((offset) => offset / sampleCount)
}
