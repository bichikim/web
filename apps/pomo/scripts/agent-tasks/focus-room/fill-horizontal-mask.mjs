const RGBA_CHANNEL_COUNT = 4
const ALPHA_CHANNEL_INDEX = 3
const RED_BRIGHTNESS_WEIGHT = 0.2126
const GREEN_BRIGHTNESS_WEIGHT = 0.7152
const BLUE_BRIGHTNESS_WEIGHT = 0.0722

/**
 * @param {ArrayLike<number>} data RGB를 읽을 원본이다.
 * @param {number} offset 픽셀의 첫 채널 위치다.
 * @returns {number} 고정 RGB 가중치의 밝기다.
 */
const getBrightness = (data, offset) =>
  data[offset] * RED_BRIGHTNESS_WEIGHT +
  data[offset + 1] * GREEN_BRIGHTNESS_WEIGHT +
  data[offset + 2] * BLUE_BRIGHTNESS_WEIGHT

/**
 * @param {object} options 한쪽 방향의 샘플 탐색 입력이다.
 * @param {ArrayLike<number>} options.data 샘플 RGB와 알파를 읽을 원본이다.
 * @param {number} options.direction 왼쪽은 -1, 오른쪽은 1이다.
 * @param {number} options.edgeThreshold 샘플로 허용할 마스크 값의 상한이다.
 * @param {ArrayLike<number>} options.mask 원본과 같은 크기의 단일 채널 마스크다.
 * @param {number} options.sampleRadius 시작점을 포함해 탐색할 최대 픽셀 수다.
 * @param {number} options.startX 구간 바로 바깥의 첫 탐색 열이다.
 * @param {number} options.width 원본 행의 픽셀 수다.
 * @param {number} options.y 탐색할 원본 행이다.
 * @returns {number | undefined} 선택한 픽셀의 첫 채널 위치다. 유효 샘플이 없으면 undefined다.
 */
const findBrightestHorizontalPixel = ({
  data,
  direction,
  edgeThreshold,
  mask,
  sampleRadius,
  startX,
  width,
  y,
}) => {
  let brightestOffset
  let brightestValue = -1

  for (let distance = 0; distance < sampleRadius; distance += 1) {
    const x = startX + distance * direction

    if (x < 0 || x >= width) {
      break
    }

    const pixelIndex = y * width + x
    const offset = pixelIndex * RGBA_CHANNEL_COUNT

    if (mask[pixelIndex] <= edgeThreshold && data[offset + ALPHA_CHANNEL_INDEX] !== 0) {
      const brightness = getBrightness(data, offset)

      if (brightness > brightestValue) {
        brightestOffset = offset
        brightestValue = brightness
      }
    }
  }

  return brightestOffset
}

/**
 * @param {object} options 선택한 RGB를 복사할 가로 구간이다.
 * @param {number} options.endX 마지막으로 채울 열이며 포함한다.
 * @param {Buffer} options.output 이 연산이 생성해 소유하는 출력 버퍼다.
 * @param {number | undefined} options.sampleOffset 원본 샘플의 첫 채널 위치다. undefined면 수정하지 않는다.
 * @param {ArrayLike<number>} options.source 복사할 RGB를 읽는 호출자 소유 원본이다.
 * @param {number} options.startX 처음 채울 열이며 포함한다.
 * @param {number} options.width 출력 행의 픽셀 수다.
 * @param {number} options.y 채울 출력 행이다.
 */
const fillHorizontalRange = ({endX, output, sampleOffset, source, startX, width, y}) => {
  if (sampleOffset === undefined) {
    return
  }

  for (let fillX = startX; fillX <= endX; fillX += 1) {
    const outputOffset = (y * width + fillX) * RGBA_CHANNEL_COUNT

    for (let channel = 0; channel < ALPHA_CHANNEL_INDEX; channel += 1) {
      output[outputOffset + channel] = source[sampleOffset + channel]
    }
  }
}

/**
 * @typedef {object} RasterDimensions
 * @property {number} height 순회할 원본의 행 수다. 0 이상의 정수이며 호출 동안 고정해야 한다.
 * @property {number} width 행의 픽셀 수다. 0 이상의 정수이며 호출 동안 고정해야 한다.
 */

/**
 * @typedef {object} FillHorizontalMaskOptions
 * @property {Readonly<RasterDimensions>} dimensions 두 입력의 공유 크기다. 호출자가 소유하며 기존 메타데이터 접근 순서를 유지한다.
 * @property {number} edgeThreshold 이 값보다 큰 마스크 픽셀을 채운다. 이하인 픽셀만 샘플 후보로 쓴다.
 * @property {number} sampleRadius 각 구간의 바로 바깥부터 한쪽 방향으로 탐색할 픽셀 수다.
 */

/**
 * 마스크의 가로 연속 구간을 양옆의 가장 밝은 유효 픽셀 RGB로 채운 새 RGBA 버퍼를 반환한다.
 * 각 방향에서는 가까운 동률 샘플을 유지하고 양쪽 동률이면 왼쪽을 택한다. 알파와 마스크 밖 색은 유지한다.
 * 두 입력은 크기에 맞는 행 우선 버퍼여야 하며, 호출 중 크기와 픽셀 값을 변경하지 않아야 한다.
 * @param {Readonly<Uint8Array>} source 호출자가 소유하는 RGBA 원본이다. 복사 후 원본에서만 샘플을 읽으며 수정하지 않는다.
 * @param {ArrayLike<number>} mask 호출자가 소유하는 단일 채널 마스크다. 수정하지 않는다.
 * @param {Readonly<FillHorizontalMaskOptions>} options 크기와 호출자에게 속한 탐색 정책이다.
 * @returns {Buffer<ArrayBuffer>} 호출자가 소유할 새 버퍼다. 샘플이 없는 구간은 원본 값을 유지한다.
 */
export const fillHorizontalMask = (source, mask, options) => {
  const {dimensions: info, edgeThreshold, sampleRadius} = options
  const output = Buffer.from(source)

  for (let y = 0; y < info.height; y += 1) {
    let x = 0

    while (x < info.width) {
      if (mask[y * info.width + x] <= edgeThreshold) {
        x += 1
      } else {
        const startX = x

        while (x < info.width && mask[y * info.width + x] > edgeThreshold) {
          x += 1
        }

        const endX = x - 1
        const leftOffset = findBrightestHorizontalPixel({
          data: source,
          direction: -1,
          edgeThreshold,
          mask,
          sampleRadius,
          startX: startX - 1,
          width: info.width,
          y,
        })
        const rightOffset = findBrightestHorizontalPixel({
          data: source,
          direction: 1,
          edgeThreshold,
          mask,
          sampleRadius,
          startX: endX + 1,
          width: info.width,
          y,
        })
        const sampleOffset =
          leftOffset === undefined
            ? rightOffset
            : rightOffset === undefined ||
                getBrightness(source, leftOffset) >= getBrightness(source, rightOffset)
              ? leftOffset
              : rightOffset

        fillHorizontalRange({
          endX,
          output,
          sampleOffset,
          source,
          startX,
          width: info.width,
          y,
        })
      }
    }
  }

  return output
}
