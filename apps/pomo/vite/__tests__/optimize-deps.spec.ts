import {expect, it} from 'vitest'

import {getOptimizeDepsInclude} from '../optimize-deps'

it('should prebundle every browser-loaded ONNX Runtime entry point', () => {
  expect(getOptimizeDepsInclude()).toEqual(
    expect.arrayContaining(['onnxruntime-web/wasm', 'onnxruntime-web/webgpu']),
  )
})
