import {describe, expect, it} from 'vitest'

import {createQwenProgress} from '../progress'

describe('createQwenProgress', () => {
  it('should calculate byte-weighted overall and individual percentages', () => {
    const progress = createQwenProgress({
      files: {
        'small.json': {loaded: 100, total: 100},
        'weights.onnx_data': {loaded: 100, total: 900},
      },
      loadedBytes: 200,
      totalBytes: 1000,
    })

    expect(progress).toEqual({
      files: [
        {fileName: 'small.json', loadedBytes: 100, percentage: 100, totalBytes: 100},
        {
          fileName: 'weights.onnx_data',
          loadedBytes: 100,
          percentage: 11,
          totalBytes: 900,
        },
      ],
      loadedBytes: 200,
      percentage: 20,
      totalBytes: 1000,
    })
  })

  it('should report zero percent when totals are not available yet', () => {
    expect(
      createQwenProgress({
        files: {'unknown.bin': {loaded: 0, total: 0}},
        loadedBytes: 0,
        totalBytes: 0,
      }),
    ).toEqual({
      files: [{fileName: 'unknown.bin', loadedBytes: 0, percentage: 0, totalBytes: 0}],
      loadedBytes: 0,
      percentage: 0,
      totalBytes: 0,
    })
  })
})
