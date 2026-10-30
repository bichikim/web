/* global Vision, importScripts */
let tracker
globalThis.onmessage = async (event) => {
  const message = event.data
  try {
    if (message.type === 'initialize') {
      if (typeof message.simd !== 'boolean') {
        throw new Error('추적 WASM 설정이 올바르지 않습니다.')
      }
      importScripts('/tracking/vendor/vision_bundle.js')
      const wasm = {
        wasmBinaryPath: message.simd
          ? '/tracking/vendor/vision_wasm_internal.wasm'
          : '/tracking/vendor/vision_wasm_nosimd_internal.wasm',
        wasmLoaderPath: message.simd
          ? '/tracking/vendor/vision_wasm_internal.js'
          : '/tracking/vendor/vision_wasm_nosimd_internal.js',
      }
      tracker = await Vision.FaceLandmarker.createFromOptions(wasm, {
        baseOptions: {delegate: 'CPU', modelAssetPath: '/tracking/face.task'},
        numFaces: 1,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: 'VIDEO',
      })
      globalThis.postMessage({type: 'ready'})
    } else if (message.type === 'frame') {
      try {
        const result = tracker.detectForVideo(message.image, message.timestamp)
        const categories = result.faceBlendshapes[0]?.categories
        const matrix = result.facialTransformationMatrixes[0]?.data
        const HALF_CIRCLE_DEGREES = 180
        const degrees = HALF_CIRCLE_DEGREES / Math.PI
        const score = (name) =>
          categories?.find((category) => category.categoryName === name)?.score ?? 0
        const mouthRound = Math.max(score('mouthPucker'), score('mouthFunnel'))
        const mouthSpread = (score('mouthStretchLeft') + score('mouthStretchRight')) / 2
        globalThis.postMessage({
          frame: {
            timestamp: message.timestamp,
            values:
              categories === undefined
                ? null
                : {
                    browLeft: score('browOuterUpLeft') - score('browDownLeft'),
                    browRight: score('browOuterUpRight') - score('browDownRight'),
                    eyeBlinkLeft: score('eyeBlinkLeft'),
                    eyeBlinkRight: score('eyeBlinkRight'),
                    facePitch:
                      matrix === undefined
                        ? 0
                        : Math.atan2(-matrix[9], Math.hypot(matrix[8], matrix[10])) * degrees,
                    faceRoll: matrix === undefined ? 0 : Math.atan2(matrix[1], matrix[5]) * degrees,
                    faceYaw: matrix === undefined ? 0 : Math.atan2(matrix[8], matrix[10]) * degrees,
                    mouthOpen: score('jawOpen'),
                    mouthRound,
                    mouthSmile: (score('mouthSmileLeft') + score('mouthSmileRight')) / 2,
                    mouthSpread: mouthSpread * (1 - mouthRound),
                  },
          },
          type: 'frame',
        })
      } finally {
        message.image.close()
      }
    }
  } catch (error) {
    globalThis.postMessage({
      message: error instanceof Error ? error.message : '추적을 처리하지 못했습니다.',
      type: 'error',
    })
  }
}
